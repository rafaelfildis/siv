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
 * Forma curta, para rótulo de figura ("Cobertura · Federal").
 *
 * Existe como constante porque a alternativa que estava em uso — recortar
 * "Deputado " do rótulo longo em cada componente — deixou o diagnóstico e o
 * drawer com "estadual" cravado, exibindo "Cobertura estadual" ao lado de
 * "Cobertura · Federal" para o mesmo número.
 */
export const ROTULO_CARGO_CURTO: Record<Cargo, string> = {
  estadual: "Estadual",
  federal: "Federal",
};

/**
 * Rótulos de resposta que não são candidatos nominais.
 *
 * Contam como resposta — entram na cobertura e no denominador dos
 * percentuais, exatamente como a aba "Painel" da planilha os conta — mas
 * não representam intenção por uma pessoa específica.
 */
export const NAO_SEI = "Não sei";
export const OUTROS = "OUTROS";
export const RESPOSTAS_NAO_NOMINAIS: readonly string[] = [NAO_SEI, OUTROS];

export const ehCandidatoNominal = (rotulo: string) =>
  !RESPOSTAS_NAO_NOMINAIS.includes(rotulo);

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
  /**
   * Data ISO da resposta mais recente do município.
   *
   * A planilha atual não tem coluna de data, então isto é sempre null e a
   * tabela mostra "—". O campo existe porque o contrato do painel prevê a
   * coluna: no dia em que a planilha ganhar a data, a coluna acende sozinha.
   */
  ultimaResposta: z.string().nullable(),
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
