import { describe, expect, it } from "vitest";
import { agregar, LIMIAR_SUPRESSAO_PADRAO } from "../src/lib/agregacao";
import { construirIndice } from "../src/lib/normalizacao";
import { ehCandidatoNominal, type LinhaBruta } from "../src/lib/tipos";

const indice = construirIndice([
  { properties: { id: "2927408", name: "Salvador" } },
  { properties: { id: "2910800", name: "Feira de Santana" } },
  { properties: { id: "2933307", name: "Vitória da Conquista" } },
]);

const opcoes = { fonte: "teste", sha256: "abc", geradoEm: "2026-01-01T00:00:00.000Z" };

function linha(p: Partial<LinhaBruta> & { numero: number }): LinhaBruta {
  return {
    nome: `Pessoa ${p.numero}`,
    nucleo: null,
    municipio: null,
    intencaoEstadual: null,
    intencaoFederal: null,
    ...p,
  };
}

describe("agregar", () => {
  it("nunca deixa vazar nome de pessoa para o dataset", () => {
    const linhas = [
      linha({ numero: 1, nome: "Fulano de Tal", municipio: "Salvador" }),
      linha({ numero: 2, nome: "Beltrana Silva", municipio: "Salvador" }),
    ];
    const { dataset } = agregar(linhas, indice, opcoes);
    const serializado = JSON.stringify(dataset);
    expect(serializado).not.toContain("Fulano");
    expect(serializado).not.toContain("Beltrana");
    expect(serializado).not.toContain("Pessoa ");
  });

  it("soma por município fecha com o total geral", () => {
    const linhas = [
      linha({ numero: 1, municipio: "Salvador" }),
      linha({ numero: 2, municipio: "Salvador" }),
      linha({ numero: 3, municipio: "Feira de Santana" }),
      linha({ numero: 4, municipio: null }),
    ];
    const { dataset } = agregar(linhas, indice, opcoes);
    const somaMunicipios = dataset.municipios.reduce((a, m) => a + m.equipe, 0);
    expect(somaMunicipios + dataset.semMunicipio.equipe).toBe(dataset.totais.equipe);
    expect(dataset.totais.equipe).toBe(4);
  });

  it("conta quem não tem município nos totais, mas fora do mapa", () => {
    const linhas = [
      linha({ numero: 1, municipio: null, intencaoEstadual: "Candidata Fabíola Mansur" }),
      linha({ numero: 2, municipio: "Salvador", intencaoEstadual: "Candidata Fabíola Mansur" }),
    ];
    const { dataset } = agregar(linhas, indice, opcoes);
    // O total precisa enxergar as duas respostas...
    expect(dataset.totais.respostas.estadual).toBe(2);
    expect(dataset.candidatos.estadual).toEqual([{ candidato: "Fabíola Mansur", qtd: 2 }]);
    // ...mas o mapa só pode mostrar a que tem lotação.
    const salvador = dataset.municipios.find((m) => m.nome === "Salvador")!;
    expect(salvador.respostas.estadual).toBe(1);
    expect(dataset.semMunicipio.respostas.estadual).toBe(1);
  });

  it("remove o prefixo 'Candidata/Candidato' do rótulo", () => {
    const linhas = [
      linha({ numero: 1, municipio: "Salvador", intencaoFederal: "Candidato Jorge Solla" }),
    ];
    const { dataset } = agregar(linhas, indice, opcoes);
    expect(dataset.candidatos.federal[0].candidato).toBe("Jorge Solla");
  });

  it("casa município ignorando acento e caixa", () => {
    const linhas = [
      linha({ numero: 1, municipio: "VITORIA DA CONQUISTA" }),
      linha({ numero: 2, municipio: "vitória da conquista" }),
    ];
    const { dataset } = agregar(linhas, indice, opcoes);
    expect(dataset.municipios).toHaveLength(1);
    expect(dataset.municipios[0].codIbge).toBe(2933307);
    expect(dataset.municipios[0].equipe).toBe(2);
  });

  it("marca município fora da malha em vez de descartá-lo", () => {
    const linhas = [linha({ numero: 1, municipio: "Brasília" })];
    const { dataset, avisos } = agregar(linhas, indice, opcoes);
    const fora = dataset.municipios.find((m) => m.nome === "Brasília")!;
    expect(fora.foraDaMalha).toBe(true);
    expect(fora.codIbge).toBeNull();
    expect(dataset.totais.equipe).toBe(1); // continua contado
    expect(avisos.join(" ")).toContain("Brasília");
  });
});

describe("supressão por baixa contagem", () => {
  it("omite a distribuição quando há menos respostas que o limiar", () => {
    const linhas = [
      linha({ numero: 1, municipio: "Feira de Santana", intencaoEstadual: "Candidata Fabíola Mansur" }),
      linha({ numero: 2, municipio: "Feira de Santana" }),
    ];
    const { dataset } = agregar(linhas, indice, { ...opcoes, limiar: 3 });
    const feira = dataset.municipios.find((m) => m.nome === "Feira de Santana")!;
    expect(feira.suprimido).toContain("estadual");
    expect(feira.intencoes.estadual).toEqual([]); // distribuição escondida
    expect(feira.respostas.estadual).toBe(1); // a contagem total sobrevive
  });

  it("libera a distribuição ao atingir o limiar", () => {
    const linhas = [1, 2, 3].map((n) =>
      linha({ numero: n, municipio: "Salvador", intencaoEstadual: "Candidata Fabíola Mansur" }),
    );
    const { dataset } = agregar(linhas, indice, { ...opcoes, limiar: 3 });
    const salvador = dataset.municipios[0];
    expect(salvador.suprimido).toEqual([]);
    expect(salvador.intencoes.estadual).toEqual([{ candidato: "Fabíola Mansur", qtd: 3 }]);
  });

  it("o limiar padrão protege município com uma única resposta", () => {
    expect(LIMIAR_SUPRESSAO_PADRAO).toBeGreaterThanOrEqual(3);
  });
});

describe("opções que não são candidatos nominais", () => {
  it("conta OUTROS e 'Não sei' como resposta, sem tratá-los como candidato", () => {
    const linhas = [
      linha({ numero: 1, municipio: "Salvador", intencaoEstadual: "OUTROS" }),
      linha({ numero: 2, municipio: "Salvador", intencaoEstadual: "Não sei" }),
      linha({
        numero: 3,
        municipio: "Salvador",
        intencaoEstadual: "Candidata Fabíola Mansur",
      }),
    ];
    const { dataset } = agregar(linhas, indice, opcoes);
    // Os três entram na cobertura, como a aba "Painel" da planilha os conta.
    expect(dataset.totais.respostas.estadual).toBe(3);
    expect(ehCandidatoNominal("OUTROS")).toBe(false);
    expect(ehCandidatoNominal("Não sei")).toBe(false);
    expect(ehCandidatoNominal("Fabíola Mansur")).toBe(true);
  });

  it("não confunde OUTROS com um candidato de nome prefixado", () => {
    const linhas = [
      linha({ numero: 1, municipio: "Salvador", intencaoFederal: "OUTROS" }),
    ];
    const { dataset } = agregar(linhas, indice, opcoes);
    expect(dataset.candidatos.federal).toEqual([{ candidato: "OUTROS", qtd: 1 }]);
  });
});
