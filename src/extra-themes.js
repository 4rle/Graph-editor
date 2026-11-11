// Each preset records all six composable theme components.
const groups = [
  [
    "ミニマル",
    [
      "Flat Design",
      "Flat 2.0",
      "Minimalism",
      "Material Design",
      "Soft UI",
      "Outline Design",
    ],
  ],
  [
    "やわらか",
    [
      "Kawaii Minimal",
      "Scandinavian",
      "Organic Design",
      "Rounded Modern",
      "Candy Color",
    ],
  ],
  [
    "モダン",
    [
      "Glassmorphism",
      "Neumorphism",
      "Gradient Modern",
      "Aurora Design",
      "Cyberpunk",
      "Bento Design",
      "Neo-Brutalism",
    ],
  ],
  [
    "科学・学術",
    [
      "Technical Drawing",
      "Mathematical Clean",
      "Laboratory Modern",
      "Grayscale Scientific",
      "Data-Centric",
    ],
  ],
  [
    "エディトリアル",
    [
      "Luxury Minimal",
      "Art Deco",
      "Modern Classic",
      "Corporate Modern",
      "Premium Dark",
      "Typography First",
    ],
  ],
  [
    "個性的",
    [
      "Retro Modern",
      "Mid-Century Modern",
      "Memphis Design",
      "Risograph",
      "Pixel Design",
      "Hand-Drawn",
      "Comic Style",
    ],
  ],
];
const palettes = [
  ["#375a7a", "#dc8a55", "#729c85", "#af7b9b", "#a2a55a"],
  ["#ce91ac", "#a49ed1", "#84b6b0", "#d6b477", "#9eb2ca"],
  ["#88d8cf", "#dba4cf", "#b5c8e8", "#edcb86", "#9cceb2"],
  ["#222222", "#666666", "#aaaaaa", "#444444", "#cccccc"],
  ["#a97d46", "#42616e", "#8b6b72", "#80967b", "#c8ad78"],
  ["#c65a45", "#e4b452", "#4f878f", "#7c658a", "#8d9d67"],
];
export const extraThemes = groups.flatMap(([category, names], g) =>
  names.map((name, i) => {
    const dark = /Dark|Cyberpunk|Aurora/.test(name),
      soft = g === 1,
      outline = /Outline|Technical|Comic|Brutalism/.test(name);
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      category,
      bg: dark ? "#1c1c22" : soft ? "#fdf8f5" : "#ffffff",
      fg: dark ? "#eeeeee" : "#303036",
      muted: dark ? "#aaaaaa" : "#777777",
      grid: dark ? "#414149" : soft ? "#eee3e5" : "#e7e7e7",
      colors: palettes[g],
      font:
        g === 4
          ? "serif"
          : /Pixel|Technical/.test(name)
            ? "monospace"
            : "sans-serif",
      style: outline
        ? "outline"
        : /Glass|Neumorphism/.test(name)
          ? "soft"
          : "flat",
      lineWidth: outline ? 3 : 2,
      pointSize: soft ? 5 : 3,
      layout: g === 4 ? "spacious" : "standard",
      elements: g === 3 ? "scientific" : "standard",
      background: dark ? "dark" : soft ? "warm" : "white",
      usage: g === 3 ? "論文" : g === 1 ? "教育" : g === 4 ? "発表" : "一般",
    };
  }),
);
