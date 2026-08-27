"use client";

import { formatarPct, type LinhaMunicipio } from "@/lib/consultas";
import { corDe } from "@/lib/paleta";

/**
 * Ranking de municípios. Serve como tabela de dados do mapa — a exigência de
 * acessibilidade que acompanha uma paleta de baixo contraste: tudo que a cor
 * diz no mapa está aqui em número.
 */
export default function Ranking({
  linhas,
  selecionado,
  aoSelecionar,
  candidato,
}: {
  linhas: LinhaMunicipio[];
  selecionado: number | null;
  aoSelecionar: (cod: number | null) => void;
  candidato: string | null;
}) {
  const ordenadas = [...linhas].sort(
    (a, b) => b.valor - a.valor || b.equipe - a.equipe,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Municípios por equipe mapeada e intenções declaradas
        </caption>
        <thead>
          <tr className="border-b border-linha text-left text-[11px] uppercase tracking-wide text-ardosia-400">
            <th scope="col" className="py-2 pr-2 font-medium">Município</th>
            <th scope="col" className="py-2 px-2 text-right font-medium">Equipe</th>
            <th scope="col" className="py-2 px-2 text-right font-medium">
              {candidato ? "Intenções" : "Respostas"}
            </th>
            <th scope="col" className="py-2 pl-2 text-right font-medium">Cobertura</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l) => {
            const ativo = l.codIbge === selecionado;
            return (
              <tr
                key={l.codIbge ?? l.nome}
                onClick={() => aoSelecionar(ativo ? null : l.codIbge)}
                className={`cursor-pointer border-b border-linha/60 transition hover:bg-fundo ${
                  ativo ? "bg-teal-50" : ""
                }`}
              >
                <th scope="row" className="py-2 pr-2 text-left font-normal text-tinta">
                  <span className="flex items-center gap-1.5">
                    {l.nome}
                    {l.foraDaMalha && (
                      <span
                        title="Não é município da Bahia — conta nos totais, mas não aparece no mapa"
                        className="rounded bg-linha px-1 text-[10px] text-ardosia"
                      >
                        fora da BA
                      </span>
                    )}
                    {l.suprimido && (
                      <span
                        title="Distribuição omitida: menos respostas que o limiar de anonimato"
                        className="rounded bg-linha px-1 text-[10px] text-ardosia"
                      >
                        omitido
                      </span>
                    )}
                  </span>
                </th>
                <td className="numerico py-2 px-2 text-right text-ardosia">{l.equipe}</td>
                <td className="numerico py-2 px-2 text-right font-semibold text-navy-800">
                  {l.valor > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      {candidato && (
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-[2px]"
                          style={{ background: corDe(candidato) }}
                        />
                      )}
                      {l.valor}
                    </span>
                  ) : (
                    <span className="text-ardosia-400">—</span>
                  )}
                </td>
                <td className="numerico py-2 pl-2 text-right text-ardosia">
                  {l.equipe > 0 ? formatarPct(l.cobertura, 0) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
