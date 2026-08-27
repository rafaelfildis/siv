import { formatarNumero, formatarPct } from "@/lib/consultas";

type Props = {
  equipe: number;
  respostas: number;
  cobertura: number;
  municipiosComEquipe: number;
  municipiosComResposta: number;
  semMunicipio: number;
};

/**
 * Faixa de indicadores. Números-herói grandes, rótulo acima, contexto abaixo —
 * o gestor lê a linha inteira num relance, sem precisar de gráfico.
 */
export default function Indicadores(p: Props) {
  const cartoes = [
    {
      rotulo: "Equipe mapeada",
      valor: formatarNumero(p.equipe),
      contexto: `${formatarNumero(p.semMunicipio)} sem município informado`,
      alerta: p.semMunicipio > p.equipe * 0.2,
    },
    {
      rotulo: "Intenções declaradas",
      valor: formatarNumero(p.respostas),
      contexto: `${formatarNumero(p.equipe - p.respostas)} ainda sem resposta`,
      alerta: false,
    },
    {
      rotulo: "Cobertura",
      valor: formatarPct(p.cobertura),
      contexto: "da equipe já respondeu",
      alerta: p.cobertura < 0.5,
    },
    {
      rotulo: "Municípios alcançados",
      valor: `${p.municipiosComResposta}`,
      contexto: `de ${p.municipiosComEquipe} com equipe`,
      alerta: p.municipiosComResposta < p.municipiosComEquipe / 2,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cartoes.map((c) => (
        <div key={c.rotulo} className="cartao px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-ardosia-400">
            {c.rotulo}
          </div>
          <div className="numerico mt-1 text-3xl font-semibold text-navy-800">
            {c.valor}
          </div>
          <div
            className={`mt-0.5 text-xs ${c.alerta ? "font-medium text-[#b45309]" : "text-ardosia"}`}
          >
            {c.contexto}
          </div>
        </div>
      ))}
    </div>
  );
}
