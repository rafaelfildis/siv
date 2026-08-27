/**
 * Faixas de classificação do painel territorial.
 *
 * São as regras do handoff de design (§ "Regras de classificação"), mantidas
 * aqui como constantes puras porque o documento exige que sejam configuráveis
 * e porque classificação de dado eleitoral é exatamente o tipo de lógica que
 * não pode viver espalhada em JSX.
 */

export type ChaveBase =
  | "consistente"
  | "moderada"
  | "inicial"
  | "limitada"
  | "semresposta"
  | "semequipe";

export type Faixa = {
  chave: ChaveBase;
  /** Mínimo de respostas para cair nesta faixa. */
  min: number;
  rotulo: string;
  /** Token CSS do preenchimento no mapa. */
  cor: string;
};

/** Faixas de qualidade da base, por número de respostas do município. */
export const FAIXAS_BASE: Faixa[] = [
  { chave: "consistente", min: 30, rotulo: "Base consistente", cor: "var(--b5)" },
  { chave: "moderada", min: 15, rotulo: "Base moderada", cor: "var(--b4)" },
  { chave: "inicial", min: 5, rotulo: "Base inicial", cor: "var(--b3)" },
  { chave: "limitada", min: 1, rotulo: "Base limitada", cor: "var(--b2)" },
];

export const FAIXA_SEM_RESPOSTA: Faixa = {
  chave: "semresposta",
  min: 0,
  rotulo: "Sem respostas",
  cor: "var(--amber)",
};

export const FAIXA_SEM_EQUIPE: Faixa = {
  chave: "semequipe",
  min: 0,
  rotulo: "Sem equipe identificada",
  cor: "var(--nodata)",
};

/**
 * Classifica um município.
 *
 * A ordem importa e é a razão de existir desta função: "sem equipe" e "sem
 * resposta" são estados diferentes e nunca podem receber a mesma cor —
 * ausência de informação não é ausência de intenção.
 */
export function classificarBase(
  loc: { equipe: number; respostas: number } | null | undefined,
): Faixa {
  if (!loc || loc.equipe === 0) return FAIXA_SEM_EQUIPE;
  if (loc.respostas > 0) {
    return FAIXAS_BASE.find((f) => loc.respostas >= f.min) ?? FAIXA_SEM_RESPOSTA;
  }
  return FAIXA_SEM_RESPOSTA;
}

/** Faixas de cobertura (respostas ÷ equipe), em pontos percentuais. */
export const FAIXAS_COBERTURA = [
  { min: 100, rotulo: "Completa" },
  { min: 75, rotulo: "Alta" },
  { min: 50, rotulo: "Moderada" },
  { min: 25, rotulo: "Baixa" },
  { min: 1, rotulo: "Muito baixa" },
  { min: 0, rotulo: "Sem cobertura" },
] as const;

export type RotuloCobertura = (typeof FAIXAS_COBERTURA)[number]["rotulo"];

/** Recebe a cobertura em PONTOS PERCENTUAIS (0–100), não em fração. */
export function faixaCobertura(pontos: number): RotuloCobertura {
  return (
    FAIXAS_COBERTURA.find((f) => pontos >= f.min) ??
    FAIXAS_COBERTURA[FAIXAS_COBERTURA.length - 1]
  ).rotulo;
}

/**
 * Abaixo deste número de respostas o município não recebe cor cheia na camada
 * de intenção: recebe hachura e o rótulo "amostra pequena". Percentual sobre
 * uma base tão pequena oscila a cada nova resposta.
 */
export const MINIMO_AMOSTRA_CONFIAVEL = 5;

export const amostraPequena = (respostas: number) =>
  respostas >= 1 && respostas < MINIMO_AMOSTRA_CONFIAVEL;
