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
// Drag selection must survive pointerup and click.
const a = await page.locator('[data-ref="B2"]').boundingBox(),
  b = await page.locator('[data-ref="C4"]').boundingBox();
await page.mouse.move(a.x + 20, a.y + 12);
await page.mouse.down();
await page.mouse.move(b.x + 20, b.y + 12, { steps: 8 });
await page.mouse.up();
assert.equal(await page.locator("#name-box").inputValue(), "B2:C4");
console.log("PASS drag range");
await page.locator("#name-box").fill("B3");
await page.locator("#name-box").press("Enter");
await page.locator('[data-action="menu"][data-menu="3"]').click();
await page.locator('[data-action="insert-row"]').click();
assert.equal(await page.locator('[data-ref="B4"]>span').textContent(), "18.6");
assert.equal(await page.locator('[data-chart="range"]').inputValue(), "A1:D14");
console.log("PASS structural row insert/chart range");
await page.locator("#name-box").fill("AA100");
await page.locator("#name-box").press("Enter");
assert.equal(await page.locator('[data-ref="AA100"]').count(), 1);
await page.locator("#formula-input").fill("=2^5");
await page.locator("#formula-input").press("Enter");
assert.equal(await page.locator('[data-ref="AA100"]>span').textContent(), "32");
console.log("PASS distant grid editing");
await page.locator('[data-action="import"]').first().click();
await page
  .locator("#import-file")
  .setInputFiles({
    name: "測定.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("x,y\n1,12\n2,24\n3,36"),
  });
await page.waitForTimeout(150);
await page.locator("#name-box").fill("A1");
await page.locator("#name-box").press("Enter");
assert.equal(await page.locator('[data-ref="B3"]>span').textContent(), "24");
console.log("PASS CSV import");
await page.locator('[data-action="export"]').first().click();
await page.locator('input[value="xlsx"]').check();
let promise = page.waitForEvent("download");
await page.locator('#export-form button[type="submit"]').click();
let file = await promise;
let path = await file.path();
await page.locator('[data-action="import"]').first().click();
await page
  .locator("#import-file")
  .setInputFiles({
    name: "roundtrip.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await (await import("node:fs/promises")).readFile(path),
  });
await page.waitForTimeout(150);
assert.equal(await page.locator(".sheet-tab").count(), 6);
console.log("PASS XLSX download/reimport");
await page.locator('[data-action="sheet-menu"]').click();
await page.locator('.manage-sheets > div').first().getByRole('button',{name:'名前を変更'}).click();
await page.locator('#generic-value').fill("実験 O'Brien");
await page.locator('#generic-form button.primary').click();
await page.getByRole('button',{name:'解析メモ',exact:true}).click();
assert.doesNotMatch(await page.locator('[data-ref="B2"]>span').textContent(),/^#/);
await page.locator('[data-ref="B2"]').click();
assert.match(await page.locator('#formula-input').inputValue(),/O''Brien/);
console.log('PASS renamed sheet references');

await page.locator('[data-action="view-studio"]').first().click();
await page.locator('[data-action="export"]').first().click();
await page.locator('input[value="png"]').check();
await page.locator('select[name="preset"]').selectOption("Social Media");
await page.locator('select[name="scale"]').selectOption("1");
promise = page.waitForEvent("download");
await page.locator('#export-form button[type="submit"]').click();
file = await promise;
assert.match(file.suggestedFilename(), /\.png$/);
const bytes = await (
  await import("node:fs/promises")
).readFile(await file.path());
assert.equal(bytes.readUInt32BE(16), 1200);
assert.equal(bytes.readUInt32BE(20), 1200);
console.log("PASS PNG output dimensions");
await page.locator('[data-tool="settings"]').click();
await page.locator('[data-action="float-panel"]').click();
assert.equal(await page.locator(".floating-panel").count(), 1);
await page.locator('[data-action="save-workspace"]').click();
await page.locator('[data-action="reset-layout"]').first().click();
await page.locator('[data-action="load-workspace"]').click();
assert.equal(await page.locator(".floating-panel").count(), 1);
console.log("PASS workspace persistence");
assert.deepEqual(errors, []);
await browser.close();
