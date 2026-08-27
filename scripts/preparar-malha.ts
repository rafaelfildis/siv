/**
 * Prepara a malha municipal da Bahia para consumo no mapa.
 *
 * Fonte: geodata-br (derivado da malha oficial do IBGE). Quando o egresso
 * para servicodados.ibge.gov.br for liberado, trocar a URL pela API oficial
 * de malhas — o restante do pipeline não muda. Ver DECISOES.md §2.
 *
 * Simplifica as geometrias com Douglas-Peucker preservando o encadeamento dos
 * anéis, porque 1,4 MB de GeoJSON bruto para 417 polígonos trava o first paint
 * em conexão de campo.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const DESTINO = path.join(RAIZ, "src", "dados", "malha-ba.json");
const URL_MALHA =
  "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-29-mun.json";

/** Tolerância em graus. ~0.002° ≈ 200 m: invisível no zoom estadual. */
const TOLERANCIA = 0.002;

type Anel = [number, number][];

function distanciaPerpendicular(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + tc * dx), y - (y1 + tc * dy));
}

function douglasPeucker(pontos: Anel, tolerancia: number): Anel {
  if (pontos.length <= 2) return pontos;
  let maiorDist = 0;
  let indice = 0;
  for (let i = 1; i < pontos.length - 1; i++) {
    const d = distanciaPerpendicular(pontos[i], pontos[0], pontos[pontos.length - 1]);
    if (d > maiorDist) {
      maiorDist = d;
      indice = i;
    }
  }
  if (maiorDist <= tolerancia) return [pontos[0], pontos[pontos.length - 1]];
  return [
    ...douglasPeucker(pontos.slice(0, indice + 1), tolerancia).slice(0, -1),
    ...douglasPeucker(pontos.slice(indice), tolerancia),
  ];
}

/** Simplifica mantendo o anel fechado e com no mínimo 4 vértices. */
function simplificarAnel(anel: Anel): Anel {
  if (anel.length <= 5) return anel;
  const simplificado = douglasPeucker(anel, TOLERANCIA);
  if (simplificado.length < 4) return anel;
  const primeiro = simplificado[0];
  const ultimo = simplificado[simplificado.length - 1];
  if (primeiro[0] !== ultimo[0] || primeiro[1] !== ultimo[1]) {
    simplificado.push([primeiro[0], primeiro[1]]);
  }
  return simplificado;
}

function arredondar(anel: Anel): Anel {
  // 5 casas ≈ 1 m. Além disso é ruído que só engorda o payload.
  return anel.map(([x, y]) => [
    Math.round(x * 1e5) / 1e5,
    Math.round(y * 1e5) / 1e5,
  ]) as Anel;
}

async function obterOrigem(): Promise<string> {
  const cache = path.join(RAIZ, "data", "geojs-29-mun.json");
  if (existsSync(cache)) {
    console.log(`  malha em cache: ${cache}`);
    return readFile(cache, "utf8");
  }
  console.log(`  baixando ${URL_MALHA}`);
  const resposta = await fetch(URL_MALHA);
  if (!resposta.ok) {
    throw new Error(`falha ao baixar a malha: HTTP ${resposta.status}`);
  }
  const texto = await resposta.text();
  await mkdir(path.dirname(cache), { recursive: true });
  await writeFile(cache, texto);
  return texto;
}

async function principal() {
  console.log("Preparando malha municipal da Bahia");
  const bruto = await obterOrigem();
  const origem = JSON.parse(bruto);

  const features = origem.features.map((f: any) => {
    const geom = f.geometry;
    const simplificar = (poligono: Anel[]) =>
      poligono.map((anel) => arredondar(simplificarAnel(anel)));

    const coordinates =
      geom.type === "Polygon"
        ? simplificar(geom.coordinates)
        : geom.coordinates.map(simplificar);

    return {
      type: "Feature",
      properties: {
        // Código IBGE de 7 dígitos: a chave canônica do sistema.
        cod_ibge: Number(f.properties.id),
        nome: f.properties.name,
      },
      geometry: { type: geom.type, coordinates },
    };
  });

  const saida = { type: "FeatureCollection", features };
  const json = JSON.stringify(saida);
  await mkdir(path.dirname(DESTINO), { recursive: true });
  await writeFile(DESTINO, json);

  const antes = Buffer.byteLength(bruto);
  const depois = Buffer.byteLength(json);
  console.log(`  municípios: ${features.length}`);
  console.log(
    `  ${(antes / 1024).toFixed(0)} kB -> ${(depois / 1024).toFixed(0)} kB ` +
      `(-${(100 - (depois / antes) * 100).toFixed(0)}%)`,
  );
  console.log(`  sha256: ${createHash("sha256").update(json).digest("hex").slice(0, 16)}`);
  console.log(`  gravado em ${path.relative(RAIZ, DESTINO)}`);
}

principal().catch((erro) => {
  console.error("ERRO:", erro.message);
  process.exit(1);
});
