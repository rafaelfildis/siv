"use client";

import { useState } from "react";
import { numero, type LinhaMunicipio, type Modelo } from "@/lib/consultas";

type ChaveAba = "cobertura" | "respostas" | "sem" | "equipe";

const ABAS: Record<
  ChaveAba,
  {
    rotulo: string;
    metodo: string;
    /** Filtra e ordena; devolve também o texto da métrica de cada linha. */
    montar: (m: Modelo) => { linha: LinhaMunicipio; principal: string; secundaria: string }[];
  }
> = {
  cobertura: {
    rotulo: "Cobertura",
    metodo:
      "Ordenado por respostas ÷ equipe mapeada, entre municípios com ao menos uma resposta.",
    montar: (m) =>
      [...m.naBahia]
        .filter((l) => l.respostas > 0)
        .sort((a, b) => b.coberturaPontos - a.coberturaPontos)
        .map((l) => ({
          linha: l,
          principal: `${Math.round(l.coberturaPontos)}%`,
          secundaria: `${l.respostas} de ${l.equipe} respostas`,
        })),
  },
  respostas: {
    rotulo: "Mais respostas",
    metodo: "Ordenado pelo número absoluto de respostas registradas.",
    montar: (m) =>
      [...m.naBahia]
        .filter((l) => l.respostas > 0)
        .sort((a, b) => b.respostas - a.respostas)
        .map((l) => ({
          linha: l,
          principal: numero(l.respostas),
          secundaria: `${l.equipe} na equipe · ${l.faixa.rotulo}`,
        })),
  },
  sem: {
    rotulo: "Sem respostas",
    metodo:
      "Municípios com equipe cadastrada e nenhuma resposta, ordenados pelo tamanho da equipe.",
    montar: (m) =>
      m.semResposta
        .filter((l) => !l.foraDaMalha)
        .map((l) => ({
          linha: l,
          principal: numero(l.equipe),
          secundaria: "integrantes · 0 respostas",
        })),
  },
  equipe: {
    rotulo: "Maior equipe",
    metodo: "Ordenado pelo número de integrantes com este município informado.",
    montar: (m) =>
      [...m.naBahia]
        .sort((a, b) => b.equipe - a.equipe)
        .map((l) => ({
          linha: l,
          principal: numero(l.equipe),
          secundaria: `${l.respostas} respostas · ${l.faixa.rotulo}`,
        })),
  },
};

function IconePin() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5A4.5 4.5 0 0 0 8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="6" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export default function RankingTerritorial({
  modelo,
  aoLocalizar,
  aoVerTodos,
}: {
  modelo: Modelo;
  aoLocalizar: (l: LinhaMunicipio) => void;
  aoVerTodos: () => void;
}) {
  const [aba, setAba] = useState<ChaveAba>("cobertura");
  const conf = ABAS[aba];
  const itens = conf.montar(modelo).slice(0, 10);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Inteligência territorial</h2>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Ranking por">
          {(Object.keys(ABAS) as ChaveAba[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={aba === k}
              onClick={() => setAba(k)}
              className={`rounded-[var(--r-sm)] px-2.5 py-1 text-xs font-medium transition ${
                aba === k ? "bg-navy text-white" : "text-text-2 hover:bg-surface-3"
              }`}
            >
              {ABAS[k].rotulo}
            </button>
          ))}
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="px-4 py-5 text-[12.5px] text-text-2">
          Nenhum município atende ao critério desta aba nesta importação.
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-x-7 px-4 py-1 lg:grid-cols-2">
          {itens.map((it, i) => (
            <li
              key={it.linha.nome}
              className="grid items-center gap-2 border-b border-surface-3 py-2 last:border-b-0"
              style={{ gridTemplateColumns: "18px minmax(0,1fr) 96px 30px" }}
            >
              <span className="font-mono text-[11.5px] text-text-3">{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium">
                  {it.linha.nome}
                </span>
                <span className="num block truncate text-[11.5px] text-text-3">
                  {it.secundaria}
                </span>
              </span>
              <span className="num text-right text-[13.5px] font-semibold text-navy">
                {it.principal}
              </span>
              <button
                type="button"
                title={`Localizar ${it.linha.nome} no mapa`}
                aria-label={`Localizar ${it.linha.nome} no mapa`}
                onClick={() => aoLocalizar(it.linha)}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[var(--r-sm)] text-text-3 hover:bg-surface-3 hover:text-navy"
              >
                <IconePin />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5">
        <p className="max-w-[62ch] text-[11.5px] leading-snug text-text-3">
          {conf.metodo}
        </p>
        <button
          type="button"
          onClick={aoVerTodos}
          className="rounded-[var(--r-sm)] border border-border px-2.5 py-1 text-xs font-medium text-text-2 hover:bg-surface-2"
        >
          Ver todos os municípios
        </button>
      </div>
    </section>
  );
}
