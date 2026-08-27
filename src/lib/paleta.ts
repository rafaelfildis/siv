/**
 * Paleta do SIV.
 *
 * As cores dos candidatos reproduzem as já usadas na planilha (a equipe lê a
 * base com esse código de cor há semanas), mas em passos validados: a tripla
 * passa nos seis testes do validador — banda de luminosidade, piso de croma,
 * separação para daltonismo (ΔE 9,1 protan no pior par) e piso de visão normal
 * (ΔE 22,9) — no modo claro, com todos os pares em jogo.
 *
 * O aviso de contraste (<3:1 contra a superfície) é resolvido com rótulo
 * direto em toda barra e a tabela de dados no rodapé; nunca cor sozinha.
 */
export const CORES_CANDIDATO: Record<string, string> = {
  "Fabíola Mansur": "#1baf7a", // verde na planilha
  "Jorge Solla": "#2a78d6", // azul na planilha
  "Lucas Reis": "#eda100", // amarelo na planilha
  "Não sei": "#8b93a3", // cinza — não é candidato, é ausência de escolha
};

export const COR_PADRAO = "#5c6b85";

export function corDe(candidato: string): string {
  return CORES_CANDIDATO[candidato] ?? COR_PADRAO;
}

/**
 * Rampa sequencial de 5 passos, uma única matiz, clara -> escura.
 * Serve à magnitude no mapa. Nunca usar rampa arco-íris aqui.
 */
export function rampa(base: string): string[] {
  const rampas: Record<string, string[]> = {
    "#1baf7a": ["#e6f6f0", "#a8e3cd", "#5cc9a3", "#1baf7a", "#0d7a53"],
    "#2a78d6": ["#e6eefb", "#b0cbf0", "#6a9ee4", "#2a78d6", "#17508f"],
    "#eda100": ["#fdf3dd", "#f7dc9b", "#f2c14e", "#eda100", "#9c6a00"],
    "#8b93a3": ["#eef0f4", "#cfd4dd", "#adb4c1", "#8b93a3", "#5c6373"],
  };
  return (
    rampas[base] ?? ["#e8eef6", "#c3d3e7", "#8aa8cd", "#3f6ba8", "#0f2545"]
  );
}

/** Rampa institucional (navy), usada quando não há candidato filtrado. */
export const RAMPA_NEUTRA = ["#e8eef6", "#c3d3e7", "#8aa8cd", "#3f6ba8", "#0f2545"];
