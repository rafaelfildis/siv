import Painel from "@/components/Painel";
import { Dataset } from "@/lib/tipos";
import bruto from "@/dados/dataset.json";
import malha from "@/dados/malha-ba.json";

/**
 * O dataset é validado na fronteira do render, não só na ingestão: se um
 * arquivo desatualizado ou corrompido entrar no bundle, a página falha alto
 * em vez de renderizar número errado com cara de certo.
 */
export default function Pagina() {
  const dataset = Dataset.parse(bruto);
  return (
    <Painel
      dataset={dataset}
      malha={malha as unknown as GeoJSON.FeatureCollection}
    />
  );
}
