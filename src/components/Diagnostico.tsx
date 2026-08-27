import {
  numero,
  pontosPct,
  razaoPct,
  TOTAL_MUNICIPIOS_BA,
  type Modelo,
} from "@/lib/consultas";
import { ROTULO_CARGO } from "@/lib/tipos";

const CORES_CANDIDATO: Record<string, string> = {
  "Fabíola Mansur": "#0F7A55",
  "Jorge Solla": "#1A5FCB",
  "Lucas Reis": "#9A5308",
  "Não sei": "#98A2B3",
  // "OUTROS" e "Não sei" são ambos ausência de escolha nominal: neutros, e
  // distintos entre si para não colapsarem numa barra só.
  OUTROS: "#5B6472",
};
const corDe = (c: string) => CORES_CANDIDATO[c] ?? "#5B6472";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border px-4 py-[13px] last:border-b-0">
      <h3 className="rot mb-2">{titulo}</h3>
      {children}
    </div>
  );
}

/**
 * Diagnóstico territorial: os cinco blocos que respondem "o que estes números
 * significam". Cada percentual vem acompanhado do tamanho da amostra — regra
 * inviolável §1 do handoff.
 */
export default function Diagnostico({ modelo }: { modelo: Modelo }) {
  const { intencoes, respostas } = modelo;

  return (
    <section className="card">
      <Bloco titulo={`Intenção declarada · ${ROTULO_CARGO[modelo.cargo]}`}>
        {respostas === 0 ? (
          <p className="text-[12.5px] leading-snug text-text-2">
            Nenhuma intenção declarada registrada para{" "}
            {ROTULO_CARGO[modelo.cargo]} nesta importação.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5">
              {intencoes.map((i) => (
                <li key={i.candidato}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13.5px] font-medium">{i.candidato}</span>
                    <span className="num text-sm font-semibold">
                      {razaoPct(i.qtd, respostas, 0)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-[3px] bg-surface-3">
                    <div
                      className="h-full rounded-[3px]"
                      style={{
                        width: `${(i.qtd / respostas) * 100}%`,
                        background: corDe(i.candidato),
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-text-3">
                    {i.qtd} de {respostas} respostas
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Bloco>

      <Bloco titulo="Cobertura estadual">
        <div className="flex items-baseline gap-2">
          <span className="num text-2xl font-semibold text-navy">
            {pontosPct(modelo.coberturaPontos)}
          </span>
          <span className="text-[12.5px] text-text-2">{modelo.rotuloCobertura}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-[3px] bg-surface-3">
          <div
            className="h-full rounded-[3px] bg-navy-700"
            style={{ width: `${Math.max(modelo.coberturaPontos, 0.8)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-text-2">
          {modelo.respostas} de {numero(modelo.equipeTotal)} integrantes responderam ·{" "}
          {numero(modelo.equipeTotal - modelo.respostas)} ainda sem resposta
        </p>
      </Bloco>

      <Bloco titulo="Concentração territorial">
        <p className="num text-2xl font-semibold text-navy">
          {modelo.comDados.length}
          <span className="text-base font-medium text-text-3">
            {" "}
            de {TOTAL_MUNICIPIOS_BA}
          </span>
        </p>
        <p className="mt-1 text-[11.5px] text-text-2">municípios com respostas</p>
        {modelo.maiorConcentracao && (
          <p className="mt-2 text-[12.5px] leading-snug text-text-2">
            <b className="font-semibold text-text">
              {razaoPct(
                modelo.maiorConcentracao.respostas,
                modelo.respostas,
                0,
              )}
            </b>{" "}
            das respostas vêm de um único município (
            {modelo.maiorConcentracao.nome}). A leitura atual não representa o
            interior do estado.
          </p>
        )}
      </Bloco>

      <Bloco titulo="Lacuna de informação">
        <p className="text-[12.5px] leading-snug text-text-2">
          <b className="font-semibold text-text">
            {numero(modelo.integrantesSemResposta)}
          </b>{" "}
          integrantes sem nenhuma resposta em{" "}
          <b className="font-semibold text-text">{modelo.semResposta.length}</b>{" "}
          localidades.
        </p>
        <p className="mt-2 text-[11.5px] leading-snug text-text-3">
          Municípios sem equipe identificada (
          {numero(TOTAL_MUNICIPIOS_BA - modelo.naBahia.filter((l) => l.equipe > 0).length)}
          ) não são lacuna de coleta: são ausência de presença registrada.
        </p>
      </Bloco>

      <Bloco titulo="Fora do escopo territorial">
        <ul className="flex flex-col gap-1.5 text-[12.5px]">
          <li className="flex justify-between gap-3">
            <span className="text-text-2">Sem município informado</span>
            <span className="num font-medium">{numero(modelo.semMunicipio)}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span className="text-text-2">Respostas sem município</span>
            <span className="num font-medium">{modelo.respostasSemMunicipio}</span>
          </li>
          {modelo.foraDaBahia.map((l) => (
            <li key={l.nome} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-text-2">
                {l.nome}
                <span className="badge bd-fora">fora da BA</span>
              </span>
              <span className="num font-medium">{l.equipe}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[11.5px] leading-snug text-text-3">
          Contam na cobertura estadual, mas não podem ser localizados no mapa.
        </p>
      </Bloco>
    </section>
  );
}

export { corDe };
