import { describe, expect, it } from "vitest";
import { construirModelo, TOTAL_MUNICIPIOS_BA } from "../src/lib/consultas";
import { Dataset } from "../src/lib/tipos";
import bruto from "../src/dados/dataset.json";

const dataset = Dataset.parse(bruto);

describe("construirModelo com os dados reais da base", () => {
  const est = construirModelo(dataset, "estadual");
  const fed = construirModelo(dataset, "federal");

  it("bate com os totais da aba Painel da planilha", () => {
    expect(est.equipeTotal).toBe(262);
    expect(est.respostas).toBe(41);
    expect(fed.respostas).toBe(36);
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
    expect(est.comDados.map((l) => l.nome).sort()).toEqual([
      "Salvador",
      "Vitória da Conquista",
    ]);
  });

  it("mede concentração no município líder", () => {
    expect(est.maiorConcentracao?.nome).toBe("Salvador");
    expect(est.maiorConcentracao?.respostas).toBe(34);
    expect(est.maiorConcentracao?.parcela).toBeCloseTo(34 / 41, 6);
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
    expect(est.rotuloCobertura).toBe("Muito baixa");
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
