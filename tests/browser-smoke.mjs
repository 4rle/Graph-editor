import { mkdir } from "node:fs/promises";
await mkdir("test-results", { recursive: true });
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
let errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.APP_URL || "http://127.0.0.1:5173");
await page.locator('[data-ref="B2"]').dblclick();
await page.locator("#cell-editor").fill("24.8");
await page.locator("#cell-editor").press("Enter");
assert.equal(await page.locator('[data-ref="B2"]>span').textContent(), "24.8");
await page.locator("#name-box").fill("E2");
await page.locator("#name-box").press("Enter");
await page.locator("#formula-input").fill("=SUM(B2:D2)");
await page.locator("#formula-input").press("Enter");
assert.equal(await page.locator('[data-ref="E2"]>span').textContent(), "39.1");
await page.locator("#grid-scroll").press("Control+z");
assert.equal(await page.locator('[data-ref="E2"]>span').textContent(), "");
await page.locator("#grid-scroll").press("Control+Shift+z");
assert.equal(await page.locator('[data-ref="E2"]>span').textContent(), "39.1");
console.log("PASS spreadsheet editing/formula/undo/redo");
await page.locator('[data-action="view-studio"]').first().click();
await page.locator('[data-tool="analysis"]').click();
await page
  .locator('#regression-form button[type="submit"],#regression-form button')
  .click();
assert.match(await page.locator(".math-object").first().textContent(), /R²/);
console.log("PASS regression overlay");
await page.locator('[data-tool="math"]').click();
await page.locator('#math-form input[name="expression"]').fill("0.05*x^2");
await page.locator('#math-form select[name="type"]').selectOption("integral");
await page.locator('#math-form button[type="submit"]').click();
assert.match(
  await page.locator(".math-object").last().textContent(),
  /Simpson/,
);
console.log("PASS numerical integration");
await page.locator('[data-tool="appearance"]').click();
await page.locator('[data-theme="blueprint"]').click();
assert.match(await page.locator("#graph-artboard").innerHTML(), /#/);
console.log("PASS theme");
await page.locator('[data-action="simple"]').click();
await page.locator('[data-action="pro"]').click();
await page.locator('[data-tool="layers"]').click();
assert.equal(await page.locator(".math-object").count(), 2);
console.log("PASS non-destructive mode switch");
await page.locator('[data-action="export"]').first().click();
const downloadEvent = page.waitForEvent("download");
await page.locator('#export-form button[type="submit"]').click();
const dl = await downloadEvent;
assert.match(dl.suggestedFilename(), /\.svg$/);
console.log("PASS SVG export");
await page.reload();
assert.equal(await page.locator('[data-ref="B2"]>span').textContent(), "24.8");
await page.locator('[data-action="view-studio"]').first().click();
await page.locator('[data-tool="layers"]').click();
assert.equal(await page.locator(".math-object").count(), 2);
console.log("PASS local persistence");
for (const [w, h] of [
  [844, 390],
  [932, 430],
  [740, 360],
  [390, 844],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `test-results/plot-${w}x${h}.png` });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  const fits = await page.locator("#graph-artboard").evaluate((el) => {
    const r = el.getBoundingClientRect(),
      p = el.closest("#studio-canvas").getBoundingClientRect();
    return (
      r.top >= p.top &&
      r.bottom <= p.bottom &&
      r.left >= p.left &&
      r.right <= p.right
    );
  });
  assert.equal(fits, true);
  console.log("PASS viewport", w, h);
}
assert.deepEqual(errors, []);
console.log("PASS no page exceptions");
await browser.close();
