"use client";

import type { LinhaMunicipio, Modelo } from "@/lib/consultas";

/**
 * Lista operacional: onde há equipe cadastrada e nenhuma resposta.
 *
 * O supra-rótulo "prioridade operacional, não eleitoral" não é enfeite — é o
 * que impede a lista de ser lida como ranking de apoio político.
 */
export default function AtencaoOperacional({
  modelo,
  aoAbrir,
}: {
  modelo: Modelo;
  aoAbrir: (l: LinhaMunicipio) => void;
}) {
  const lista = modelo.semResposta;
  const visiveis = lista.slice(0, 6);
  const restantes = lista.length - visiveis.length;

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Atenção operacional</h2>
          <p className="text-[11px] text-text-3">
            prioridade operacional, não eleitoral
          </p>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="px-4 py-4 text-[12.5px] text-text-2">
          Todas as localidades com equipe já registraram ao menos uma resposta.
        </p>
      ) : (
        <ul>
          {visiveis.map((l, i) => {
            const localizavel = !l.foraDaMalha;
            return (
              <li key={l.nome} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  disabled={!localizavel}
                  onClick={() => aoAbrir(l)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                    localizavel ? "hover:bg-surface-2" : "cursor-default opacity-75"
                  }`}
                >
                  <span className="w-4 flex-none font-mono text-[11.5px] text-text-3">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                      {l.nome}
                      {l.foraDaMalha && <span className="badge bd-fora">fora da BA</span>}
                    </span>
                    <span className="num block text-[11.5px] text-text-3">
                      {l.equipe} {l.equipe === 1 ? "integrante" : "integrantes"} · 0
                      respostas
                    </span>
                  </span>
                  <span className="badge bd-semresposta flex-none">
                    <i aria-hidden />
                    Sem dados
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {restantes > 0 && (
        <p className="px-4 py-2.5 text-[11.5px] leading-snug text-text-3">
          Mais {restantes} {restantes === 1 ? "localidade" : "localidades"} na mesma
          situação · critério: equipe cadastrada com nenhuma resposta registrada.
        </p>
      )}
    </section>
  );
}
