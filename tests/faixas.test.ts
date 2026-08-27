import { describe, expect, it } from "vitest";
import {
  amostraPequena,
  classificarBase,
  faixaCobertura,
  MINIMO_AMOSTRA_CONFIAVEL,
} from "../src/lib/faixas";
import { CAMADAS } from "../src/lib/camadas";
import type { LinhaMunicipio } from "../src/lib/consultas";

function loc(equipe: number, respostas: number): LinhaMunicipio {
  return {
    codIbge: 1,
    nome: "Teste",
    equipe,
    respostas,
    coberturaPontos: equipe > 0 ? (respostas / equipe) * 100 : 0,
    faixa: classificarBase({ equipe, respostas }),
    rotuloCobertura: "",
    intencoes: [],
    suprimido: false,
    foraDaMalha: false,
    ultimaResposta: null,
  };
}

describe("classificarBase", () => {
  it.each([
    [30, "consistente"],
    [45, "consistente"],
    [29, "moderada"],
    [15, "moderada"],
    [14, "inicial"],
    [5, "inicial"],
    [4, "limitada"],
    [1, "limitada"],
  ])("%i respostas -> %s", (respostas, chave) => {
    expect(classificarBase({ equipe: 100, respostas }).chave).toBe(chave);
  });

  it("separa 'sem resposta' de 'sem equipe' — nunca a mesma cor", () => {
    const semResposta = classificarBase({ equipe: 8, respostas: 0 });
    const semEquipe = classificarBase({ equipe: 0, respostas: 0 });
    expect(semResposta.chave).toBe("semresposta");
    expect(semEquipe.chave).toBe("semequipe");
    // Regra inviolável §3 do handoff: ausência de informação e ausência de
    // resposta são estados distintos e não podem colidir visualmente.
    expect(semResposta.cor).not.toBe(semEquipe.cor);
  });

  it("trata município ausente da base como sem equipe", () => {
    expect(classificarBase(null).chave).toBe("semequipe");
    expect(classificarBase(undefined).chave).toBe("semequipe");
  });
});

describe("faixaCobertura", () => {
  it.each([
    [100, "Completa"],
    [88, "Alta"],
    [75, "Alta"],
    [74, "Moderada"],
    [50, "Moderada"],
    [49, "Baixa"],
    [25, "Baixa"],
    [24, "Muito baixa"],
    [1, "Muito baixa"],
    [0, "Sem cobertura"],
  ])("%i%% -> %s", (pontos, rotulo) => {
    expect(faixaCobertura(pontos)).toBe(rotulo);
  });

  it("recebe pontos percentuais, não fração", () => {
    // 0,5 seria "metade" se fosse fração; como são pontos, é meio ponto.
    expect(faixaCobertura(0.5)).toBe("Sem cobertura");
    expect(faixaCobertura(50)).toBe("Moderada");
  });
});

describe("amostraPequena", () => {
  it("marca de 1 a 4 respostas", () => {
    expect(amostraPequena(0)).toBe(false);
    expect(amostraPequena(1)).toBe(true);
    expect(amostraPequena(4)).toBe(true);
    expect(amostraPequena(MINIMO_AMOSTRA_CONFIAVEL)).toBe(false);
  });
});

describe("camadas do mapa", () => {
  it("intenção usa hachura em amostra pequena e cor cheia a partir de 5", () => {
    // Regra inviolável §2: 1 a 4 respostas nunca recebem cor cheia.
    expect(CAMADAS.intencao.preencher(loc(10, 4))).toBe("url(#hachura)");
    expect(CAMADAS.intencao.preencher(loc(10, 5))).toBe("var(--success)");
  });

  it("nenhuma camada pinta 'sem equipe' e 'sem resposta' igual", () => {
    for (const [nome, camada] of Object.entries(CAMADAS)) {
      const semEquipe = camada.preencher(loc(0, 0));
      const semResposta = camada.preencher(loc(8, 0));
      expect(semEquipe, `camada ${nome}`).not.toBe(semResposta);
    }
  });

  it("município ausente da base nunca é pintado como zero com equipe", () => {
    for (const [nome, camada] of Object.entries(CAMADAS)) {
      expect(camada.preencher(null), `camada ${nome}`).toBe("var(--nodata)");
    }
  });

  it("lacuna distingue relevante (5+) de comum (1 a 4)", () => {
    expect(CAMADAS.lacuna.preencher(loc(8, 0))).toBe("var(--amber-strong)");
    expect(CAMADAS.lacuna.preencher(loc(3, 0))).toBe("var(--amber)");
    expect(CAMADAS.lacuna.preencher(loc(8, 1))).toBe("var(--b2)");
  });

  it("cobertura respeita os cortes de 75/50/25/1", () => {
    const c = CAMADAS.cobertura.preencher;
    expect(c(loc(4, 3))).toBe("var(--b5)"); // 75%
    expect(c(loc(4, 2))).toBe("var(--b4)"); // 50%
    expect(c(loc(4, 1))).toBe("var(--b3)"); // 25%
    expect(c(loc(100, 1))).toBe("var(--b2)"); // 1%
    expect(c(loc(8, 0))).toBe("var(--amber)"); // 0% com equipe
  });
});
