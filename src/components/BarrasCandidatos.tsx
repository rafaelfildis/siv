"use client";

import type { Contagem } from "@/lib/tipos";
import { corDe } from "@/lib/paleta";
import { formatarPct } from "@/lib/consultas";

/**
 * Barras horizontais ordenadas por magnitude.
 *
 * Rótulo direto em toda barra: a paleta passa nos testes de daltonismo, mas
 * fica abaixo de 3:1 de contraste contra o branco — o texto é o que garante a
 * leitura, a cor só reforça a identidade.
 */
export default function BarrasCandidatos({
  dados,
  total,
  aoFiltrar,
  selecionado,
}: {
  dados: Contagem[];
  total: number;
  aoFiltrar: (candidato: string | null) => void;
  selecionado: string | null;
}) {
  if (dados.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ardosia-400">
        Nenhuma intenção registrada para este cargo.
      </p>
    );
  }
  const maximo = Math.max(...dados.map((d) => d.qtd));

  return (
    <ul className="space-y-2.5">
      {dados.map((d) => {
        const ativo = selecionado === d.candidato;
        const clicavel = d.candidato !== "Não sei";
        return (
          <li key={d.candidato}>
            <button
              type="button"
              disabled={!clicavel}
              onClick={() => aoFiltrar(ativo ? null : d.candidato)}
              aria-pressed={ativo}
              className={`group w-full rounded-lg px-2 py-1.5 text-left transition ${
                clicavel ? "hover:bg-fundo" : "cursor-default"
              } ${ativo ? "bg-fundo ring-1 ring-navy-600/25" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-tinta">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ background: corDe(d.candidato) }}
                  />
                  {d.candidato}
                </span>
                <span className="numerico shrink-0 text-sm font-semibold text-navy-800">
                  {d.qtd}
                  <span className="ml-1.5 text-xs font-normal text-ardosia-400">
                    {total > 0 ? formatarPct(d.qtd / total, 0) : "—"}
                  </span>
                </span>
              </div>
              {/* Trilho + barra de 6px, cantos arredondados na ponta do dado. */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-linha">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${maximo > 0 ? (d.qtd / maximo) * 100 : 0}%`,
                    background: corDe(d.candidato),
                  }}
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
