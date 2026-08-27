import {
  CARGOS,
  type Cargo,
  type Contagem,
  type Dataset,
  type LinhaBruta,
  type MunicipioAgregado,
} from "./tipos";
import {
  casarMunicipio,
  nomeCandidato,
  type IndiceMunicipios,
} from "./normalizacao";

/**
 * Limiar de supressão (k-anonimato prático).
 *
 * Municípios com menos respostas que este limiar têm a distribuição por
 * candidato omitida — só a contagem total de respostas sobrevive. Sem isso,
 * um município com uma única resposta revelaria o voto de uma pessoa
 * identificável pela equipe, mesmo com o nome ausente do banco.
 * Ver DECISOES.md §3.
 */
export const LIMIAR_SUPRESSAO_PADRAO = 3;

function vazioPorCargo<T>(fabrica: () => T): Record<Cargo, T> {
  return Object.fromEntries(CARGOS.map((c) => [c, fabrica()])) as Record<
    Cargo,
    T
  >;
}

function ordenar(contador: Map<string, number>): Contagem[] {
  return [...contador.entries()]
    .map(([candidato, qtd]) => ({ candidato, qtd }))
    .sort((a, b) => b.qtd - a.qtd || a.candidato.localeCompare(b.candidato, "pt-BR"));
}

/**
 * Converte as linhas nominais em agregados por município.
 *
 * INVARIANTE: nada do que sai desta função contém nome de pessoa. O campo
 * `nome` da linha bruta é lido apenas para contar, nunca copiado.
 */
export function agregar(
  linhas: LinhaBruta[],
  indice: IndiceMunicipios,
  opcoes: { limiar?: number; fonte: string; sha256: string; geradoEm: string },
): { dataset: Dataset; avisos: string[] } {
  const limiar = opcoes.limiar ?? LIMIAR_SUPRESSAO_PADRAO;
  const avisos: string[] = [];

  type Acumulador = {
    codIbge: number | null;
    nome: string;
    equipe: number;
    contadores: Record<Cargo, Map<string, number>>;
    foraDaMalha: boolean;
  };

  const porMunicipio = new Map<string, Acumulador>();
  const semMunicipio = {
    equipe: 0,
    respostas: vazioPorCargo(() => 0),
  };
  const totaisCandidato = vazioPorCargo(() => new Map<string, number>());
  const naoCasados = new Set<string>();

  for (const linha of linhas) {
    const intencoes: Record<Cargo, string | null> = {
      estadual: linha.intencaoEstadual,
      federal: linha.intencaoFederal,
    };

    // Contabiliza o total por candidato independentemente do município,
    // para que os indicadores de topo não percam as 105 pessoas sem lotação.
    for (const cargo of CARGOS) {
      const bruto = intencoes[cargo];
      if (!bruto) continue;
      const candidato = nomeCandidato(bruto);
      const mapa = totaisCandidato[cargo];
      mapa.set(candidato, (mapa.get(candidato) ?? 0) + 1);
    }

    if (!linha.municipio) {
      semMunicipio.equipe += 1;
      for (const cargo of CARGOS) {
        if (intencoes[cargo]) semMunicipio.respostas[cargo] += 1;
      }
      continue;
    }

    const casado = casarMunicipio(linha.municipio, indice);
    if (!casado) naoCasados.add(linha.municipio);

    const chave = casado ? String(casado.codIbge) : `?${linha.municipio}`;
    let acc = porMunicipio.get(chave);
    if (!acc) {
      acc = {
        codIbge: casado?.codIbge ?? null,
        nome: casado?.nome ?? linha.municipio,
        equipe: 0,
        contadores: vazioPorCargo(() => new Map<string, number>()),
        foraDaMalha: !casado,
      };
      porMunicipio.set(chave, acc);
    }

    acc.equipe += 1;
    for (const cargo of CARGOS) {
      const bruto = intencoes[cargo];
      if (!bruto) continue;
      const candidato = nomeCandidato(bruto);
      const mapa = acc.contadores[cargo];
      mapa.set(candidato, (mapa.get(candidato) ?? 0) + 1);
    }
  }

  for (const nome of [...naoCasados].sort()) {
    avisos.push(
      `Município "${nome}" não corresponde a nenhum dos 417 municípios da Bahia; ` +
        `mantido nos totais, ausente do mapa.`,
    );
  }

  const municipios: MunicipioAgregado[] = [...porMunicipio.values()]
    .map((acc) => {
      const respostas = vazioPorCargo(() => 0);
      const intencoes = vazioPorCargo<Contagem[]>(() => []);
      const suprimido: Cargo[] = [];

      for (const cargo of CARGOS) {
        const total = [...acc.contadores[cargo].values()].reduce((a, b) => a + b, 0);
        respostas[cargo] = total;
        if (total === 0) continue;
        if (total < limiar) {
          suprimido.push(cargo);
        } else {
          intencoes[cargo] = ordenar(acc.contadores[cargo]);
        }
      }

      return {
        codIbge: acc.codIbge,
        nome: acc.nome,
        equipe: acc.equipe,
        respostas,
        intencoes,
        suprimido,
        foraDaMalha: acc.foraDaMalha,
      };
    })
    .sort((a, b) => b.equipe - a.equipe || a.nome.localeCompare(b.nome, "pt-BR"));

  const equipeTotal = linhas.length;
  const respostasTotais = vazioPorCargo(() => 0);
  for (const cargo of CARGOS) {
    respostasTotais[cargo] = [...totaisCandidato[cargo].values()].reduce(
      (a, b) => a + b,
      0,
    );
  }

  const cobertura = vazioPorCargo(() => 0);
  for (const cargo of CARGOS) {
    cobertura[cargo] =
      equipeTotal === 0 ? 0 : respostasTotais[cargo] / equipeTotal;
  }

  const candidatos = vazioPorCargo<Contagem[]>(() => []);
  for (const cargo of CARGOS) candidatos[cargo] = ordenar(totaisCandidato[cargo]);

  const dataset: Dataset = {
    geradoEm: opcoes.geradoEm,
    fonte: opcoes.fonte,
    sha256: opcoes.sha256,
    limiarSupressao: limiar,
    totais: { equipe: equipeTotal, respostas: respostasTotais, cobertura },
    candidatos,
    municipios,
    semMunicipio,
  };

  return { dataset, avisos };
}

