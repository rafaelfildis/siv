import type { LinhaMunicipio } from "./consultas";

/**
 * Camadas do mapa ("Visualizar por"), conforme o handoff.
 *
 * Cada camada devolve o preenchimento de um município. `null` significa
 * município da malha sem nenhum registro na base — não é zero, é ausência.
 */
export type ChaveCamada =
  | "situacao"
  | "cobertura"
  | "respostas"
  | "equipe"
  | "intencao"
  | "lacuna";

export type ItemLegenda = { cor: string; titulo: string; nota?: string };

export type Camada = {
  rotulo: string;
  descricao: string;
  legenda: ItemLegenda[];
  preencher: (l: LinhaMunicipio | null) => string;
};

const HACHURA = "url(#hachura)";
const SEM_DADO = "var(--nodata)";

export const CAMADAS: Record<ChaveCamada, Camada> = {
  situacao: {
    rotulo: "Situação dos dados",
    descricao: "Distingue ausência de intenção de ausência de informação.",
    legenda: [
      { cor: "var(--b4)", titulo: "Base moderada", nota: "15+ respostas" },
      { cor: "var(--b3)", titulo: "Base inicial", nota: "5 a 14 respostas" },
      { cor: "var(--b2)", titulo: "Base limitada", nota: "1 a 4 respostas" },
      { cor: "var(--amber)", titulo: "Sem respostas", nota: "há equipe, nenhuma resposta" },
      { cor: SEM_DADO, titulo: "Sem equipe identificada", nota: "nenhuma presença registrada" },
    ],
    preencher: (l) => (l ? l.faixa.cor : SEM_DADO),
  },
  cobertura: {
    rotulo: "Cobertura",
    descricao: "Respostas ÷ equipe mapeada no município.",
    legenda: [
      { cor: "var(--b5)", titulo: "Alta a completa", nota: "75% a 100%" },
      { cor: "var(--b4)", titulo: "Moderada", nota: "50% a 74%" },
      { cor: "var(--b3)", titulo: "Baixa", nota: "25% a 49%" },
      { cor: "var(--b2)", titulo: "Muito baixa", nota: "1% a 24%" },
      { cor: "var(--amber)", titulo: "Sem cobertura", nota: "0% com equipe cadastrada" },
      { cor: SEM_DADO, titulo: "Sem equipe identificada", nota: "—" },
    ],
    preencher: (l) => {
      if (!l || l.equipe === 0) return SEM_DADO;
      if (l.coberturaPontos >= 75) return "var(--b5)";
      if (l.coberturaPontos >= 50) return "var(--b4)";
      if (l.coberturaPontos >= 25) return "var(--b3)";
      if (l.coberturaPontos >= 1) return "var(--b2)";
      return "var(--amber)";
    },
  },
  respostas: {
    rotulo: "Volume de respostas",
    descricao: "Quantidade absoluta de respostas registradas.",
    legenda: [
      { cor: "var(--b5)", titulo: "Alta", nota: "15 ou mais" },
      { cor: "var(--b3)", titulo: "Moderada", nota: "5 a 14" },
      { cor: "var(--b2)", titulo: "Baixa", nota: "1 a 4" },
      { cor: "var(--amber)", titulo: "Sem respostas", nota: "0, com equipe" },
      { cor: SEM_DADO, titulo: "Sem equipe identificada", nota: "—" },
    ],
    preencher: (l) => {
      if (!l) return SEM_DADO;
      if (l.respostas >= 15) return "var(--b5)";
      if (l.respostas >= 5) return "var(--b3)";
      if (l.respostas >= 1) return "var(--b2)";
      return l.equipe > 0 ? "var(--amber)" : SEM_DADO;
    },
  },
  equipe: {
    rotulo: "Equipe mapeada",
    descricao: "Integrantes com município informado.",
    legenda: [
      { cor: "var(--b5)", titulo: "50 ou mais" },
      { cor: "var(--b4)", titulo: "10 a 49" },
      { cor: "var(--b3)", titulo: "5 a 9" },
      { cor: "var(--b2)", titulo: "1 a 4" },
      { cor: SEM_DADO, titulo: "Nenhuma equipe" },
    ],
    preencher: (l) => {
      if (!l || l.equipe === 0) return SEM_DADO;
      if (l.equipe >= 50) return "var(--b5)";
      if (l.equipe >= 10) return "var(--b4)";
      if (l.equipe >= 5) return "var(--b3)";
      return "var(--b2)";
    },
  },
  intencao: {
    rotulo: "Intenção declarada",
    descricao:
      "Só é colorida onde a amostra permite leitura. Hachura = amostra pequena.",
    legenda: [
      { cor: "var(--success)", titulo: "Leitura possível", nota: "base de 5+ respostas" },
      { cor: HACHURA, titulo: "Amostra pequena", nota: "1 a 4 respostas · leitura não confiável" },
      { cor: "var(--amber)", titulo: "Sem respostas", nota: "há equipe, nenhuma resposta" },
      { cor: SEM_DADO, titulo: "Sem informação", nota: "nenhuma equipe registrada" },
    ],
    preencher: (l) => {
      if (!l) return SEM_DADO;
      if (l.respostas >= 5) return "var(--success)";
      if (l.respostas >= 1) return HACHURA;
      return l.equipe > 0 ? "var(--amber)" : SEM_DADO;
    },
  },
  lacuna: {
    rotulo: "Lacuna de dados",
    descricao: "Onde existe equipe cadastrada e a coleta não avançou.",
    legenda: [
      { cor: "var(--amber-strong)", titulo: "Lacuna relevante", nota: "5+ integrantes, 0 respostas" },
      { cor: "var(--amber)", titulo: "Lacuna", nota: "1 a 4 integrantes, 0 respostas" },
      { cor: "var(--b2)", titulo: "Coleta iniciada", nota: "ao menos 1 resposta" },
      { cor: SEM_DADO, titulo: "Sem equipe identificada", nota: "sem lacuna mensurável" },
    ],
    preencher: (l) => {
      if (!l || l.equipe === 0) return SEM_DADO;
      if (l.respostas > 0) return "var(--b2)";
      return l.equipe >= 5 ? "var(--amber-strong)" : "var(--amber)";
    },
  },
};

export const ORDEM_CAMADAS: ChaveCamada[] = [
  "situacao",
  "cobertura",
  "respostas",
  "equipe",
  "intencao",
  "lacuna",
];
