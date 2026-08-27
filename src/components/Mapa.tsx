"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapaGL } from "maplibre-gl";
import type { LinhaMunicipio } from "@/lib/consultas";
import { RAMPA_NEUTRA, rampa } from "@/lib/paleta";

type Props = {
  malha: GeoJSON.FeatureCollection;
  linhas: LinhaMunicipio[];
  /** Métrica pintada no mapa. */
  metrica: "valor" | "equipe" | "cobertura";
  corBase: string | null;
  aoSelecionar: (codIbge: number | null) => void;
  selecionado: number | null;
};

/** Limites da Bahia, com folga. */
const ENQUADRAMENTO: [number, number, number, number] = [-46.7, -18.5, -37.2, -8.4];

export default function Mapa({
  malha,
  linhas,
  metrica,
  corBase,
  aoSelecionar,
  selecionado,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGL | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  // Guarda os dados correntes para os handlers, que só são registrados uma vez.
  const dados = useRef({ linhas, metrica });
  dados.current = { linhas, metrica };

  // ── Inicialização (uma vez) ──────────────────────────────────────────
  useEffect(() => {
    if (!container.current || mapa.current) return;

    const m = new maplibregl.Map({
      container: container.current,
      // Sem basemap externo: nenhuma chamada de rede, nenhuma chave de API,
      // e o contorno municipal já dá toda a referência geográfica necessária.
      style: { version: 8, sources: {}, layers: [] },
      bounds: ENQUADRAMENTO,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
      dragRotate: false,
      touchZoomRotate: false,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(
      new maplibregl.AttributionControl({
        customAttribution: "Malha municipal: IBGE · Dados: base interna SIV",
      }),
      "bottom-right",
    );

    m.on("load", () => {
      // promoteId liga o código IBGE ao feature-state; sem isso setFeatureState
      // não encontra a feição e o mapa nunca pinta.
      m.addSource("municipios", {
        type: "geojson",
        data: malha,
        promoteId: "cod_ibge",
      });

      m.addLayer({
        id: "preenchimento",
        type: "fill",
        source: "municipios",
        paint: {
          "fill-color": ["coalesce", ["feature-state", "cor"], "#eef1f6"],
          "fill-opacity": 1,
        },
      });
      // Contorno fino e recessivo: separa os polígonos sem competir com o dado.
      m.addLayer({
        id: "contorno",
        type: "line",
        source: "municipios",
        paint: { "line-color": "#ffffff", "line-width": 0.5 },
      });
      m.addLayer({
        id: "destaque",
        type: "line",
        source: "municipios",
        paint: {
          "line-color": "#0f2545",
          "line-width": ["case", ["boolean", ["feature-state", "ativo"], false], 2.5, 0],
        },
      });

      m.on("mousemove", "preenchimento", (evento) => {
        const feicao = evento.features?.[0];
        if (!feicao) return;
        m.getCanvas().style.cursor = "pointer";
        const cod = feicao.properties?.cod_ibge as number;
        const linha = dados.current.linhas.find((l) => l.codIbge === cod);
        const nome = feicao.properties?.nome as string;

        popup.current?.remove();
        popup.current = new maplibregl.Popup({
          closeButton: false,
          offset: 8,
          className: "siv-popup",
        })
          .setLngLat(evento.lngLat)
          .setHTML(conteudoPopup(nome, linha))
          .addTo(m);
      });

      m.on("mouseleave", "preenchimento", () => {
        m.getCanvas().style.cursor = "";
        popup.current?.remove();
        popup.current = null;
      });

      m.on("click", "preenchimento", (evento) => {
        const cod = evento.features?.[0]?.properties?.cod_ibge as number | undefined;
        aoSelecionar(cod ?? null);
      });
    });

    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
    };
  }, [malha, aoSelecionar]);

  // ── Repintura ao mudar filtro ────────────────────────────────────────
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;

    const pintar = () => {
      if (!m.getSource("municipios")) return;
      const escala = corBase ? rampa(corBase) : RAMPA_NEUTRA;
      const valores = linhas.map((l) => valorDe(l, metrica)).filter((v) => v > 0);
      const maximo = valores.length ? Math.max(...valores) : 0;

      const porCodigo = new Map(
        linhas.filter((l) => l.codIbge !== null).map((l) => [l.codIbge as number, l]),
      );

      for (const feicao of malha.features) {
        const cod = feicao.properties?.cod_ibge as number;
        const linha = porCodigo.get(cod);
        const valor = linha ? valorDe(linha, metrica) : 0;
        m.setFeatureState(
          { source: "municipios", id: cod },
          { cor: corPara(valor, maximo, escala), ativo: cod === selecionado },
        );
      }
    };

    if (m.isStyleLoaded()) pintar();
    else m.once("idle", pintar);
  }, [linhas, metrica, corBase, selecionado, malha]);

  return <div ref={container} className="h-full w-full rounded-xl" />;
}

function valorDe(linha: LinhaMunicipio, metrica: Props["metrica"]): number {
  if (metrica === "equipe") return linha.equipe;
  if (metrica === "cobertura") return linha.cobertura;
  return linha.valor;
}

/** 5 passos de rampa sequencial; município sem dado fica no cinza de fundo. */
function corPara(valor: number, maximo: number, escala: string[]): string {
  if (valor <= 0 || maximo <= 0) return "#eef1f6";
  const posicao = valor / maximo;
  const indice = Math.min(escala.length - 1, Math.floor(posicao * escala.length));
  return escala[Math.max(0, indice)];
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

function conteudoPopup(nome: string, linha?: LinhaMunicipio): string {
  const titulo = `<div style="font-weight:600;font-size:13px;color:#0f1726">${escapar(nome)}</div>`;
  if (!linha) {
    return `<div style="padding:2px 4px">${titulo}
      <div style="font-size:12px;color:#838fa1;margin-top:2px">Sem equipe mapeada</div></div>`;
  }
  const linhaInfo = (rotulo: string, valor: string) =>
    `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;margin-top:2px">
       <span style="color:#5c6b85">${rotulo}</span>
       <strong style="color:#0f1726;font-variant-numeric:tabular-nums">${valor}</strong></div>`;

  const detalhe = linha.suprimido
    ? `<div style="font-size:11px;color:#838fa1;margin-top:6px;border-top:1px solid #e2e7ee;padding-top:5px">
         Distribuição omitida: menos respostas que o limiar de anonimato.</div>`
    : linha.detalhe.length
      ? `<div style="margin-top:6px;border-top:1px solid #e2e7ee;padding-top:5px">` +
        linha.detalhe
          .map((d) => linhaInfo(escapar(d.candidato), String(d.qtd)))
          .join("") +
        `</div>`
      : "";

  return `<div style="padding:2px 4px;min-width:190px">${titulo}
    ${linhaInfo("Equipe mapeada", String(linha.equipe))}
    ${linhaInfo("Respostas", String(linha.respostas))}
    ${detalhe}</div>`;
}
