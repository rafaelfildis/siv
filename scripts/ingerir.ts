/**
 * Ingestão da base SIV (planilha MAPEAMENTO.xlsx).
 *
 * Propriedades garantidas:
 *  - IDEMPOTENTE: a chave é o sha256 do arquivo de origem. Reingerir o mesmo
 *    arquivo não altera o dataset nem duplica o registro de importação.
 *  - VALIDADA: cada linha passa por schema Zod; linha inválida é rejeitada e
 *    contada, nunca ignorada em silêncio.
 *  - ANÔNIMA POR CONSTRUÇÃO: o nome do profissional é lido para contar e
 *    descartado. Nenhum identificador individual chega ao disco.
 *
 * Uso:
 *   pnpm ingerir -- --arquivo=./data/MAPEAMENTO.xlsx
 *   pnpm ingerir -- --url=https://docs.google.com/.../export?format=xlsx
 *   pnpm ingerir -- --arquivo=... --limiar=5   (limiar de supressão)
 *   pnpm ingerir -- --arquivo=... --forcar     (reprocessa mesmo sha256)
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

import { agregar, LIMIAR_SUPRESSAO_PADRAO } from "../src/lib/agregacao";
import { construirIndice, limparCelula } from "../src/lib/normalizacao";
import { LinhaBruta, type RegistroImportacao } from "../src/lib/tipos";

const RAIZ = path.resolve(import.meta.dirname, "..");
const DIR_DADOS = path.join(RAIZ, "src", "dados");
const CAMINHO_DATASET = path.join(DIR_DADOS, "dataset.json");
const CAMINHO_LOG = path.join(DIR_DADOS, "importacoes.json");
const CAMINHO_MALHA = path.join(DIR_DADOS, "malha-ba.json");

/** A aba de dados e onde os dados de fato começam. */
const ABA = "Mapeamento";
const LINHA_CABECALHO = 4;
const PRIMEIRA_LINHA = 5;

/**
 * A planilha termina com linhas-âncora que existem só para manter todas as
 * opções visíveis nos filtros das colunas E e F. Elas carregam votos falsos
 * ("Candidata Fabíola Mansur", "Candidato Jorge Solla", ...) e inflariam a
 * apuração em 3 votos se entrassem. Reconhecê-las é obrigatório, não opcional.
 */
const MARCADOR_ANCORA = /LINHA DE REFER[EÊ]NCIA DO FILTRO/i;

/** Colunas esperadas, na ordem. Divergência aborta a importação. */
const CABECALHO_ESPERADO = [
  "Nº",
  "Nome do Profissional",
  "Núcleo / Time",
  "Município",
  "INTENÇÃO DE VOTO ESTADUAL",
  "INTENÇÃO DE VOTO FEDERAL",
  "Observações",
];

function argumento(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}
const temFlag = (nome: string) => process.argv.includes(`--${nome}`);

async function obterArquivo(): Promise<{ buffer: Buffer; fonte: string }> {
  const url = argumento("url");
  if (url) {
    const resposta = await fetch(url);
    if (!resposta.ok) {
      throw new Error(`falha ao baixar a planilha: HTTP ${resposta.status}`);
    }
    return {
      buffer: Buffer.from(await resposta.arrayBuffer()),
      fonte: url,
    };
  }
  const arquivo = argumento("arquivo") ?? path.join(RAIZ, "data", "MAPEAMENTO.xlsx");
  if (!existsSync(arquivo)) {
    throw new Error(
      `planilha não encontrada em ${arquivo}. ` +
        `Informe --arquivo=<caminho> ou --url=<link de exportação xlsx>.`,
    );
  }
  return { buffer: await readFile(arquivo), fonte: path.basename(arquivo) };
}

