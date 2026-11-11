export function themeEffects(svg, chart) {
  const d = chart._design,
    id = chart.id,
    theme = chart._theme;
  if (!d) return svg;
  let defs = "";
  if (
    !chart.transparent &&
    ["gradient", "dark-gradient"].includes(d.backgroundEffect)
  ) {
    const end =
      d.backgroundEffect === "dark-gradient" ? "#34264f" : theme.colors[1];
    defs += `<linearGradient id="theme-bg-${id}" x2="1" y2="1"><stop stop-color="${chart.background}"/><stop offset="1" stop-color="${end}" stop-opacity="${d.backgroundEffect === "dark-gradient" ? 1 : 0.2}"/></linearGradient>`;
    svg = svg.replace(
      /(data-chart-background="true"[^>]*fill=")[^"]+"/,
      `$1url(#theme-bg-${id})"`,
    );
  }
  if (["soft", "raised", "hard"].includes(d.shadow)) {
    const hard = d.shadow === "hard";
    defs += `<filter id="theme-shadow-${id}" x="-20%" y="-30%" width="150%" height="170%"><feDropShadow dx="${hard ? 5 : 0}" dy="${hard ? 5 : 4}" stdDeviation="${hard ? 0 : d.shadow === "raised" ? 9 : 5}" flood-color="${chart.textColor}" flood-opacity="${hard ? 0.85 : 0.13}"/></filter>`;
  }
  if (d.shadow === "glow") {
    defs += `<filter id="theme-glow-${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    svg = svg.replace(
      /class="chart-series-line"/g,
      `class="chart-series-line" filter="url(#theme-glow-${id})"`,
    );
  }
  if (d.style === "pixel")
    svg = svg.replace("<svg ", '<svg shape-rendering="crispEdges" ');
  if (d.backgroundEffect === "paper" && !chart.transparent) {
    defs += `<pattern id="theme-paper-${id}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="${chart.textColor}" opacity=".07"/></pattern>`;
    svg = svg.replace(
      /(<rect data-chart-background="true"[^>]*\/>)/,
      `$1<rect width="100%" height="100%" fill="url(#theme-paper-${id})"/>`,
    );
  }
  return defs ? svg.replace("</svg>", `<defs>${defs}</defs></svg>`) : svg;
}
