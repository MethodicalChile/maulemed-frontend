// src/composables/useChartTheme.js
//
// Chart.js recibe sus colores en JavaScript, así que no se entera del cambio de
// tema por sí solo: sin esto, alternar a oscuro deja los ejes y las etiquetas en
// gris claro sobre fondo oscuro. Aquí se observa la clase `.dark` del documento
// —que es lo que escribe useTheme— y se reexponen los colores como refs, de modo
// que los gráficos se repintan al alternar.
//
// La paleta es la de referencia del método de visualización, validada contra las
// superficies reales de esta app (--color-card: #FFFFFF claro, #1E293B oscuro):
// peor par adyacente CVD ΔE 9.1 claro / 8.4 oscuro sobre un objetivo de 8, y
// 19.6 / 19.3 en visión normal sobre un piso de 15.
//
// El azul de marca (#0A5FB5) NO se usa para series: es el color del cromo de la
// interfaz. Mezclarlo con los datos haría que un botón y una serie signifiquen
// lo mismo.
import { ref, onMounted, onUnmounted, readonly } from "vue";

// Categórica: para cuando las series SON el tema (distinguir unas de otras).
const CATEGORICAL_LIGHT = [
  "#2a78d6", // azul
  "#eb6834", // naranja
  "#1baf7a", // aqua
  "#eda100", // amarillo
  "#e87ba4", // magenta
  "#008300", // verde
];
const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
];

// Secuencial: una sola tonalidad, claro → oscuro. Para magnitud y para escalas
// ordenadas como los tramos de antigüedad, donde el orden ES la información.
const SEQUENTIAL_LIGHT = [
  "#c3dcf6",
  "#93bff0",
  "#5b9ce4",
  "#2a78d6",
  "#1b5aa6",
  "#123f76",
];
const SEQUENTIAL_DARK = [
  "#1b3a5c",
  "#215688",
  "#2a72b8",
  "#3987e5",
  "#69a8ec",
  "#9cc6f3",
];

// Estado: reservada. Nunca se reutiliza para "serie 4", y siempre viaja con
// etiqueta, jamás color solo.
const STATUS_LIGHT = {
  good: "#1baf7a",
  warning: "#eda100",
  serious: "#eb6834",
  critical: "#e34948",
  neutral: "#94a3b8",
};
const STATUS_DARK = {
  good: "#199e70",
  warning: "#c98500",
  serious: "#d95926",
  critical: "#e66767",
  neutral: "#64748b",
};

function isDark() {
  return document.documentElement.classList.contains("dark");
}

function readToken(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function buildTheme() {
  const dark = isDark();

  return {
    dark,
    categorical: dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT,
    sequential: dark ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT,
    status: dark ? STATUS_DARK : STATUS_LIGHT,
    surface: readToken("--color-card", dark ? "#1E293B" : "#FFFFFF"),
    text: readToken("--color-foreground", dark ? "#F8FAFC" : "#0F172A"),
    // La tinta secundaria lleva los ejes y las etiquetas. Los números nunca
    // van del color de su serie: el color lo carga la marca, no el texto.
    muted: dark ? "#94A3B8" : "#64748B",
    // Rejilla apenas visible y continua. Punteada añade ruido y se lee como
    // si el dato fuera provisional.
    grid: dark ? "rgba(148,163,184,0.16)" : "rgba(100,116,139,0.14)",
    border: readToken("--color-border", dark ? "#475569" : "#CBD5E1"),
  };
}

/**
 * Devuelve el tema de los gráficos y lo mantiene al día con el toggle.
 */
export function useChartTheme() {
  const theme = ref(buildTheme());
  let observer = null;

  function refresh() {
    theme.value = buildTheme();
  }

  onMounted(() => {
    observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });

  onUnmounted(() => observer?.disconnect());

  return { theme: readonly(theme), refresh };
}

/**
 * Opciones comunes: rejilla fina y continua, sin borde de eje, tooltip con la
 * superficie de la tarjeta. Se llama desde cada gráfico con el tema vigente.
 */
export function baseChartOptions(theme, { currency = false } = {}) {
  const fmt = (value) =>
    currency
      ? new Intl.NumberFormat("es-CL", {
          style: "currency",
          currency: "CLP",
          maximumFractionDigits: 0,
        }).format(value)
      : new Intl.NumberFormat("es-CL").format(value);

  return {
    responsive: true,
    maintainAspectRatio: false,
    // Se apaga la leyenda propia de Chart.js: la dibuja ChartCard en HTML, que
    // permite hacerla accesible y ponerla donde corresponde.
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.surface,
        titleColor: theme.text,
        bodyColor: theme.muted,
        borderColor: theme.border,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
        callbacks: {
          label: (ctx) => {
            const valor = ctx.parsed.y ?? ctx.parsed.x ?? ctx.parsed;
            return ` ${ctx.dataset.label ?? ctx.label}: ${fmt(valor)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        border: { display: false },
        ticks: { color: theme.muted, font: { size: 11 } },
      },
      y: {
        grid: { color: theme.grid, drawBorder: false, drawTicks: false },
        border: { display: false },
        ticks: {
          color: theme.muted,
          font: { size: 11 },
          padding: 8,
          callback: (value) => compact(value, currency),
        },
      },
    },
  };
}

/** 1.2M en vez de 1.200.000: los ejes se leen mejor abreviados. */
export function compact(value, currency = false) {
  const n = Number(value);
  const abs = Math.abs(n);
  const signo = currency ? "$" : "";

  if (abs >= 1_000_000_000) return `${signo}${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${signo}${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${signo}${Math.round(n / 1_000)}K`;
  return `${signo}${n}`;
}

export function money(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function number(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-CL").format(value);
}
