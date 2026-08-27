import {
  numero,
  pontosPct,
  TOTAL_MUNICIPIOS_BA,
  type Modelo,
} from "@/lib/consultas";
import { ROTULO_CARGO } from "@/lib/tipos";

/**
 * Cinco indicadores executivos. O quinto é de atenção (variante âmbar): ele
 * responde "onde a coleta não andou", que é a única pergunta desta faixa que
 * pede ação imediata.
 */
export default function Kpis({ modelo }: { modelo: Modelo }) {
  const semRespostaBA = modelo.semResposta.filter((l) => !l.foraDaMalha);
  const integrantesBA = semRespostaBA.reduce((a, l) => a + l.equipe, 0);

  const cartoes = [
    {
      rotulo: "Equipe mapeada",
      valor: numero(modelo.equipeTotal),
      sub: (
        <>
          <b>{numero(modelo.equipeComMunicipio)}</b> com município ·{" "}
          <b>{numero(modelo.semMunicipio)}</b> sem informar
        </>
      ),
    },
    {
      rotulo: "Respostas recebidas",
      valor: numero(modelo.respostas),
      sub: (
        <>
          <b>{numero(modelo.equipeTotal - modelo.respostas)}</b> ainda sem resposta
        </>
      ),
    },
    {
      rotulo: `Cobertura · ${ROTULO_CARGO[modelo.cargo].replace("Deputado ", "")}`,
      valor: pontosPct(modelo.coberturaPontos),
      sub: (
        <>
          {modelo.respostas} de {numero(modelo.equipeTotal)} ·{" "}
          <b>{modelo.rotuloCobertura}</b>
        </>
      ),
    },
    {
      rotulo: "Municípios com dados",
      valor: (
        <>
          {modelo.comDados.length}
          <small className="ml-1 text-base font-medium text-text-3">
            / {TOTAL_MUNICIPIOS_BA}
          </small>
        </>
      ),
      sub: (
        <>
          {pontosPct((modelo.comDados.length / TOTAL_MUNICIPIOS_BA) * 100)} do
          território · de <b>{modelo.naBahia.filter((l) => l.equipe > 0).length}</b>{" "}
          com equipe
        </>
      ),
    },
    {
      rotulo: "Equipe sem resposta",
      valor: String(semRespostaBA.length),
      sub: (
        <>
          municípios com equipe e <b>0</b> respostas · {integrantesBA} integrantes
        </>
      ),
      atencao: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cartoes.map((c) => (
        <div
          key={c.rotulo}
          className={`card px-3.5 pb-[13px] pt-3 ${
            c.atencao ? "border-[#E6CFA8] bg-[#FEFAF2]" : ""
          }`}
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-text-3">
            {c.rotulo}
          </div>
          <div
            className={`num mt-0.5 text-[30px] font-semibold leading-none tracking-[-.02em] ${
              c.atencao ? "text-[#9A5308]" : "text-figura"
            }`}
          >
            {c.valor}
          </div>
          <div className="mt-1.5 text-xs leading-snug text-text-2 [&>b]:font-semibold [&>b]:text-text">
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
