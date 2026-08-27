"use client";

import { useEffect, useRef } from "react";
import { numero, razaoPct, type LinhaMunicipio, type Modelo } from "@/lib/consultas";
import { amostraPequena } from "@/lib/faixas";
import { ROTULO_CARGO } from "@/lib/tipos";
import { corDe } from "./Diagnostico";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border px-5 py-4 last:border-b-0">
      <h3 className="rot mb-2">{titulo}</h3>
      {children}
    </div>
  );
}

/**
 * Contexto do município sem trocar de página.
 *
 * Os estados vazios aqui são conteúdo, não placeholder: dizem explicitamente
 * que ausência de informação não é ausência de intenção.
 */
export default function DrawerMunicipio({
  linha,
  modelo,
  aoFechar,
  aoVerNaTabela,
  aoLocalizar,
}: {
  linha: LinhaMunicipio | null;
  modelo: Modelo;
  aoFechar: () => void;
  aoVerNaTabela: (l: LinhaMunicipio) => void;
  aoLocalizar: (l: LinhaMunicipio) => void;
}) {
  const fecharRef = useRef<HTMLButtonElement>(null);
  const aberto = linha !== null;

  useEffect(() => {
    if (!aberto) return;
    fecharRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberto, aoFechar]);

  const mediaComEquipe =
    modelo.naBahia.filter((l) => l.equipe > 0).length > 0
      ? modelo.naBahia
          .filter((l) => l.equipe > 0)
          .reduce((a, l) => a + l.coberturaPontos, 0) /
        modelo.naBahia.filter((l) => l.equipe > 0).length
      : 0;

  return (
    <>
      <div
        onClick={aoFechar}
        aria-hidden
        className={`fixed inset-0 z-40 bg-[rgba(12,39,64,.32)] transition-opacity duration-200 ${
          aberto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!aberto}
        aria-labelledby="drawer-titulo"
        className="fixed right-0 top-0 z-50 flex h-full w-[428px] max-w-[92vw] flex-col overflow-y-auto bg-surface shadow-[-8px_0_32px_rgba(12,39,64,.18)] transition-transform duration-[240ms] ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ transform: aberto ? "none" : "translateX(100%)" }}
      >
        {linha && (
          <>
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2
                  id="drawer-titulo"
                  className="text-xl font-semibold tracking-[-.02em]"
                >
                  {linha.nome}
                </h2>
                <p className="mt-0.5 text-xs text-text-3">
                  {linha.foraDaMalha
                    ? "Registro fora do escopo territorial da Bahia"
                    : `Bahia · ${ROTULO_CARGO[modelo.cargo]}`}
                </p>
              </div>
              <button
                ref={fecharRef}
                type="button"
                onClick={aoFechar}
                aria-label="Fechar"
                className="flex h-7 w-7 flex-none items-center justify-center rounded-[var(--r-sm)] text-text-3 hover:bg-surface-2 hover:text-text"
              >
                ✕
              </button>
            </header>

            <Bloco titulo="Cobertura">
              {linha.equipe === 0 ? (
                <p className="text-[12.5px] leading-snug text-text-2">
                  Nenhuma equipe registrada neste município. Sem presença registrada
                  não há coleta possível — e ausência de informação não é ausência de
                  intenção.
                </p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="num text-2xl font-semibold text-navy">
                      {Math.round(linha.coberturaPontos)}%
                    </span>
                    <span className="text-[12.5px] text-text-2">
                      {linha.rotuloCobertura}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-[3px] bg-surface-3">
                    <div
                      className="h-full rounded-[3px] bg-navy-700"
                      style={{ width: `${Math.max(linha.coberturaPontos, 0.8)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-text-2">
                    {linha.respostas} de {linha.equipe} integrantes responderam
                  </p>
                </>
              )}
            </Bloco>

            <Bloco titulo="Intenção declarada">
              {linha.respostas === 0 ? (
                <p className="rounded-[var(--r-sm)] border border-[var(--warning-bd)] bg-[var(--warning-bg)] px-3 py-2 text-[12.5px] leading-snug text-[var(--warning)]">
                  {linha.equipe > 0
                    ? `Há ${linha.equipe} ${linha.equipe === 1 ? "integrante cadastrado" : "integrantes cadastrados"}, mas nenhuma resposta foi registrada. Não há intenção declarada a exibir.`
                    : "Sem equipe registrada, não há intenção declarada a exibir."}
                </p>
              ) : linha.suprimido ? (
                <p className="text-[12.5px] leading-snug text-text-2">
                  Distribuição omitida: o município tem menos respostas que o limiar
                  de anonimato.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {linha.intencoes.map((i) => (
                    <li key={i.candidato}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] font-medium">{i.candidato}</span>
                        <span className="num text-sm font-semibold">{i.qtd}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-[3px] bg-surface-3">
                        <div
                          className="h-full rounded-[3px]"
                          style={{
                            width: `${(i.qtd / linha.respostas) * 100}%`,
                            background: corDe(i.candidato),
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-text-3">
                        {razaoPct(i.qtd, linha.respostas, 0)} · {i.qtd} de{" "}
                        {linha.respostas} respostas
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Bloco>

            <Bloco titulo="Qualidade da informação">
              <span className={`badge bd-${linha.faixa.chave}`}>
                <i aria-hidden />
                {linha.faixa.rotulo}
              </span>
              <p className="mt-2 text-[12.5px] leading-snug text-text-2">
                {linha.equipe === 0
                  ? "Sem equipe identificada, não há base a avaliar."
                  : linha.respostas === 0
                    ? "Há equipe cadastrada e nenhuma resposta: é lacuna de coleta, não leitura política."
                    : amostraPequena(linha.respostas)
                      ? `Com ${linha.respostas} respostas os percentuais oscilam fortemente a cada nova resposta. Use como indício, não como medida.`
                      : "A base permite leitura do município, ainda que não sustente projeção estadual."}
              </p>
            </Bloco>

            {linha.equipe > 0 && linha.respostas < linha.equipe && (
              <Bloco titulo="Equipe sem resposta">
                <p className="num text-2xl font-semibold text-navy">
                  {linha.equipe - linha.respostas}
                </p>
                <p className="mt-1 text-[11.5px] text-text-2">
                  integrantes ainda sem resposta registrada
                </p>
              </Bloco>
            )}

            <Bloco titulo="Contexto territorial">
              <dl className="flex flex-col gap-1.5 text-[12.5px]">
                {[
                  [
                    "Cobertura estadual",
                    `${modelo.coberturaPontos.toFixed(1).replace(".", ",")}%`,
                  ],
                  [
                    "Média dos municípios com equipe",
                    `${mediaComEquipe.toFixed(1).replace(".", ",")}%`,
                  ],
                  [
                    "Participação nas respostas",
                    razaoPct(linha.respostas, modelo.respostas, 0),
                  ],
                  [
                    "Participação na equipe",
                    razaoPct(linha.equipe, modelo.equipeTotal, 0),
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-text-2">{k}</dt>
                    <dd className="num font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Bloco>

            <div className="mt-auto flex flex-wrap gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => aoVerNaTabela(linha)}
                className="rounded-[var(--r-sm)] bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-700"
              >
                Ver na tabela completa
              </button>
              {!linha.foraDaMalha && (
                <button
                  type="button"
                  onClick={() => aoLocalizar(linha)}
                  className="rounded-[var(--r-sm)] border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-surface-2"
                >
                  Localizar no mapa
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
