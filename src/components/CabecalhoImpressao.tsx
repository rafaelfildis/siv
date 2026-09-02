import { dataHoraBahia } from "@/lib/exportacao";
import type { Modelo } from "@/lib/consultas";
import { ROTULO_CARGO, type Cargo, type Dataset } from "@/lib/tipos";

/**
 * Cabeçalho e rodapé que existem apenas no PDF.
 *
 * Na tela, o cargo está no seletor e a origem da base foi removida do rodapé
 * por não ser consultada (commit 667ff92). No papel, os dois voltam: o PDF
 * circula fora do sistema, e um número de intenção de voto sem o cargo, sem o
 * tamanho da amostra e sem a data do recorte é um número que vai ser lido
 * errado. É a mesma regra do handoff — todo percentual acompanhado da amostra
 * — aplicada ao documento inteiro.
 */
export function CabecalhoImpressao({
  cargo,
  modelo,
  dataset,
}: {
  cargo: Cargo;
  modelo: Modelo;
  dataset: Dataset;
}) {
  return (
    <header className="apenas-impressao bloco-impressao">
      <div className="ci-topo">
        <div>
          <p className="ci-marca">SIV · Sistema de Intenção de Voto</p>
          <h1 className="ci-titulo">Intenção de voto — {ROTULO_CARGO[cargo]}</h1>
        </div>
        <p className="ci-escopo">
          Bahia · Eleições 2026
          <span>painel interno de coordenação</span>
        </p>
      </div>

      <dl className="ci-dados">
        <div>
          <dt>Cobertura</dt>
          <dd>
            <b className="num">{modelo.coberturaPontos.toFixed(1).replace(".", ",")}%</b>{" "}
            · {modelo.rotuloCobertura}
          </dd>
        </div>
        <div>
          <dt>Amostra</dt>
          <dd>
            <b className="num">{modelo.respostas}</b> de{" "}
            <span className="num">{modelo.equipeTotal}</span> integrantes
          </dd>
        </div>
        <div>
          <dt>Municípios com respostas</dt>
          <dd>
            <b className="num">{modelo.comDados.length}</b> na Bahia ·{" "}
            <span className="num">{modelo.semResposta.length}</span> com equipe e
            nenhuma resposta
          </dd>
        </div>
        <div>
          <dt>Base</dt>
          <dd>
            {dataset.fonte} · agregada em {dataHoraBahia(dataset.geradoEm)}
          </dd>
        </div>
      </dl>
    </header>
  );
}

export function RodapeImpressao({ dataset }: { dataset: Dataset }) {
  return (
    <footer className="apenas-impressao bloco-impressao ri">
      <p>
        <b>Documento interno de coordenação.</b> Contém dados agregados de intenção
        de voto e não deve ser distribuído fora da equipe. Nenhum registro
        individual é identificável: municípios com menos de{" "}
        <span className="num">{dataset.limiarSupressao}</span> respostas têm a
        distribuição por candidato suprimida.
      </p>
      <p>
        Percentuais calculados sobre as respostas lançadas. Registros de fora da
        Bahia entram nos totais e não aparecem no mapa. Malha municipal IBGE.
      </p>
    </footer>
  );
}
