import { evalCell, parseRef, cellRef, colName } from "./engine.js";
import { escapeXML as e } from "./objects.js";
const rel =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export function chartParts(charts, sheets) {
  const entries = [],
    overrides = [],
    drawings = new Map();
  let chartIndex = 0;
  for (const [sheetIndex, sheet] of sheets.entries()) {
    const list = charts.filter(
      (c) =>
        c.sheetId === sheet.id &&
        ["line", "bar", "stacked", "area", "scatter", "pie", "donut"].includes(
          c.type,
        ),
    );
    if (!list.length) continue;
    const anchors = [],
      relationships = [];
    for (const c of list) {
      chartIndex++;
      const refs = c.range.split(":").map(parseRef),
        a = refs[0],
        b = refs[1] || a,
        prefix = `'${sheet.name.replaceAll("'", "''")}'!`,
        series = [];
      for (let col = a.col + 1; col <= b.col; col++) {
        const index = col - a.col - 1,
          categories = Array.from(
            { length: Math.max(0, b.row - a.row) },
            (_, i) => evalCell(sheets, sheet.id, a.row + i + 1, a.col),
          ),
          values = Array.from({ length: categories.length }, (_, i) =>
            evalCell(sheets, sheet.id, a.row + i + 1, col),
          );
        const catref =
            prefix +
            `$${colName(a.col)}$${a.row + 2}:$${colName(a.col)}$${b.row + 1}`,
          valref =
            prefix +
            `$${colName(col)}$${a.row + 2}:$${colName(col)}$${b.row + 1}`,
          cache = (values) =>
            `<c:ptCount val="${values.length}"/>${values.map((v, i) => `<c:pt idx="${i}"><c:v>${e(v)}</c:v></c:pt>`).join("")}`,
          numeric = categories.every((v) => typeof v === "number");
        series.push(
          `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:v>${e(evalCell(sheets, sheet.id, a.row, col))}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${(c.colors?.[index] || ["#36856b", "#e5ad52", "#6b94b5"][index % 3]).slice(1)}"/></a:solidFill></c:spPr>${c.type === "scatter" ? `<c:xVal><c:numRef><c:f>${e(catref)}</c:f><c:numCache><c:formatCode>General</c:formatCode>${cache(categories)}</c:numCache></c:numRef></c:xVal><c:yVal>` : `<c:cat><c:${numeric ? "numRef" : "strRef"}><c:f>${e(catref)}</c:f><c:${numeric ? "numCache" : "strCache"}>${numeric ? "<c:formatCode>General</c:formatCode>" : ""}${cache(categories)}</c:${numeric ? "numCache" : "strCache"}></c:${numeric ? "numRef" : "strRef"}></c:cat><c:val>`}<c:numRef><c:f>${e(valref)}</c:f><c:numCache><c:formatCode>General</c:formatCode>${cache(values)}</c:numCache></c:numRef>${c.type === "scatter" ? "</c:yVal>" : "</c:val>"}</c:ser>`,
        );
      }
      const type =
          {
            bar: "barChart",
            stacked: "barChart",
            area: "areaChart",
            scatter: "scatterChart",
            pie: "pieChart",
            donut: "doughnutChart",
          }[c.type] || "lineChart",
        isPie = ["pie", "donut"].includes(c.type),
        axes = isPie ? "" : `<c:axId val="10"/><c:axId val="20"/>`,
        options = ["bar", "stacked"].includes(c.type)
          ? `<c:barDir val="col"/><c:grouping val="${c.type === "stacked" ? "stacked" : "clustered"}"/>`
          : c.type === "scatter"
            ? '<c:scatterStyle val="lineMarker"/>'
            : type === "lineChart"
              ? '<c:grouping val="standard"/>'
              : "";
      const title = `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="ja-JP"/><a:t>${e(c.title || "Chart")}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
      entries.push([
        `xl/charts/chart${chartIndex}.xml`,
        `<?xml version="1.0" encoding="UTF-8"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${rel}"><c:chart>${title}<c:plotArea><c:layout/><c:${type}>${options}${series.join("")}${c.type === "donut" ? '<c:holeSize val="65"/>' : ""}${axes}</c:${type}>${isPie ? "" : `<c:${c.type === "scatter" ? "valAx" : "catAx"}><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="20"/><c:crosses val="autoZero"/></c:${c.type === "scatter" ? "valAx" : "catAx"}><c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="10"/><c:crosses val="autoZero"/></c:valAx>`}</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`,
      ]);
      overrides.push(
        `<Override PartName="/xl/charts/chart${chartIndex}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
      );
      const id = relationships.length + 1;
      relationships.push(
        `<Relationship Id="rId${id}" Type="${rel}/chart" Target="../charts/chart${chartIndex}.xml"/>`,
      );
      anchors.push(
        `<xdr:twoCellAnchor><xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${(id - 1) * 18 + 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>15</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${id * 18}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="Chart ${id}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="${rel}" r:id="rId${id}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`,
      );
    }
    const n = sheetIndex + 1;
    entries.push(
      [
        `xl/drawings/drawing${n}.xml`,
        `<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors.join("")}</xdr:wsDr>`,
      ],
      [
        `xl/drawings/_rels/drawing${n}.xml.rels`,
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`,
      ],
      [
        `xl/worksheets/_rels/sheet${n}.xml.rels`,
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDrawing" Type="${rel}/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`,
      ],
    );
    overrides.push(
      `<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    );
    drawings.set(sheetIndex, '<drawing r:id="rIdDrawing"/>');
  }
  return { entries, overrides, drawings };
}
export function readExternalCharts(files, sheets) {
  const found = [];
  for (const [path, xml] of files) {
    if (!/^xl\/charts\/chart\d+\.xml$/.test(path)) continue;
    const type = /<(?:\w+:)?scatterChart/.test(xml)
      ? "scatter"
      : /<(?:\w+:)?barChart/.test(xml)
        ? "bar"
        : /<(?:\w+:)?pieChart/.test(xml)
          ? "pie"
          : /<(?:\w+:)?doughnutChart/.test(xml)
            ? "donut"
            : /<(?:\w+:)?areaChart/.test(xml)
              ? "area"
              : "line";
    const formulas = [
        ...xml.matchAll(/<(?:\w+:)?f[^>]*>([^<]*)<\/(?:\w+:)?f>/g),
      ].map((m) => m[1].replace(/&apos;/g, "'").replace(/&amp;/g, "&")),
      refs = formulas
        .map((f) =>
          f.match(
            /(?:'((?:[^']|'')*)'|([^!]+))!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?/,
          ),
        )
        .filter(Boolean);
    if (!refs.length) continue;
    const sh = sheets.find(
      (s) => s.name === (refs[0][1]?.replaceAll("''", "'") || refs[0][2]),
    );
    if (!sh) continue;
    const ps = refs.flatMap((m) => [
      parseRef(m[3] + m[4]),
      parseRef((m[5] || m[3]) + (m[6] || m[4])),
    ]);
    const minR = Math.max(0, Math.min(...ps.map((p) => p.row)) - 1),
      maxR = Math.max(...ps.map((p) => p.row)),
      minC = Math.min(...ps.map((p) => p.col)),
      maxC = Math.max(...ps.map((p) => p.col));
    found.push({
      id: crypto.randomUUID(),
      sheetId: sh.id,
      type,
      range: `${cellRef(minR, minC)}:${cellRef(maxR, maxC)}`,
      title: xml.match(/<a:t>([^<]+)<\/a:t>/)?.[1] || "Excel グラフ",
      theme: "scientific",
      showGrid: true,
      showLegend: true,
      math: [],
      annotations: [],
    });
  }
  return found;
}
