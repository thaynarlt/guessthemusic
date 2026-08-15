/**
 * Ícone da camada de frequência: seis barras de um equalizador, com a barra
 * daquela faixa destacada. Nenhum ícone genérico de biblioteca comunica
 * "esta fatia do espectro", então este é desenhado no mesmo traço do Lucide
 * (24x24, stroke 2, currentColor).
 */
export function SpectrumIcon({ index, size = 22 }: { index: number; size?: number }) {
  // Alturas crescentes: sugerem graves largos a esquerda e agudos a direita.
  const heights = [6, 9, 12, 15, 18, 21];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      {heights.map((height, i) => (
        <line
          key={i}
          x1={2.5 + i * 3.8}
          x2={2.5 + i * 3.8}
          y1={22 - height}
          y2={22}
          opacity={i === index ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}
