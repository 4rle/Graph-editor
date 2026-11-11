import { extraThemes } from "./extra-themes.js";
export function themeEffects(svg, chart) {
  const id = String(chart.id || "chart").replace(/[^a-zA-Z0-9_-]/g, ""),
    name = chart.theme || "",
    style =
      chart.themeTokens?.style || extraThemes.find((t) => t.id === name)?.style;
  let defs = "";
  if (/gradient|aurora|glass/.test(name)) {
    defs += `<linearGradient id="theme-bg-${id}" x2="1" y2="1"><stop stop-color="${chart.background || (/aurora/.test(name) ? "#1c1c22" : "#edf0f8")}"/><stop offset="1" stop-color="${/aurora/.test(name) ? "#3b315b" : "#f5e9f0"}"/></linearGradient>`;
    svg = svg.replace(
      /(<rect\b[^>]*)(fill="[^\"]*")/,
      `$1fill="url(#theme-bg-${id})"`,
    );
  }
  if (/glass|neumorphism|flat-2|soft-ui/.test(name) || style === "soft") {
    defs += `<filter id="theme-shadow-${id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#777777" flood-opacity="0.15"/></filter>`;
    svg = svg.replace(
      /(<path\b[^>]*stroke-width="[^\"]*"[^>]*)(\/>)/g,
      `$1 filter="url(#theme-shadow-${id})"$2`,
    );
  }
  if (/outline|brutalism|comic|technical/.test(name) || style === "outline")
    svg = svg.replace(/stroke-linecap="round"/g, 'stroke-linecap="square"');
  if (/pixel/.test(name))
    svg = svg.replace("<svg ", '<svg shape-rendering="crispEdges" ');
  if (/rounded|kawaii|pastel|soft-ui/.test(name))
    svg = svg.replace(/<rect width=/, '<rect rx="14" width=');
  if (/hand-drawn|risograph/.test(name)) {
    defs += `<filter id="theme-texture-${id}"><feTurbulence baseFrequency="0.9" numOctaves="2" seed="7" result="noise"/><feComposite in="SourceGraphic" in2="noise" operator="in"/></filter>`;
    svg = svg.replace(
      /(<path\b[^>]*stroke-width="[^\"]*"[^>]*)(\/>)/g,
      `$1 opacity="0.88"$2`,
    );
  }
  return defs ? svg.replace("</svg>", `<defs>${defs}</defs></svg>`) : svg;
}
