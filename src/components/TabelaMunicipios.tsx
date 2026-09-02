"use client";

import { useMemo, useState } from "react";
import {
  normalizar,
  numero,
  TOTAL_MUNICIPIOS_BA,
  type LinhaMunicipio,
  type Modelo,
} from "@/lib/consultas";
import { FAIXA_SEM_EQUIPE, faixaCobertura } from "@/lib/faixas";
import type { MalhaBahia } from "@/lib/malha";

type Coluna = "nome" | "equipe" | "respostas" | "cobertura" | "situacao" | "data";

const COLUNAS: { chave: Coluna; rotulo: string; numerica: boolean }[] = [
  { chave: "nome", rotulo: "Município", numerica: false },
  { chave: "equipe", rotulo: "Equipe", numerica: true },
  { chave: "respostas", rotulo: "Respostas", numerica: true },
  { chave: "cobertura", rotulo: "Cobertura", numerica: true },
  { chave: "situacao", rotulo: "Situação dos dados", numerica: true },
  { chave: "data", rotulo: "Última resposta", numerica: true },
];

/** Município da malha sem nenhum registro na base: estado vazio, não zero. */
function vazia(cod: number, nome: string): LinhaMunicipio {
  return {
    codIbge: cod,
    nome,
    equipe: 0,
    respostas: 0,
    coberturaPontos: 0,
    faixa: FAIXA_SEM_EQUIPE,
    rotuloCobertura: faixaCobertura(0),
    intencoes: [],
    suprimido: false,
    foraDaMalha: false,
    ultimaResposta: null,
  };
}

export default function TabelaMunicipios({
  modelo,
  malha,
  selecionado,
  aoSelecionar,
  incluirSemEquipe,
  setIncluirSemEquipe,
  filtro,
  setFiltro,
}: {
  modelo: Modelo;
  malha: MalhaBahia;
  selecionado: number | null;
  aoSelecionar: (l: LinhaMunicipio) => void;
  incluirSemEquipe: boolean;
  setIncluirSemEquipe: (v: boolean) => void;
  filtro: string;
  setFiltro: (v: string) => void;
}) {
  const [ordem, setOrdem] = useState<{ chave: Coluna; dir: 1 | -1 }>({
    chave: "equipe",
    dir: -1,
  });

  const semEquipe = useMemo(
    () =>
      malha.features
        .filter((f) => !modelo.porCodigo.has(f.properties.cod_ibge))
        .map((f) => vazia(f.properties.cod_ibge, f.properties.nome)),
    [malha, modelo],
  );

  const linhas = useMemo(() => {
    const base = incluirSemEquipe ? [...modelo.linhas, ...semEquipe] : modelo.linhas;
    const termo = normalizar(filtro);
    const filtradas = termo
      ? base.filter((l) => normalizar(l.nome).includes(termo))
      : base;

    const valor = (l: LinhaMunicipio): number | string => {
      switch (ordem.chave) {
        case "nome":
          return l.nome;
        case "equipe":
          return l.equipe;
        case "respostas":
          return l.respostas;
        case "cobertura":
          return l.coberturaPontos;
        case "situacao":
          // Ordena pela gravidade da faixa, não pelo alfabeto do rótulo.
          return l.equipe === 0 ? -1 : l.respostas;
        case "data":
          return l.ultimaResposta ?? "";
      }
    };

    return [...filtradas].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      const cmp =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb, "pt-BR")
          : Number(va) - Number(vb);
      return cmp * ordem.dir || a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [modelo, semEquipe, incluirSemEquipe, filtro, ordem]);

  const alternar = (c: Coluna) =>
    setOrdem((o) =>
      o.chave === c ? { chave: c, dir: (o.dir * -1) as 1 | -1 } : { chave: c, dir: -1 },
    );

  const comEquipeBA = modelo.naBahia.filter((l) => l.equipe > 0).length;

  return (
    <section className="card card-tabela">
      <div className="card-head">
        <h2>Exploração municipal</h2>
        <div className="nao-imprimir flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar município"
            aria-label="Filtrar município"
            className="h-[30px] w-[180px] rounded-[var(--r-sm)] border border-border bg-surface-2 px-2.5 text-xs"
          />
          <label className="flex items-center gap-1.5 text-xs text-text-2">
            <input
              type="checkbox"
              checked={incluirSemEquipe}
              onChange={(e) => setIncluirSemEquipe(e.target.checked)}
            />
            Incluir municípios sem equipe
          </label>
        </div>
      </div>

      {/*
        Os controles não vão para o PDF, então o recorte que eles produzem
        precisa estar escrito: uma tabela de três linhas sem dizer que há um
        filtro ativo é um documento que induz a erro.
      */}
      <p className="apenas-impressao ci-recorte">
        {filtro ? <>Filtro ativo: “{filtro}” · </> : null}
        {incluirSemEquipe
          ? "inclui municípios sem equipe identificada"
          : "apenas municípios com equipe mapeada"}
      </p>

      <div className="tabela-rolagem max-h-[520px] overflow-auto">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {COLUNAS.map((c) => (
                <th
                  key={c.chave}
                  scope="col"
                  aria-sort={
                    ordem.chave === c.chave
                      ? ordem.dir === 1
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={`border-b border-border px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[.06em] text-text-3 ${
                    c.numerica ? "text-right" : "text-left"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => alternar(c.chave)}
                    className="inline-flex items-center gap-1 uppercase hover:text-text"
                  >
                    {c.rotulo}
                    {ordem.chave === c.chave && (
                      <span aria-hidden>{ordem.dir === 1 ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={COLUNAS.length} className="px-3 py-6 text-center text-text-2">
                  Nenhum município corresponde a “{filtro}”.
                </td>
              </tr>
            ) : (
              linhas.map((l) => (
                <tr
                  key={`${l.codIbge ?? "x"}-${l.nome}`}
                  onClick={() => aoSelecionar(l)}
                  className={`cursor-pointer border-b border-surface-3 hover:bg-surface-2 ${
                    l.codIbge !== null && l.codIbge === selecionado ? "bg-[#F3F7FB]" : ""
                  }`}
                >
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="flex items-center gap-1.5">
                      {l.nome}
                      {l.foraDaMalha && <span className="badge bd-fora">fora da BA</span>}
                    </span>
                  </th>
                  <td className="num px-3 py-2 text-right text-text-2">
                    {l.equipe || "—"}
                  </td>
                  <td className="num px-3 py-2 text-right font-medium">
                    {l.respostas || "—"}
                  </td>
                  <td className="num px-3 py-2 text-right text-text-2">
                    {l.equipe > 0 ? `${Math.round(l.coberturaPontos)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`badge bd-${l.faixa.chave}`}>
                      <i aria-hidden />
                      {l.faixa.rotulo}
                    </span>
                  </td>
                  <td className="num px-3 py-2 text-right text-text-3">
                    {l.ultimaResposta
                      ? new Date(l.ultimaResposta).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t border-border px-4 py-2.5 text-[11.5px] text-text-3">
        <span className="num">{linhas.length}</span>{" "}
        {linhas.length === 1 ? "linha" : "linhas"} ·{" "}
        <span className="num">{comEquipeBA}</span> municípios da Bahia com equipe ·{" "}
        <span className="num">{TOTAL_MUNICIPIOS_BA - comEquipeBA}</span> sem equipe
        identificada
        <span className="nao-imprimir"> · clique numa linha para abrir o município</span>
      </p>
    </section>
  );
}
