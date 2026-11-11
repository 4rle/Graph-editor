import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      acceptDownloads: true,
    }),
    errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(process.env.APP_URL || "http://127.0.0.1:5173");
  await page.locator('[data-action="view-studio"]').first().click();
  await page.locator('[data-tool="appearance"]').click();
  await mkdir("test-results", { recursive: true });
  const choose = async (id) =>
    page
      .locator(`.theme-library [data-action="theme"][data-theme="${id}"]`)
      .click();
  await choose("flat-design");
  const source = await page.evaluate(() =>
    JSON.stringify(JSON.parse(localStorage.getItem("plot-project-v1")).sheets),
  );
  for (const [id, width, style] of [
    ["flat-design", "3", "flat"],
    ["kawaii-minimal", "4.6", "cute"],
    ["scientific", "1.6", "scientific"],
    ["editorial", "2.5", "editorial"],
  ]) {
    await choose(id);
    assert.equal(
      await page
        .locator("#graph-artboard svg")
        .getAttribute("data-theme-style"),
      style,
    );
    assert.equal(
      await page
        .locator("#graph-artboard .chart-series-line")
        .first()
        .getAttribute("stroke-width"),
      width,
    );
    assert.equal(
      await page
        .locator(`.theme-library [data-theme="${id}"] svg.chart-svg`)
        .getAttribute("data-theme-style"),
      style,
    );
    await page
      .locator("#graph-artboard")
      .screenshot({ path: `test-results/theme-${id}.png` });
  }
  console.log(
    "PASS full theme switching updates line weights, typography, layout and actual previews",
  );
  await choose("kawaii-minimal");
  await page.locator('[data-action="save-theme"]').click();
  await page.locator("#generic-value").fill("かわいい図版");
  await page.locator("#generic-form button.primary").click();
  await choose("flat-design");
  await page.locator('[data-action="apply-custom-theme"]').click();
  assert.equal(
    await page
      .locator("#graph-artboard .chart-series-line")
      .first()
      .getAttribute("stroke-width"),
    "4.6",
  );
  await page.reload();
  await page.locator('[data-action="view-studio"]').first().click();
  assert.equal(
    await page.locator("#graph-artboard svg").getAttribute("data-theme-style"),
    "cute",
  );
  await page.locator('[data-tool="chart"]').click();
  await page.locator('[data-action="chart-type"][data-type="bar"]').click();
  assert.equal(
    await page.locator("#graph-artboard .chart-bar").first().getAttribute("rx"),
    "14",
  );
  await page
    .locator("#graph-artboard")
    .screenshot({ path: "test-results/theme-kawaii-bars.png" });
  assert.equal(
    await page.evaluate(() =>
      JSON.stringify(
        JSON.parse(localStorage.getItem("plot-project-v1")).sheets,
      ),
    ),
    source,
  );
  console.log(
    "PASS complete custom theme restoration, rounded bars and unchanged source data",
  );
  await page.locator('[data-action="export"]').first().click();
  const downloaded = page.waitForEvent("download");
  await page.locator('#export-form button[type="submit"]').click();
  const file = await downloaded,
    svg = await readFile(await file.path(), "utf8");
  assert.match(svg, /data-theme-style="cute"/);
  assert.match(svg, /class="chart-bar"[^>]+rx="14"/);
  await page.locator('[data-tool="appearance"]').click();
  const components = page.locator('[data-adv-form="tokens"]');
  await components.locator('[name="style"]').selectOption("flat");
  await components.locator("button.primary").click();
  assert.equal(
    await page.locator("#graph-artboard svg").getAttribute("data-theme-style"),
    "flat",
  );
  assert.equal(
    await page.locator("#graph-artboard .chart-bar").first().getAttribute("rx"),
    "0",
  );
  await components.locator('[name="style"]').selectOption("cute");
  await components.locator('[name="elements"]').selectOption("scientific");
  await components.locator("button.primary").click();
  assert.ok((await page.locator("#graph-artboard .chart-tick").count()) > 0);
  assert.equal(
    await page.locator("#graph-artboard .chart-bar").first().getAttribute("rx"),
    "0",
  );
  assert.deepEqual(errors, []);
  console.log("PASS exported SVG retains the full theme design");
  console.log(
    "PASS composing style and scientific chart elements updates shapes and axes",
  );
} finally {
  await browser.close();
}
