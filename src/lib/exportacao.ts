/**
 * Carimbos de origem do PDF exportado pelo painel.
 *
 * O "download em PDF" do SIV é a impressão do navegador com folha de estilo
 * própria: saída vetorial, texto selecionável, mapa nítido em qualquer zoom e
 * nenhuma dependência nova no bundle. O navegador sugere `document.title`
 * como nome do arquivo, então o nome do PDF é uma string desta função — não
 * um cabeçalho HTTP nem um Blob.
 */
import { ROTULO_CARGO, type Cargo } from "./tipos";

/**
 * Fuso do documento.
 *
 * A Bahia é UTC-3 fixo desde o fim do horário de verão (2019), mas nomear o
 * fuso em vez de cravar o deslocamento mantém a conta certa se isso voltar a
 * mudar. Importa porque `geradoEm` é gravado em UTC: uma ingestão às 23h em
 * Salvador é registrada no dia seguinte, e um PDF datado de amanhã seria lido
 * como recorte que não existe.
 */
const FUSO = "America/Bahia";

function instante(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`marca de tempo inválida: ${iso}`);
  }
  return d;
}

/** Data de uma marca ISO no fuso da Bahia, em AAAA-MM-DD. */
export function dataBahia(iso: string): string {
  // en-CA entrega AAAA-MM-DD, que é a forma que ordena certo em nome de arquivo.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante(iso));
}

/** "02/09/2026, 09:38" — carimbo legível para o cabeçalho impresso. */
export function dataHoraBahia(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instante(iso));
}

/**
 * Nome sugerido do PDF.
 *
 * Carrega a data do DADO (`geradoEm`), não a do clique. Dois exportes do mesmo
 * recorte em dias diferentes têm que produzir o mesmo arquivo, e quem recebe o
 * PDF precisa saber de quando é o número — não de quando alguém apertou o
 * botão. O cargo entra no nome porque cada exportação é de um cargo só, e dois
 * arquivos chamados "SIV-painel" na mesma pasta são indistinguíveis.
 */
export function nomeArquivoPdf(cargo: Cargo, geradoEm: string): string {
  return `SIV-painel-${cargo}-${dataBahia(geradoEm)}`;
}

/** Título do documento impresso, por extenso. */
export function tituloImpressao(cargo: Cargo): string {
  return `SIV · Intenção de voto — ${ROTULO_CARGO[cargo]}`;
}
