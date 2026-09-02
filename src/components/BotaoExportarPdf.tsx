"use client";

import { useEffect, useRef } from "react";
import { nomeArquivoPdf } from "@/lib/exportacao";
import { ROTULO_CARGO, type Cargo } from "@/lib/tipos";

function IconeBaixar() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.2v7.2m0 0L5.2 6.6M8 9.4l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.8 11.4v1.2a1.2 1.2 0 0 0 1.2 1.2h8a1.2 1.2 0 0 0 1.2-1.2v-1.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Exporta a tela do cargo ativo em PDF.
 *
 * Usa a impressão do navegador com a folha `@media print` do painel, em vez de
 * rasterizar a tela com html2canvas: o mapa é SVG e sairia borrado, o texto
 * deixaria de ser selecionável e o bundle ganharia meio megabyte para produzir
 * um resultado pior.
 *
 * O nome do arquivo é aplicado por `beforeprint`, não no clique, para que o
 * Ctrl+P direto produza o mesmo arquivo que o botão — quem imprime pelo
 * teclado não deveria receber um PDF chamado "SIV · Painel de Inteligência
 * Territorial.pdf".
 */
export default function BotaoExportarPdf({
  cargo,
  geradoEm,
}: {
  cargo: Cargo;
  geradoEm: string;
}) {
  const tituloOriginal = useRef<string>("");

  useEffect(() => {
    tituloOriginal.current = document.title;
  }, []);

  useEffect(() => {
    const antes = () => {
      document.title = nomeArquivoPdf(cargo, geradoEm);
    };
    const depois = () => {
      if (tituloOriginal.current) document.title = tituloOriginal.current;
    };
    window.addEventListener("beforeprint", antes);
    window.addEventListener("afterprint", depois);
    return () => {
      window.removeEventListener("beforeprint", antes);
      window.removeEventListener("afterprint", depois);
    };
  }, [cargo, geradoEm]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      title={`Exportar a tela de ${ROTULO_CARGO[cargo]} em PDF`}
      className="flex h-[34px] items-center gap-1.5 rounded-[var(--r-sm)] border border-white/[.18] bg-white/[.08] px-3 text-[13px] font-medium text-white transition hover:border-white/40 hover:bg-white/[.18]"
    >
      <IconeBaixar />
      <span className="hidden sm:inline">Exportar PDF</span>
    </button>
  );
}
