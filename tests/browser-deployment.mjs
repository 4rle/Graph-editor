import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const base = process.env.APP_URL || "http://127.0.0.1:8787",
  page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const response = await page.goto(base);
assert.equal(response.status(), 200);
await page.waitForSelector('[data-ref="B2"]');
for (const [file, type] of [
  ["/styles.css", "text/css"],
  ["/advanced.css", "text/css"],
  ["/katex.css", "text/css"],
  ["/color/lcms.wasm", "application/wasm"],
  ["/native.css", "text/css"],
]) {
  const r = await page.request.get(base + file);
  assert.equal(r.status(), 200, file);
  assert.match(
    r.headers()["content-type"],
    new RegExp(type.replace("/", "\\/")),
  );
}
assert.deepEqual(errors, []);
console.log(
  "PASS actual Workers static asset routing and initial application render",
);
await page.locator('[data-action="view-studio"]').first().click();
await page.locator('[data-tool="settings"]').click();
await page
  .locator('[data-adv-form="panel-add"] [name="tool"]')
  .selectOption("math");
await page.locator('[data-adv-form="panel-add"] button').click();
assert.equal(await page.locator(".auxiliary-panel").count(), 1);
console.log("PASS independent edit panel");
await page.locator('[data-action="menu"][data-menu="2"]').click();
await page.locator('[data-action="native-workbook"]').click();
await page.waitForSelector("#native-workbook canvas");
await page
  .locator("#native-workbook")
  .evaluate((el) => el.workbookAPI().setCellValue(1, 1, 42));
await page.waitForTimeout(250);
await page
  .locator("#native-workbook")
  .evaluate((el) => el.workbookAPI().setCellValue(1, 0, "試料A"));
await page.waitForTimeout(250);
assert.equal(
  await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("plot-project-v1")).sheets[0].cells.B2
        .raw,
  ),
  "42",
);
await page.locator("#native-done").click();
console.log("PASS existing spreadsheet engine synchronizes source data");
const circle = page
    .locator('#graph-artboard [data-row="1"][data-col="1"]')
    .first(),
  box = await circle.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 25, {
  steps: 8,
});
await page.mouse.up();
await page.waitForTimeout(100);
assert.notEqual(
  await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("plot-project-v1")).sheets[0].cells.B2
        .raw,
  ),
  "42",
);
console.log(
  "PASS direct data-point dragging with categorical X updates shared source values",
);
await page.locator('[data-action="export"]').first().click();
await page.locator('input[value="pdf"]').check();
await page.locator('[name="profile"]').selectOption("icc");
await page
  .locator('[name="icc"]')
  .setInputFiles(
    process.env.ICC_FILE || "/usr/share/color/icc/ghostscript/default_cmyk.icc",
  );
const downloaded = page.waitForEvent("download", { timeout: 60000 });
await page.locator('#export-form button[type="submit"]').click();
const file = await downloaded;
const bytes = await (
  await import("node:fs/promises")
).readFile(await file.path());
assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
assert.match(bytes.toString("latin1"), /\/OutputIntents/);
assert.match(bytes.toString("latin1"), /\/DeviceCMYK/);
assert.match(bytes.toString("latin1"), /[0-9.]+ [0-9.]+ [0-9.]+ [0-9.]+ k\b/);
console.log("PASS ICC-managed CMYK PDF output");
const broken = await browser.newPage();
await broken.addInitScript(() =>
  localStorage.setItem("plot-project-v1", '{"name":"Recover me"}'),
);
await broken.route("**/app-*.js", (route) => route.abort());
await broken.goto(base);
await broken
  .getByRole("heading", { name: "アプリを起動できませんでした" })
  .waitFor();
assert.equal(
  await broken.evaluate(
    () => JSON.parse(localStorage.getItem("plot-project-v1")).name,
  ),
  "Recover me",
);
assert.equal(
  await broken.getByRole("button", { name: "保存データを書き出す" }).count(),
  1,
);
console.log("PASS failed entry shows recovery UI rather than a white screen");
assert.deepEqual(errors, []);
await browser.close();
