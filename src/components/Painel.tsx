"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  candidatosDe,
  formatarPct,
  lacunas,
  linhasPara,
  TODOS,
} from "@/lib/consultas";
import { gini } from "@/lib/agregacao";
import { corDe, rampa, RAMPA_NEUTRA } from "@/lib/paleta";
import { ROTULO_CARGO, type Cargo, type Dataset } from "@/lib/tipos";
import Indicadores from "./Indicadores";
import BarrasCandidatos from "./BarrasCandidatos";
import Ranking from "./Ranking";
import Lacunas from "./Lacunas";

// MapLibre toca em window/WebGL: só no cliente.
const Mapa = dynamic(() => import("./Mapa"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-ardosia-400">
      Carregando mapa…
    </div>
  ),
});

type Props = { dataset: Dataset; malha: GeoJSON.FeatureCollection };

export default function Painel({ dataset, malha }: Props) {
  const [cargo, setCargo] = useState<Cargo>("estadual");
  const [candidato, setCandidato] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);

  const linhas = useMemo(
    () => linhasPara(dataset, cargo, candidato ?? TODOS),
    [dataset, cargo, candidato],
  );
  const candidatos = useMemo(() => candidatosDe(dataset, cargo), [dataset, cargo]);
  const semResposta = useMemo(() => lacunas(linhas), [linhas]);

  const noMapa = linhas.filter((l) => !l.foraDaMalha);
  const municipiosComEquipe = noMapa.length;
  const municipiosComResposta = noMapa.filter((l) => l.respostas > 0).length;
  const concentracao = gini(noMapa.map((l) => l.valor));

  // Ao filtrar por candidato, a rampa do mapa assume a cor dele.
  const corBase = candidato ? corDe(candidato) : null;
  const detalheSelecionado =
    selecionado === null
      ? null
      : (linhas.find((l) => l.codIbge === selecionado) ?? null);

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <header className="border-b border-navy-700/40 bg-navy-900">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-lg font-semibold tracking-tight text-white">SIV</span>
              <span className="text-sm text-white/55">Sistema de Intenção de Voto</span>
            </div>
            <p className="mt-0.5 text-[11px] text-white/40">
              Bahia · 2026 · painel interno de coordenação
            </p>
          </div>

          {/* Alternador de cargo — o eixo primário de leitura do painel. */}
          <div
            role="group"
            aria-label="Cargo"
            className="ml-auto flex rounded-lg bg-white/8 p-0.5"
          >
            {(["estadual", "federal"] as Cargo[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCargo(c);
                  setCandidato(null);
                }}
                aria-pressed={cargo === c}
                className={`rounded-[6px] px-3.5 py-1.5 text-sm font-medium transition ${
                  cargo === c
                    ? "bg-white text-navy-900"
                    : "text-white/65 hover:text-white"
                }`}
              >
                {ROTULO_CARGO[c]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-5 py-5">
        <Indicadores
          equipe={dataset.totais.equipe}
          respostas={dataset.totais.respostas[cargo]}
          cobertura={dataset.totais.cobertura[cargo]}
          municipiosComEquipe={municipiosComEquipe}
          municipiosComResposta={municipiosComResposta}
          semMunicipio={dataset.semMunicipio.equipe}
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* ── Mapa ────────────────────────────────────────────── */}
          <section className="cartao flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-tinta">
                  {candidato
                    ? `Intenções para ${candidato}`
                    : "Intenções declaradas por município"}
                </h2>
                <p className="text-xs text-ardosia-400">
                  {candidato
                    ? "Clique na barra do candidato novamente para ver todos"
                    : "Clique num candidato ao lado para filtrar o mapa"}
                </p>
              </div>
              <Legenda corBase={corBase} />
            </div>
            <div className="min-h-[440px] w-full flex-1 bg-fundo">
              <Mapa
                malha={malha}
                linhas={linhas}
                metrica="valor"
                corBase={corBase}
                selecionado={selecionado}
                aoSelecionar={setSelecionado}
              />
            </div>
            {detalheSelecionado && (
              <DetalheMunicipio
                linha={detalheSelecionado}
                aoFechar={() => setSelecionado(null)}
              />
            )}
          </section>

          {/* ── Coluna lateral ──────────────────────────────────── */}
          <div className="space-y-4">
            <section className="cartao px-4 py-3.5">
              <h2 className="mb-3 text-sm font-semibold text-tinta">
                Intenção — {ROTULO_CARGO[cargo]}
              </h2>
              <BarrasCandidatos
                dados={dataset.candidatos[cargo]}
                total={dataset.totais.respostas[cargo]}
                aoFiltrar={setCandidato}
                selecionado={candidato}
              />
              {candidatos.length > 0 && (
                <p className="mt-3 border-t border-linha pt-2.5 text-xs text-ardosia-400">
                  Concentração territorial (Gini):{" "}
                  <strong className="numerico text-ardosia">
                    {concentracao.toFixed(2).replace(".", ",")}
                  </strong>{" "}
                  — 0 é distribuição uniforme, 1 é tudo num município só.
                </p>
              )}
            </section>

            <section className="cartao px-4 py-3.5">
              <h2 className="mb-3 text-sm font-semibold text-tinta">
                Potencial não explorado
              </h2>
              <Lacunas linhas={semResposta} />
            </section>
          </div>
        </div>

        {/* ── Tabela de dados ──────────────────────────────────── */}
        <section className="cartao px-4 py-3.5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-tinta">
              Municípios · {ROTULO_CARGO[cargo]}
            </h2>
            <p className="text-xs text-ardosia-400">
              Cobertura geral: {formatarPct(dataset.totais.cobertura[cargo])}
            </p>
          </div>
          <Ranking
            linhas={linhas}
            selecionado={selecionado}
            aoSelecionar={setSelecionado}
            candidato={candidato}
          />
        </section>

        <Rodape dataset={dataset} />
      </main>
    </div>
  );
}