/** Extrai as linhas da aba, validando o cabeçalho antes. */
export async function lerPlanilha(buffer: Buffer): Promise<{
  linhas: LinhaBruta[];
  lidas: number;
  ancoras: number;
  rejeitadas: number;
  avisos: string[];
}> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet(ABA);
  if (!ws) {
    throw new Error(
      `aba "${ABA}" não encontrada. Abas presentes: ${wb.worksheets
        .map((w) => w.name)
        .join(", ")}`,
    );
  }

  const cabecalho = CABECALHO_ESPERADO.map((_, i) =>
    limparCelula(ws.getRow(LINHA_CABECALHO).getCell(i + 1).value),
  );
  for (const [i, esperado] of CABECALHO_ESPERADO.entries()) {
    if (cabecalho[i] !== esperado) {
      throw new Error(
        `cabeçalho divergente na coluna ${i + 1}: ` +
          `esperado "${esperado}", encontrado "${cabecalho[i]}". ` +
          `A planilha mudou de formato — revise o mapeamento antes de reingerir.`,
      );
    }
  }

  const linhas: LinhaBruta[] = [];
  const avisos: string[] = [];
  let lidas = 0;
  let ancoras = 0;
  let rejeitadas = 0;

  for (let n = PRIMEIRA_LINHA; n <= ws.rowCount; n++) {
    const linha = ws.getRow(n);
    const celulas = Array.from({ length: 7 }, (_, i) =>
      limparCelula(linha.getCell(i + 1).value),
    );
    // Linha totalmente vazia é fim de tabela, não erro.
    if (celulas.every((c) => c === null)) continue;
    lidas++;

    // Descarta a linha-âncora ANTES de validar, para que ela não seja contada
    // como erro de qualidade nem, pior, como voto.
    if (celulas[1] && MARCADOR_ANCORA.test(celulas[1])) {
      ancoras++;
      continue;
    }

    const analise = LinhaBruta.safeParse({
      numero: Number(celulas[0]),
      nome: celulas[1],
      nucleo: celulas[2],
      municipio: celulas[3],
      intencaoEstadual: celulas[4],
      intencaoFederal: celulas[5],
    });

    if (!analise.success) {
      rejeitadas++;
      const campos = analise.error.issues.map((i) => i.path.join(".")).join(", ");
      // O nome não entra no aviso: a mensagem de erro também é um vazamento.
      avisos.push(`Linha ${n} rejeitada (campos inválidos: ${campos}).`);
      continue;
    }
    linhas.push(analise.data);
  }

  if (ancoras > 0) {
    avisos.push(
      `${ancoras} linha(s)-âncora de filtro descartada(s): não são profissionais ` +
        `e seus votos de exemplo não entram na apuração.`,
    );
  }

  return { linhas, lidas, ancoras, rejeitadas, avisos };
}

async function lerLog(): Promise<RegistroImportacao[]> {
  if (!existsSync(CAMINHO_LOG)) return [];
  return JSON.parse(await readFile(CAMINHO_LOG, "utf8"));
}

async function principal() {
  const iniciadoEm = new Date().toISOString();
  const limiar = Number(argumento("limiar") ?? LIMIAR_SUPRESSAO_PADRAO);
  console.log("Ingestão da base SIV");

  const { buffer, fonte } = await obterArquivo();
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  console.log(`  fonte:  ${fonte}`);
  console.log(`  sha256: ${sha256.slice(0, 16)}…`);

  const log = await lerLog();
  const jaImportado = log.find((r) => r.sha256 === sha256 && r.status === "sucesso");
  if (jaImportado && existsSync(CAMINHO_DATASET) && !temFlag("forcar")) {
    console.log(
      `  já importado em ${jaImportado.concluidoEm} — nada a fazer (use --forcar para reprocessar).`,
    );
    return;
  }

  if (!existsSync(CAMINHO_MALHA)) {
    throw new Error(`malha ausente. Rode "pnpm malha" antes da ingestão.`);
  }
  const malha = JSON.parse(await readFile(CAMINHO_MALHA, "utf8"));
  const indice = construirIndice(
    malha.features.map((f: any) => ({
      properties: { id: String(f.properties.cod_ibge), name: f.properties.nome },
    })),
  );

  const { linhas, lidas, ancoras, rejeitadas, avisos: avisosLeitura } =
    await lerPlanilha(buffer);
  const { dataset, avisos: avisosAgregacao } = agregar(linhas, indice, {
    limiar,
    fonte,
    sha256,
    geradoEm: new Date().toISOString(),
  });

  await mkdir(DIR_DADOS, { recursive: true });
  await writeFile(CAMINHO_DATASET, JSON.stringify(dataset, null, 2));

  const avisos = [...avisosLeitura, ...avisosAgregacao];
  const registro: RegistroImportacao = {
    id: randomUUID(),
    fonte,
    sha256,
    iniciadoEm,
    concluidoEm: new Date().toISOString(),
    status: "sucesso",
    linhasLidas: lidas,
    linhasValidas: linhas.length,
    linhasRejeitadas: rejeitadas,
    linhasAncora: ancoras,
    avisos,
  };
  // Substitui o registro do mesmo sha256 em vez de empilhar duplicatas.
  const novoLog = [...log.filter((r) => r.sha256 !== sha256), registro];
  await writeFile(CAMINHO_LOG, JSON.stringify(novoLog, null, 2));

  console.log(
    `  linhas: ${lidas} lidas / ${linhas.length} válidas / ` +
      `${ancoras} âncora / ${rejeitadas} rejeitadas`,
  );
  console.log(`  municípios no mapa: ${dataset.municipios.filter((m) => !m.foraDaMalha).length}`);
  console.log(
    `  cobertura: estadual ${(dataset.totais.cobertura.estadual * 100).toFixed(1)}% · ` +
      `federal ${(dataset.totais.cobertura.federal * 100).toFixed(1)}%`,
  );
  console.log(`  supressão: municípios com < ${limiar} respostas têm a distribuição omitida`);
  for (const aviso of avisos) console.log(`  AVISO: ${aviso}`);
  console.log(`  gravado em ${path.relative(RAIZ, CAMINHO_DATASET)}`);
}

if (import.meta.filename === process.argv[1]) {
  principal().catch((erro) => {
    console.error("ERRO:", erro.message);
    process.exit(1);
  });
}
