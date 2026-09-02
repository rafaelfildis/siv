import { describe, expect, it } from "vitest";
import { dataBahia, dataHoraBahia, nomeArquivoPdf, tituloImpressao } from "../src/lib/exportacao";
import { CARGOS, ROTULO_CARGO, ROTULO_CARGO_CURTO } from "../src/lib/tipos";
import bruto from "../src/dados/dataset.json";

describe("nome do arquivo exportado", () => {
  it("carrega cargo e data do recorte", () => {
    expect(nomeArquivoPdf("estadual", "2026-09-02T12:38:28.140Z")).toBe(
      "SIV-painel-estadual-2026-09-02",
    );
    expect(nomeArquivoPdf("federal", "2026-09-02T12:38:28.140Z")).toBe(
      "SIV-painel-federal-2026-09-02",
    );
  });

  it("data do dado, não a do clique", () => {
    // A mesma marca de agregação tem que produzir o mesmo nome hoje e daqui a
    // um mês. Quem recebe o PDF precisa saber de quando é o número.
    const antes = nomeArquivoPdf("estadual", "2026-08-29T16:27:56.491Z");
    const depois = nomeArquivoPdf("estadual", "2026-08-29T16:27:56.491Z");
    expect(antes).toBe(depois);
    expect(antes).toBe("SIV-painel-estadual-2026-08-29");
    expect(antes).not.toBe(nomeArquivoPdf("estadual", bruto.geradoEm));
  });

  it("data no fuso da Bahia, não em UTC", () => {
    // Ingestão às 23h em Salvador é gravada no dia seguinte em UTC. Datar o
    // arquivo pelo UTC anunciaria um recorte que ainda não existia.
    expect(dataBahia("2026-09-02T02:00:00.000Z")).toBe("2026-09-01");
    expect(dataBahia("2026-09-02T03:00:00.000Z")).toBe("2026-09-02");
    expect(nomeArquivoPdf("federal", "2026-09-02T02:00:00.000Z")).toBe(
      "SIV-painel-federal-2026-09-01",
    );
  });

  it("os dois cargos nunca colidem no mesmo recorte", () => {
    const nomes = CARGOS.map((c) => nomeArquivoPdf(c, bruto.geradoEm));
    expect(new Set(nomes).size).toBe(CARGOS.length);
  });

  it("só usa caracteres seguros para nome de arquivo", () => {
    for (const c of CARGOS) {
      expect(nomeArquivoPdf(c, bruto.geradoEm)).toMatch(/^[A-Za-z0-9._-]+$/);
    }
  });

  it("recusa marca de tempo inválida em vez de datar errado", () => {
    expect(() => nomeArquivoPdf("estadual", "não é data")).toThrow(/inválida/);
    expect(() => dataHoraBahia("")).toThrow(/inválida/);
  });
});

describe("carimbos legíveis do documento", () => {
  it("data e hora em pt-BR, no fuso da Bahia", () => {
    // 12:38 UTC = 09:38 em Salvador.
    expect(dataHoraBahia("2026-09-02T12:38:28.140Z")).toMatch(/02\/09\/2026/);
    expect(dataHoraBahia("2026-09-02T12:38:28.140Z")).toMatch(/09:38/);
  });

  it("título nomeia o cargo por extenso", () => {
    expect(tituloImpressao("estadual")).toContain("Deputado Estadual");
    expect(tituloImpressao("federal")).toContain("Deputado Federal");
  });
});

describe("rótulo curto do cargo", () => {
  it("é o rótulo longo sem o cargo genérico", () => {
    for (const c of CARGOS) {
      expect(ROTULO_CARGO_CURTO[c]).toBe(ROTULO_CARGO[c].replace("Deputado ", ""));
    }
  });

  it("nunca chama o federal de estadual", () => {
    // O diagnóstico e o drawer cravavam "Cobertura estadual" e exibiam esse
    // rótulo sobre os números do federal, ao lado do KPI que dizia
    // "Cobertura · Federal". Duas etiquetas para a mesma figura é leitura
    // errada garantida — e agora vai para dentro do PDF exportado.
    expect(ROTULO_CARGO_CURTO.federal).toBe("Federal");
    expect(ROTULO_CARGO_CURTO.federal.toLowerCase()).not.toContain("estadual");
    expect(new Set(Object.values(ROTULO_CARGO_CURTO)).size).toBe(CARGOS.length);
  });
});
