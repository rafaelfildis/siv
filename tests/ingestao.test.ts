import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { lerPlanilha } from "../scripts/ingerir";

/**
 * Monta uma planilha com a MESMA estrutura da MAPEAMENTO.xlsx real
 * (cabeçalho na linha 4, dados a partir da 5, linhas-âncora no fim),
 * mas com nomes fictícios. A planilha real nunca entra no repositório.
 */
async function planilhaDeTeste(
  linhas: Array<(string | number | null)[]>,
  opcoes: { cabecalho?: string[]; aba?: string } = {},
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opcoes.aba ?? "Mapeamento");
  ws.getRow(1).getCell(1).value = "MAPEAMENTO DE INTENÇÃO - BASE SIV";
  const cabecalho = opcoes.cabecalho ?? [
    "Nº",
    "Nome do Profissional",
    "Núcleo / Time",
    "Município",
    "INTENÇÃO DE VOTO ESTADUAL",
    "INTENÇÃO DE VOTO FEDERAL",
    "Observações",
  ];
  cabecalho.forEach((v, i) => (ws.getRow(4).getCell(i + 1).value = v));
  linhas.forEach((linha, n) =>
    linha.forEach((v, i) => (ws.getRow(5 + n).getCell(i + 1).value = v)),
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const ANCORA = "LINHA DE REFERÊNCIA DO FILTRO — não é profissional";

describe("lerPlanilha", () => {
  it("lê as linhas de profissionais", async () => {
    const buffer = await planilhaDeTeste([
      [1, "Fulano", "DEV", "Salvador", "Candidata Fabíola Mansur", null, null],
      [2, "Beltrana", "AGHUSE", "Jequié", null, "Candidato Jorge Solla", null],
    ]);
    const { linhas, lidas, rejeitadas, ancoras } = await lerPlanilha(buffer);
    expect(lidas).toBe(2);
    expect(linhas).toHaveLength(2);
    expect(rejeitadas).toBe(0);
    expect(ancoras).toBe(0);
    expect(linhas[0].municipio).toBe("Salvador");
    expect(linhas[1].intencaoFederal).toBe("Candidato Jorge Solla");
  });

  it("NÃO conta os votos das linhas-âncora de filtro", async () => {
    // Este é o erro silencioso mais caro da base: as três linhas-âncora
    // carregam votos de exemplo que inflariam a apuração em 3 votos.
    const buffer = await planilhaDeTeste([
      [1, "Fulano", "DEV", "Salvador", "Candidata Fabíola Mansur", null, null],
      ["—", ANCORA, null, null, "Candidata Fabíola Mansur", "Candidato Lucas Reis", null],
      ["—", ANCORA, null, null, "Não sei", "Candidato Jorge Solla", null],
      ["—", ANCORA, null, null, null, "Não sei", null],
    ]);
    const { linhas, lidas, ancoras, rejeitadas, avisos } = await lerPlanilha(buffer);
    expect(lidas).toBe(4);
    expect(ancoras).toBe(3);
    expect(rejeitadas).toBe(0); // âncora não é erro de qualidade
    expect(linhas).toHaveLength(1);
    expect(linhas[0].intencaoEstadual).toBe("Candidata Fabíola Mansur");
    expect(avisos.join(" ")).toContain("âncora");
  });

  it("rejeita linha sem nome em vez de aceitá-la como profissional", async () => {
    const buffer = await planilhaDeTeste([
      [1, "Fulano", "DEV", "Salvador", null, null, null],
      [2, null, "DEV", "Salvador", "Candidata Fabíola Mansur", null, null],
    ]);
    const { linhas, rejeitadas, avisos } = await lerPlanilha(buffer);
    expect(linhas).toHaveLength(1);
    expect(rejeitadas).toBe(1);
    expect(avisos[0]).toContain("Linha 6");
  });

  it("não vaza nome de pessoa na mensagem de rejeição", async () => {
    const buffer = await planilhaDeTeste([
      ["não é número", "Sicrano Confidencial", "DEV", "Salvador", null, null, null],
    ]);
    const { avisos } = await lerPlanilha(buffer);
    expect(avisos.join(" ")).not.toContain("Sicrano");
  });

  it("ignora linhas em branco no meio da tabela", async () => {
    const buffer = await planilhaDeTeste([
      [1, "Fulano", "DEV", "Salvador", null, null, null],
      [null, null, null, null, null, null, null],
      [2, "Beltrana", "DEV", "Salvador", null, null, null],
    ]);
    const { lidas, linhas } = await lerPlanilha(buffer);
    expect(lidas).toBe(2);
    expect(linhas).toHaveLength(2);
  });

  it("aborta quando o cabeçalho muda de formato", async () => {
    const buffer = await planilhaDeTeste(
      [[1, "Fulano", "DEV", "Salvador", null, null, null]],
      { cabecalho: ["Nº", "Nome", "Time", "Cidade", "EST", "FED", "Obs"] },
    );
    await expect(lerPlanilha(buffer)).rejects.toThrow(/cabeçalho divergente/i);
  });

  it("aborta quando a aba esperada não existe", async () => {
    const buffer = await planilhaDeTeste([], { aba: "Outra" });
    await expect(lerPlanilha(buffer)).rejects.toThrow(/não encontrada/i);
  });
});
