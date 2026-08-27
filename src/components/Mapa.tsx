"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
// Importado pelo efeito colateral: é o que instala .transition() nas seleções.
import "d3-transition";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { CAMADAS, ORDEM_CAMADAS, type ChaveCamada } from "@/lib/camadas";
import { TOTAL_MUNICIPIOS_BA, type Modelo } from "@/lib/consultas";
import type { FeicaoMunicipio, MalhaBahia } from "@/lib/malha";

const W = 980;
const H = 560;

type Props = {
  malha: MalhaBahia;
  modelo: Modelo;
  camada: ChaveCamada;
  aoTrocarCamada: (c: ChaveCamada) => void;
  selecionado: number | null;
  aoSelecionar: (cod: number | null) => void;
  /** Município para o qual o mapa deve dar zoom; muda a cada pedido externo. */
  alvoZoom: { codIbge: number; token: number } | null;
};

export default function Mapa({
  malha,
  modelo,
  camada,
  aoTrocarCamada,
  selecionado,
  aoSelecionar,
  alvoZoom,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dica, setDica] = useState<{
    x: number;
    y: number;
    feicao: FeicaoMunicipio;
  } | null>(null);

  // A projeção depende só da malha; recalculá-la a cada repintura jogaria
  // fora 417 geometrias por troca de camada.
  const { caminhos, indice } = useMemo(() => {
    const proj = geoMercator().fitExtent(
      [
        [24, 16],
        [W - 24, H - 16],
      ],
      malha,
    );
    const gerar = geoPath(proj);
    const caminhos = malha.features.map((f) => ({
      cod: f.properties.cod_ibge,
      nome: f.properties.nome,
      d: gerar(f) ?? "",
      centro: gerar.centroid(f),
      limites: gerar.bounds(f),
      feicao: f as FeicaoMunicipio,
    }));
    return { caminhos, indice: new Map(caminhos.map((c) => [c.cod, c])) };
  }, [malha]);

  /* ── zoom ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 14])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .on("zoom", (ev) => g.attr("transform", ev.transform.toString()));
    svg.call(z);
    zoomRef.current = z;
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const escalar = useCallback((fator: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, fator);
  }, []);

  const reenquadrar = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(450)
      .call(zoomRef.current.transform, zoomIdentity);
  }, []);

  useEffect(() => {
    if (!alvoZoom || !svgRef.current || !zoomRef.current) return;
    const alvo = indice.get(alvoZoom.codIbge);
    if (!alvo) return;
    const [[x0, y0], [x1, y1]] = alvo.limites;
    const maiorLado = Math.max((x1 - x0) / W, (y1 - y0) / H);
    const escala = Math.min(14, Math.max(2.4, 0.55 / (maiorLado || 0.01)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    select(svgRef.current)
      .transition()
      .duration(650)
      .call(
        zoomRef.current.transform,
        zoomIdentity.translate(W / 2, H / 2).scale(escala).translate(-cx, -cy),
      );
  }, [alvoZoom, indice]);

  const conf = CAMADAS[camada];

  return (
    <section className="card flex h-full flex-col">
      <div className="card-head">
        <h2>Bahia · {TOTAL_MUNICIPIOS_BA} municípios</h2>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Visualizar por">
          {ORDEM_CAMADAS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={camada === k}
              onClick={() => aoTrocarCamada(k)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                camada === k
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-surface-2 text-text-2 hover:bg-surface-3"
              }`}
            >
              {CAMADAS[k].rotulo}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        style={{ minHeight: "clamp(400px, calc(100vh - 268px), 600px)" }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          role="img"
          aria-label={`Mapa da Bahia por ${conf.rotulo.toLowerCase()}`}
          onMouseLeave={() => setDica(null)}
        >
          <defs>
            {/* Hachura da amostra pequena: 45°, conforme regra §2 do handoff. */}
            <pattern
              id="hachura"
              width="5"
              height="5"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="5" height="5" fill="#EAF1F6" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="#7FAAC8" strokeWidth="2.2" />
            </pattern>
          </defs>
          <g ref={gRef}>
            {caminhos.map((c) => {
              const linha = modelo.porCodigo.get(c.cod) ?? null;
              const interativo = linha !== null && linha.equipe > 0;
              return (
                <path
                  key={c.cod}
                  d={c.d}
                  className={`mun${selecionado === c.cod ? " sel" : ""}`}
                  fill={conf.preencher(linha)}
                  // Só municípios com equipe entram na tabulação: 417 alvos de
                  // teclado inviabilizariam a navegação (handoff, acessibilidade).
                  tabIndex={interativo ? 0 : undefined}
                  role={interativo ? "button" : undefined}
                  aria-label={
                    interativo
                      ? `${c.nome}: ${linha.equipe} integrantes, ${linha.respostas} respostas, ${linha.faixa.rotulo}`
                      : undefined
                  }
                  onMouseMove={(e) =>
                    setDica({ x: e.clientX, y: e.clientY, feicao: c.feicao })
                  }
                  onFocus={(e) => {
                    const r = (e.target as SVGPathElement).getBoundingClientRect();
                    setDica({
                      x: r.left + r.width / 2,
                      y: r.top + r.height / 2,
                      feicao: c.feicao,
                    });
                  }}
                  onBlur={() => setDica(null)}
                  onClick={() => interativo && aoSelecionar(c.cod)}
                  onKeyDown={(e) => {
                    if (interativo && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      aoSelecionar(c.cod);
                    }
                  }}
                />
              );
            })}
          </g>
        </svg>

        <Legenda camada={camada} modelo={modelo} />

        <div className="absolute right-3.5 top-3.5 flex flex-col gap-1">
          {[
            { r: "+", t: "Aproximar", f: () => escalar(1.6) },
            { r: "−", t: "Afastar", f: () => escalar(1 / 1.6) },
            { r: "BA", t: "Reenquadrar na Bahia", f: reenquadrar },
          ].map((b) => (
            <button
              key={b.r}
              type="button"
              title={b.t}
              aria-label={b.t}
              onClick={b.f}
              className="h-[30px] w-[30px] rounded-[var(--r-sm)] border border-border bg-white/95 text-xs font-medium text-text-2 shadow-[var(--sh-sm)] hover:bg-surface-2"
            >
              {b.r}
            </button>
          ))}
        </div>

        <p className="absolute bottom-2.5 right-3.5 text-[10.5px] text-text-3">
          Malha municipal IBGE · dados agregados SIV
        </p>

        {dica && <Dica dica={dica} modelo={modelo} />}
      </div>
    </section>
  );
}

