import { describe, expect, it } from "vitest";
import { construirModelo, TOTAL_MUNICIPIOS_BA } from "../src/lib/consultas";
import { FAIXAS_COBERTURA, faixaCobertura } from "../src/lib/faixas";
import { Dataset } from "../src/lib/tipos";
import bruto from "../src/dados/dataset.json";

const dataset = Dataset.parse(bruto);

describe("construirModelo com os dados reais da base", () => {
  const est = construirModelo(dataset, "estadual");
  const fed = construirModelo(dataset, "federal");

  it("bate com os totais da aba Painel da planilha", () => {
    // Conferidos um a um contra a aba "Painel" da planilha de origem. São os
    // únicos números cravados da suíte, e é de propósito: se a ingestão passar
    // a divergir da conferência da própria base, este teste tem que quebrar.
    expect(est.equipeTotal).toBe(262);
    expect(est.respostas).toBe(186);
    expect(fed.respostas).toBe(185);
  });

  it("fecha equipe com município + sem município", () => {
    expect(est.equipeComMunicipio + est.semMunicipio).toBe(est.equipeTotal);
  });

  it("exclui registros fora da Bahia da contagem territorial", () => {
    expect(est.foraDaBahia.map((l) => l.nome).sort()).toEqual(["Asia", "Brasília"]);
    expect(est.naBahia).toHaveLength(est.linhas.length - 2);
    expect(est.comDados.every((l) => !l.foraDaMalha)).toBe(true);
  });

  it("conta municípios com dados dentro do total do estado", () => {
    expect(est.comDados.length).toBeLessThanOrEqual(TOTAL_MUNICIPIOS_BA);
    // Lista derivada do dataset, pelo mesmo motivo já registrado na
    // concentração e na cobertura: cravada, ela quebra a cada município novo
    // que responde — o que é a base cumprindo seu papel, não defeito. O que
    // este teste garante é a definição de "com dados": município da Bahia com
    // pelo menos uma resposta, e nenhum de fora da malha atravessando.
    const esperados = dataset.municipios
      .filter((m) => !m.foraDaMalha && m.respostas.estadual > 0)
      .map((m) => m.nome)
      .sort();
    expect(est.comDados.map((l) => l.nome).sort()).toEqual(esperados);
    expect(est.comDados.every((l) => !l.foraDaMalha && l.respostas > 0)).toBe(true);
  });

  it("mede concentração no município líder", () => {
    // Contagem derivada do dataset, como na cobertura abaixo: cravar aqui faria
    // o teste quebrar a cada reingestão sem indicar defeito. O que importa é a
    // relação — o líder é o município de mais respostas e a parcela é a fatia
    // dele no total.
    const salvador = est.comDados.find((l) => l.nome === "Salvador");
    expect(salvador).toBeDefined();
    expect(est.maiorConcentracao?.nome).toBe("Salvador");
    expect(est.maiorConcentracao?.respostas).toBe(salvador?.respostas);
    expect(est.maiorConcentracao?.parcela).toBeCloseTo(
      (salvador?.respostas ?? 0) / est.respostas,
      6,
    );
  });

  it("soma integrantes das localidades sem nenhuma resposta", () => {
    const soma = est.semResposta.reduce((a, l) => a + l.equipe, 0);
    expect(est.integrantesSemResposta).toBe(soma);
    expect(est.semResposta.every((l) => l.respostas === 0 && l.equipe > 0)).toBe(true);
  });

  it("ordena as lacunas pela maior equipe", () => {
    const equipes = est.semResposta.map((l) => l.equipe);
    expect([...equipes].sort((a, b) => b - a)).toEqual(equipes);
  });

  it("cobertura em pontos percentuais, não em fração", () => {
    // Derivado do próprio dataset: cravar o número faria este teste quebrar
    // a cada atualização da planilha, sem indicar defeito nenhum.
    expect(est.coberturaPontos).toBeCloseTo(
      (est.respostas / est.equipeTotal) * 100,
      6,
    );
    expect(est.coberturaPontos).toBeGreaterThan(1);
    expect(est.coberturaPontos).toBeLessThan(100);
    // O rótulo sai da mesma escala, e cravá-lo prendia o teste ao recorte da
    // planilha: em 29/08 a cobertura era "Muito baixa" e hoje é outra faixa,
    // sem defeito nenhum no meio. O que denuncia fração trocada por pontos é a
    // comparação — fração abaixo de 1 cai sempre em "Sem cobertura", enquanto
    // os pontos caem na faixa real.
    expect(FAIXAS_COBERTURA.map((f) => f.rotulo)).toContain(est.rotuloCobertura);
    expect(est.rotuloCobertura).not.toBe(
      faixaCobertura(dataset.totais.cobertura.estadual),
    );
  });

  it("não vaza nome de pessoa no modelo", () => {
    const s = JSON.stringify({ est, fed }, (_k, v) =>
      v instanceof Map ? [...v.values()] : v,
    );
    for (const nome of ["Adailton", "Adrielle", "Alessandro", "Mascarenhas"]) {
      expect(s).not.toContain(nome);
    }
  });
});
