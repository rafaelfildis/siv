import { z } from "zod";

/**
 * Cargos em disputa. A planilha traz duas colunas de intenção, uma por cargo.
 */
export const CARGOS = ["estadual", "federal"] as const;
export type Cargo = (typeof CARGOS)[number];

export const ROTULO_CARGO: Record<Cargo, string> = {
  estadual: "Deputado Estadual",
  federal: "Deputado Federal",
};

/**
 * Rótulo reservado para quem foi abordado mas não declarou preferência.
 * É contabilizado como resposta (entra no denominador de cobertura),
 * mas não é candidato.
 */
export const NAO_SEI = "Não sei";

/**
 * Linha bruta da aba "Mapeamento", antes de qualquer tratamento.
 * `nome` existe APENAS aqui, dentro do processo de ingestão, e é descartado
 * antes de qualquer escrita em disco. Ver DECISOES.md §3.
 */
export const LinhaBruta = z.object({
  numero: z.number().int().positive(),
  nome: z.string().min(1),
  nucleo: z.string().nullable(),
  municipio: z.string().nullable(),
  intencaoEstadual: z.string().nullable(),
  intencaoFederal: z.string().nullable(),
});
export type LinhaBruta = z.infer<typeof LinhaBruta>;

/**
 * Um valor por cargo. Escrito como objeto explícito em vez de
 * `z.record(z.enum(CARGOS), …)` porque o record do Zod infere
 * `Partial<Record<Cargo, T>>`, e um total de votos "possivelmente undefined"
 * espalha checagem defensiva por todo o painel.
 */
function porCargo<T extends z.ZodTypeAny>(valor: T) {
  return z.object({ estadual: valor, federal: valor });
}

/** Contagem de intenções de um município para um cargo. */
export const Contagem = z.object({
  candidato: z.string(),
  qtd: z.number().int().nonnegative(),
});
export type Contagem = z.infer<typeof Contagem>;

export const MunicipioAgregado = z.object({
  codIbge: z.number().int().nullable(),
  nome: z.string(),
  /** Total de profissionais da equipe vinculados ao município. */
  equipe: z.number().int().nonnegative(),
  /** Respostas registradas por cargo (inclui "Não sei"). */
  respostas: porCargo(z.number().int().nonnegative()),
  /**
   * Distribuição por candidato. Fica VAZIA quando o número de respostas do
   * município está abaixo do limiar de supressão — ver `suprimido`.
   */
  intencoes: porCargo(z.array(Contagem)),
  /** Cargos cuja distribuição foi suprimida por baixa contagem. */
  suprimido: z.array(z.enum(CARGOS)),
  /** true quando o nome não corresponde a nenhum município da malha da Bahia. */
  foraDaMalha: z.boolean(),
});
export type MunicipioAgregado = z.infer<typeof MunicipioAgregado>;

export const Dataset = z.object({
  geradoEm: z.string(),
  fonte: z.string(),
  sha256: z.string(),
  limiarSupressao: z.number().int().positive(),
  totais: z.object({
    equipe: z.number().int().nonnegative(),
    respostas: porCargo(z.number().int().nonnegative()),
    cobertura: porCargo(z.number()),
  }),
  candidatos: porCargo(z.array(Contagem)),
  municipios: z.array(MunicipioAgregado),
  /** Profissionais sem município preenchido — não aparecem no mapa. */
  semMunicipio: z.object({
    equipe: z.number().int().nonnegative(),
    respostas: porCargo(z.number().int().nonnegative()),
  }),
});
export type Dataset = z.infer<typeof Dataset>;

export const RegistroImportacao = z.object({
  id: z.string(),
  fonte: z.string(),
  sha256: z.string(),
  iniciadoEm: z.string(),
  concluidoEm: z.string(),
  status: z.enum(["sucesso", "falha", "ignorado"]),
  linhasLidas: z.number().int(),
  linhasValidas: z.number().int(),
  linhasRejeitadas: z.number().int(),
  linhasAncora: z.number().int(),
  avisos: z.array(z.string()),
});
export type RegistroImportacao = z.infer<typeof RegistroImportacao>;
