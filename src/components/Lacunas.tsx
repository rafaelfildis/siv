import type { LinhaMunicipio } from "@/lib/consultas";

/**
 * Onde há equipe e nenhuma resposta. É a lista de trabalho da coordenação:
 * o painel não serve só para mostrar o que já foi conquistado, mas para
 * apontar o que ainda não foi tocado.
 */
export default function Lacunas({ linhas }: { linhas: LinhaMunicipio[] }) {
  if (linhas.length === 0) {
    return (
      <p className="text-sm text-ardosia-400">
        Todos os municípios com equipe já têm ao menos uma resposta.
      </p>
    );
  }
  const totalPessoas = linhas.reduce((a, l) => a + l.equipe, 0);

  return (
    <>
      <p className="mb-3 text-sm text-ardosia">
        <strong className="numerico font-semibold text-navy-800">{totalPessoas}</strong>{" "}
        profissionais em{" "}
        <strong className="numerico font-semibold text-navy-800">{linhas.length}</strong>{" "}
        municípios ainda não deram nenhuma resposta.
      </p>
      <ul className="space-y-1.5">
        {linhas.map((l) => (
          <li
            key={l.codIbge ?? l.nome}
            className="flex items-center justify-between gap-3 rounded-md bg-fundo px-2.5 py-1.5 text-sm"
          >
            <span className="flex items-center gap-1.5 text-tinta">
              {l.nome}
              {l.foraDaMalha && (
                <span
                  title="Não é município da Bahia — não aparece no mapa"
                  className="rounded bg-linha px-1 text-[10px] text-ardosia"
                >
                  fora da BA
                </span>
              )}
            </span>
            <span className="numerico shrink-0 text-xs text-ardosia">
              {l.equipe} {l.equipe === 1 ? "pessoa" : "pessoas"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
