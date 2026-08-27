import { classificarBase, faixaCobertura, type Faixa } from "./faixas";
import type { Cargo, Contagem, Dataset, MunicipioAgregado } from "./tipos";

/** Um município resolvido para o cargo corrente. */
export type LinhaMunicipio = {
  codIbge: number | null;
  nome: string;
  equipe: number;
  respostas: number;
  /** Cobertura em pontos percentuais (0–100), como as faixas esperam. */
  coberturaPontos: number;
  faixa: Faixa;
  rotuloCobertura: string;
  intencoes: Contagem[];
  /** Distribuição omitida por baixa contagem — ver DECISOES.md §3. */
  suprimido: boolean;
  foraDaMalha: boolean;
  ultimaResposta: string | null;
};

/** Tudo que os blocos do painel consomem, derivado uma vez por cargo. */
export type Modelo = {
  cargo: Cargo;
  linhas: LinhaMunicipio[];
  /** Só municípios da Bahia (exclui os registros fora do escopo territorial). */
  naBahia: LinhaMunicipio[];
  comDados: LinhaMunicipio[];
  semResposta: LinhaMunicipio[];
  foraDaBahia: LinhaMunicipio[];
  porCodigo: Map<number, LinhaMunicipio>;
  equipeTotal: number;
  equipeComMunicipio: number;
  semMunicipio: number;
  respostas: number;
  respostasSemMunicipio: number;
  coberturaPontos: number;
  rotuloCobertura: string;
  intencoes: Contagem[];
  /** Município que concentra mais respostas, para a leitura de concentração. */
  maiorConcentracao: { nome: string; respostas: number; parcela: number } | null;
  integrantesSemResposta: number;
};

export const TOTAL_MUNICIPIOS_BA = 417;

function linhaDe(m: MunicipioAgregado, cargo: Cargo): LinhaMunicipio {
  const respostas = m.respostas[cargo];
  const coberturaPontos = m.equipe > 0 ? (respostas / m.equipe) * 100 : 0;
  return {
    codIbge: m.codIbge,
    nome: m.nome,
    equipe: m.equipe,
    respostas,
    coberturaPontos,
    faixa: classificarBase({ equipe: m.equipe, respostas }),
    rotuloCobertura: faixaCobertura(coberturaPontos),
    intencoes: m.intencoes[cargo],
    suprimido: m.suprimido.includes(cargo),
    foraDaMalha: m.foraDaMalha,
    ultimaResposta: m.ultimaResposta,
  };
}

export function construirModelo(dataset: Dataset, cargo: Cargo): Modelo {
  const linhas = dataset.municipios.map((m) => linhaDe(m, cargo));
  const naBahia = linhas.filter((l) => !l.foraDaMalha);
  const comDados = naBahia.filter((l) => l.respostas > 0);
  const semResposta = linhas
    .filter((l) => l.equipe > 0 && l.respostas === 0)
    .sort((a, b) => b.equipe - a.equipe || a.nome.localeCompare(b.nome, "pt-BR"));

  const respostas = dataset.totais.respostas[cargo];
  const equipeComMunicipio = linhas.reduce((a, l) => a + l.equipe, 0);

  const lider = [...comDados].sort((a, b) => b.respostas - a.respostas)[0];

  return {
    cargo,
    linhas,
    naBahia,
    comDados,
    semResposta,
    foraDaBahia: linhas.filter((l) => l.foraDaMalha),
    porCodigo: new Map(
      linhas.filter((l) => l.codIbge !== null).map((l) => [l.codIbge as number, l]),
    ),
    equipeTotal: dataset.totais.equipe,
    equipeComMunicipio,
    semMunicipio: dataset.semMunicipio.equipe,
    respostas,
    respostasSemMunicipio: dataset.semMunicipio.respostas[cargo],
    coberturaPontos: dataset.totais.cobertura[cargo] * 100,
    rotuloCobertura: faixaCobertura(dataset.totais.cobertura[cargo] * 100),
    intencoes: dataset.candidatos[cargo],
    maiorConcentracao: lider
      ? {
          nome: lider.nome,
          respostas: lider.respostas,
          parcela: respostas > 0 ? lider.respostas / respostas : 0,
        }
      : null,
    integrantesSemResposta: semResposta.reduce((a, l) => a + l.equipe, 0),
  };
}

/* ── formatação ─────────────────────────────────────────────────────── */

export const numero = (v: number) => v.toLocaleString("pt-BR");

/** Percentual a partir de pontos percentuais (0–100). */
export function pontosPct(pontos: number, casas = 1): string {
  return (
    pontos.toLocaleString("pt-BR", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    }) + "%"
  );
}

export function razaoPct(a: number, b: number, casas = 1): string {
  return b > 0 ? pontosPct((a / b) * 100, casas) : "0%";
}

/** Normalização usada só na busca; a junção com a malha é por código IBGE. */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim();
