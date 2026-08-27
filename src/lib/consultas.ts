import type { Cargo, Dataset, MunicipioAgregado } from "./tipos";

/** Uma linha da tabela/ranking, já resolvida para o filtro corrente. */
export type LinhaMunicipio = {
  codIbge: number | null;
  nome: string;
  equipe: number;
  respostas: number;
  /** Intenções do candidato filtrado, ou total de intenções se "todos". */
  valor: number;
  /** valor / equipe — penetração da campanha naquele município. */
  penetracao: number;
  /** respostas / equipe — quanto do município já foi ouvido. */
  cobertura: number;
  suprimido: boolean;
  foraDaMalha: boolean;
  detalhe: { candidato: string; qtd: number }[];
};

export const TODOS = "__todos__";

/**
 * Resolve o dataset para o par (cargo, candidato) selecionado.
 *
 * Quando um candidato específico está filtrado, municípios com a distribuição
 * suprimida entram com valor 0 e `suprimido: true` — o mapa os pinta de
 * hachura em vez de fingir ausência de voto.
 */
export function linhasPara(
  dataset: Dataset,
  cargo: Cargo,
  candidato: string,
): LinhaMunicipio[] {
  return dataset.municipios.map((m: MunicipioAgregado) => {
    const suprimido = m.suprimido.includes(cargo);
    const detalhe = m.intencoes[cargo];
    const respostas = m.respostas[cargo];

    const valor =
      candidato === TODOS
        ? respostas
        : (detalhe.find((d) => d.candidato === candidato)?.qtd ?? 0);

    return {
      codIbge: m.codIbge,
      nome: m.nome,
      equipe: m.equipe,
      respostas,
      valor,
      penetracao: m.equipe === 0 ? 0 : valor / m.equipe,
      cobertura: m.equipe === 0 ? 0 : respostas / m.equipe,
      suprimido,
      foraDaMalha: m.foraDaMalha,
      detalhe,
    };
  });
}

/** Lista de candidatos do cargo, sem o rótulo "Não sei". */
export function candidatosDe(dataset: Dataset, cargo: Cargo): string[] {
  return dataset.candidatos[cargo]
    .filter((c) => c.candidato !== "Não sei")
    .map((c) => c.candidato);
}

/**
 * Municípios onde a campanha tem equipe mas ainda não tem resposta.
 * É a lista de trabalho da coordenação: potencial não explorado.
 */
export function lacunas(linhas: LinhaMunicipio[]): LinhaMunicipio[] {
  return linhas
    .filter((l) => l.respostas === 0 && l.equipe > 0)
    .sort((a, b) => b.equipe - a.equipe);
}

export function formatarPct(v: number, casas = 1): string {
  return `${(v * 100).toFixed(casas).replace(".", ",")}%`;
}

export function formatarNumero(v: number): string {
  return v.toLocaleString("pt-BR");
}
