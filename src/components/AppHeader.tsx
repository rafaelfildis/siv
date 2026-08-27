"use client";

import { useEffect, useRef, useState } from "react";
import { normalizar } from "@/lib/consultas";
import { CARGOS, ROTULO_CARGO, type Cargo } from "@/lib/tipos";
import type { MalhaBahia } from "@/lib/malha";

type Sugestao = { codIbge: number; nome: string };

function IconeLupa() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function AppHeader({
  cargo,
  aoTrocarCargo,
  malha,
  aoEscolherMunicipio,
}: {
  cargo: Cargo;
  aoTrocarCargo: (c: Cargo) => void;
  malha: MalhaBahia;
  aoEscolherMunicipio: (codIbge: number) => void;
}) {
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const caixaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  // Prefixo antes de substring: quem digita "sal" espera Salvador no topo.
  const t = normalizar(termo);
  const sugestoes: Sugestao[] = t
    ? (() => {
        const todos = malha.features.map((f) => ({
          codIbge: f.properties.cod_ibge,
          nome: f.properties.nome,
          n: normalizar(f.properties.nome),
        }));
        const prefixo = todos.filter((m) => m.n.startsWith(t));
        const contem = todos.filter((m) => !m.n.startsWith(t) && m.n.includes(t));
        return [...prefixo, ...contem].slice(0, 7);
      })()
    : [];

  const escolher = (s: Sugestao) => {
    aoEscolherMunicipio(s.codIbge);
    setTermo("");
    setAberto(false);
  };

  return (
    <header className="sticky top-0 z-[60] h-[60px] bg-navy">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[19px] font-bold tracking-[.06em] text-white">SIV</span>
          <span className="hidden text-[13px] text-on-navy sm:inline">
            Sistema de Intenção de Voto
          </span>
        </div>
        <p className="hidden border-l border-white/15 pl-6 text-xs text-on-navy lg:block">
          <b className="font-semibold">Bahia</b> · Eleições 2026 · painel interno de
          coordenação
        </p>

        <div className="ml-auto flex items-center gap-2.5">
          <div ref={caixaRef} className="relative hidden md:block">
            <span className="pointer-events-none absolute left-[9px] top-1/2 -translate-y-1/2 text-on-navy">
              <IconeLupa />
            </span>
            <input
              role="combobox"
              aria-expanded={aberto && sugestoes.length > 0}
              aria-controls="lista-municipios"
              aria-label="Buscar município"
              placeholder="Buscar município"
              value={termo}
              onChange={(e) => {
                setTermo(e.target.value);
                setAberto(true);
                setAtivo(0);
              }}
              onFocus={() => setAberto(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setAtivo((i) => Math.min(i + 1, sugestoes.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setAtivo((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && sugestoes[ativo]) {
                  e.preventDefault();
                  escolher(sugestoes[ativo]);
                } else if (e.key === "Escape") {
                  setAberto(false);
                }
              }}
              className="h-[34px] w-[236px] rounded-[var(--r-sm)] border border-white/[.18] bg-white/[.08] pl-[30px] pr-7 text-[13px] text-white placeholder:text-on-navy focus:border-[#5C86AC] focus:bg-white/[.14]"
            />
            {termo && (
              <button
                type="button"
                onClick={() => setTermo("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-navy hover:text-white"
              >
                ✕
              </button>
            )}
            {aberto && sugestoes.length > 0 && (
              <ul
                id="lista-municipios"
                role="listbox"
                className="absolute right-0 top-[38px] w-full overflow-hidden rounded-[var(--r-md)] border border-border bg-white shadow-[var(--sh-md)]"
              >
                {sugestoes.map((s, i) => (
                  <li key={s.codIbge} role="option" aria-selected={i === ativo}>
                    <button
                      type="button"
                      onMouseEnter={() => setAtivo(i)}
                      onClick={() => escolher(s)}
                      className={`block w-full px-3 py-1.5 text-left text-[13px] ${
                        i === ativo ? "bg-surface-3" : ""
                      }`}
                    >
                      {s.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            role="group"
            aria-label="Cargo"
            className="flex gap-0.5 rounded-[var(--r-sm)] bg-white/[.09] p-0.5"
          >
            {CARGOS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cargo === c}
                onClick={() => aoTrocarCargo(c)}
                className={`rounded-[3px] px-[13px] py-[5px] text-[13px] font-medium transition ${
                  cargo === c ? "bg-white text-navy" : "text-[#BACBDC] hover:text-white"
                }`}
              >
                {ROTULO_CARGO[c]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
