/**
 * Normalização de nomes de município.
 *
 * A planilha é preenchida à mão: aparecem acentos inconsistentes, espaços
 * duplicados e valores que não são municípios da Bahia ("Asia", "Brasília").
 * Casar por nome normalizado é o único caminho aqui, porque a planilha não
 * traz código IBGE. Quando o TSE entrar, a chave passa a ser o código.
 */

/** Remove acentos, colapsa espaços e baixa a caixa. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Trata célula de planilha: string vazia, espaços e traços viram null. */
export function limparCelula(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (texto === "" || texto === "-" || texto === "—") return null;
  return texto.replace(/\s+/g, " ");
}

/**
 * Extrai o nome do candidato do rótulo usado na planilha.
 * "Candidata Fabíola Mansur" -> "Fabíola Mansur"
 * "Não sei" -> "Não sei"
 */
export function nomeCandidato(rotulo: string): string {
  return rotulo.replace(/^Candidat[ao]\s+/i, "").trim();
}

/** Índice nome-normalizado -> código IBGE, construído a partir da malha. */
export type IndiceMunicipios = Map<string, { codIbge: number; nome: string }>;

export function construirIndice(
  features: Array<{ properties: { id: string; name: string } }>,
): IndiceMunicipios {
  const indice: IndiceMunicipios = new Map();
  for (const f of features) {
    indice.set(normalizar(f.properties.name), {
      codIbge: Number(f.properties.id),
      nome: f.properties.name,
    });
  }
  return indice;
}

export function casarMunicipio(
  nome: string,
  indice: IndiceMunicipios,
): { codIbge: number; nome: string } | null {
  return indice.get(normalizar(nome)) ?? null;
}