/**
 * Índice de Gini da distribuição entre os municípios.
 * 0 = perfeitamente distribuído; 1 = tudo num único município.
 *
 * Atenção ao caso de um município só: o Gini de um único valor é 0, porque não
 * há desigualdade entre um elemento e ele mesmo. Exibir esse 0 como
 * "distribuição uniforme" diz exatamente o oposto da realidade. Use
 * `concentracao()` para apresentar o número — ela trata esse caso.
 */
export function gini(valores: number[]): number {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return 0;
  const soma = v.reduce((a, b) => a + b, 0);
  if (soma === 0) return 0;
  let acumulado = 0;
  for (let i = 0; i < n; i++) acumulado += (2 * (i + 1) - n - 1) * v[i];
  return acumulado / (n * soma);
}

/**
 * Resultado apresentável do índice de concentração.
 *
 * Com menos de dois municípios pontuados, o Gini não é interpretável e o
 * painel mostra o fato em vez de um número enganoso.
 */
export type Concentracao =
  | { tipo: "indice"; valor: number; municipios: number }
  | { tipo: "municipio_unico"; nome: string }
  | { tipo: "sem_dados" };

export function concentracao(
  entradas: { nome: string; valor: number }[],
): Concentracao {
  const pontuados = entradas.filter((e) => e.valor > 0);
  if (pontuados.length === 0) return { tipo: "sem_dados" };
  if (pontuados.length === 1)
    return { tipo: "municipio_unico", nome: pontuados[0].nome };
  return {
    tipo: "indice",
    valor: gini(pontuados.map((e) => e.valor)),
    municipios: pontuados.length,
  };
}