/* ── legenda permanente ───────────────────────────────────────────── */
function Legenda({ camada, modelo }: { camada: ChaveCamada; modelo: Modelo }) {
  const conf = CAMADAS[camada];
  return (
    <div
      aria-live="polite"
      className="absolute left-3.5 top-3.5 w-[206px] rounded-[var(--r-md)] border border-border bg-white/95 px-3 py-[11px] backdrop-blur-[3px]"
    >
      <h3 className="rot">Visualizando: {conf.rotulo}</h3>
      <p className="mt-1 text-[11.5px] leading-snug text-text-2">{conf.descricao}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {conf.legenda.map((i) => (
          <li key={i.titulo} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-0.5 h-3.5 w-3.5 flex-none rounded-[3px] border border-black/5"
              style={
                i.cor.startsWith("url")
                  ? {
                      backgroundImage:
                        "repeating-linear-gradient(45deg,#7FAAC8 0 2px,#EAF1F6 2px 4px)",
                    }
                  : { background: i.cor }
              }
            />
            <span className="text-xs leading-tight text-text">
              {i.titulo}
              {i.nota && <em className="block not-italic text-[11px] text-text-3">{i.nota}</em>}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 border-t border-border pt-2 text-[11px] leading-snug text-text-3">
        <span className="num">{modelo.comDados.length}</span> de {TOTAL_MUNICIPIOS_BA}{" "}
        municípios com respostas · <span className="num">{modelo.semResposta.length}</span>{" "}
        com equipe e nenhuma resposta
      </div>
    </div>
  );
}

/* ── tooltip ──────────────────────────────────────────────────────── */
function Dica({
  dica,
  modelo,
}: {
  dica: { x: number; y: number; feicao: FeicaoMunicipio };
  modelo: Modelo;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [alt, setAlt] = useState(0);
  useEffect(() => {
    if (ref.current) setAlt(ref.current.offsetHeight);
  }, [dica]);

  const linha = modelo.porCodigo.get(dica.feicao.properties.cod_ibge) ?? null;
  const largura = 250;
  const esq = Math.min(
    (typeof window !== "undefined" ? window.innerWidth : 1440) - largura - 12,
    dica.x + 16,
  );
  const topo = Math.max(
    8,
    Math.min(
      dica.y - alt / 2,
      (typeof window !== "undefined" ? window.innerHeight : 900) - alt - 12,
    ),
  );

  return (
    <div
      ref={ref}
      role="status"
      className="pointer-events-none fixed z-50 rounded-[var(--r-md)] border border-border-strong bg-white p-3 shadow-[var(--sh-md)]"
      style={{ width: largura, left: esq, top: topo }}
    >
      <p className="text-sm font-semibold">{dica.feicao.properties.nome}</p>
      {!linha || linha.equipe === 0 ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-text-2">
          Nenhuma equipe registrada neste município. Sem informação disponível — o
          que não indica ausência de intenção.
        </p>
      ) : (
        <>
          <dl className="mt-2 flex flex-col gap-1 text-xs">
            {[
              ["Equipe mapeada", String(linha.equipe)],
              ["Respostas", String(linha.respostas)],
              [
                "Cobertura",
                `${Math.round(linha.coberturaPontos)}% · ${linha.rotuloCobertura}`,
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-text-2">{k}</dt>
                <dd className="num font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {linha.respostas > 0 && (
            <div className="mt-2 border-t border-border pt-1.5">
              <p className="rot mb-1">Intenção declarada</p>
              {linha.suprimido ? (
                <p className="text-[11px] leading-snug text-text-3">
                  Distribuição omitida: menos respostas que o limiar de anonimato.
                </p>
              ) : (
                <dl className="flex flex-col gap-0.5 text-xs">
                  {linha.intencoes.map((i) => (
                    <div key={i.candidato} className="flex justify-between gap-3">
                      <dt className="text-text-2">{i.candidato}</dt>
                      <dd className="num font-medium">{i.qtd}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
            <span className={`badge bd-${linha.faixa.chave}`}>
              <i aria-hidden />
              {linha.faixa.rotulo}
            </span>
            <span className="text-[11px] text-text-3">
              {linha.respostas} de {linha.equipe} integrantes responderam
            </span>
          </div>
        </>
      )}
    </div>
  );
}