function Legenda({ corBase }: { corBase: string | null }) {
  const passos = corBase ? rampa(corBase) : RAMPA_NEUTRA;
  return (
    <div className="flex items-center gap-2 text-[11px] text-ardosia-400">
      <span>menos</span>
      <div className="flex overflow-hidden rounded-[3px]">
        {passos.map((cor) => (
          <span key={cor} className="h-2.5 w-6" style={{ background: cor }} />
        ))}
      </div>
      <span>mais</span>
    </div>
  );
}

function DetalheMunicipio({
  linha,
  aoFechar,
}: {
  linha: ReturnType<typeof linhasPara>[number];
  aoFechar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-linha bg-fundo px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-tinta">{linha.nome}</div>
        <div className="text-xs text-ardosia-400">
          {linha.equipe} na equipe · {linha.respostas} responderam ·{" "}
          {formatarPct(linha.cobertura, 0)} de cobertura
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {linha.suprimido ? (
          <span className="text-xs text-ardosia">
            Distribuição omitida por baixa contagem.
          </span>
        ) : (
          linha.detalhe.map((d) => (
            <span key={d.candidato} className="flex items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: corDe(d.candidato) }}
              />
              <span className="text-ardosia">{d.candidato}</span>
              <strong className="numerico text-tinta">{d.qtd}</strong>
            </span>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={aoFechar}
        className="ml-auto text-xs text-ardosia-400 underline-offset-2 hover:text-ardosia hover:underline"
      >
        fechar
      </button>
    </div>
  );
}

function Rodape({ dataset }: { dataset: Dataset }) {
  const data = new Date(dataset.geradoEm).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <footer className="cartao px-4 py-3 text-xs leading-relaxed text-ardosia">
      <p>
        <strong className="text-tinta">Base:</strong> {dataset.fonte} · agregada em{" "}
        {data} · impressão {dataset.sha256.slice(0, 12)}
      </p>
      <p className="mt-1">
        O painel opera exclusivamente sobre agregados por município. Nomes de
        profissionais não são armazenados nem transmitidos. Municípios com menos
        de {dataset.limiarSupressao} respostas têm a distribuição por candidato
        omitida.
      </p>
    </footer>
  );
}
