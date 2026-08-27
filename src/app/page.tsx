import Painel from "@/components/Painel";
import { Dataset } from "@/lib/tipos";
import type { MalhaBahia } from "@/lib/malha";
import bruto from "@/dados/dataset.json";
import malha from "@/dados/malha-ba.json";

/**
 * O dataset é validado na fronteira do render, não só na ingestão: se um
 * arquivo desatualizado entrar no bundle, a página falha alto em vez de
 * renderizar número errado com cara de certo.
 */
export default function Pagina() {
  return (
    <Painel
      dataset={Dataset.parse(bruto)}
      malha={malha as unknown as MalhaBahia}
    />
  );
}
