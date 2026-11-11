import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  }),
  errors = [];
page.on("pageerror", (err) => errors.push(err.message));
await page.goto(process.env.APP_URL || "http://127.0.0.1:5173");
await page.waitForSelector('[data-ref="B2"]');
assert.equal(await page.locator("header,.brand,.brand-mark").count(), 0);
await page.locator('[data-action="view-studio"]').first().click();
assert.equal(
  await page.locator(".section-intro,.eyebrow,.tool-subtitle").count(),
  0,
);
const neutral = await page
  .locator(
    ".studio-rail,.studio-panel,.studio-inspector,.studio-toolbar,.menu-row,.status-bar",
  )
  .evaluateAll((nodes) =>
    nodes.every((n) => {
      const rgb = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
      return !rgb || (rgb[0] === rgb[1] && rgb[1] === rgb[2]);
    }),
  );
assert.equal(neutral, true);
console.log("PASS headerless neutral editor and no promotional copy");
const tool = (id) => page.locator(`[data-tool="${id}"]`).click();
await tool("chart");
const curve = page.locator('[data-adv-form="curve"]');
await curve.locator('[name="type"]').selectOption("parametric");
await curve.locator('[name="xExpression"]').fill("cos(t)");
await curve.locator('[name="yExpression"]').fill("sin(t)");
await curve.locator("button").click();
assert.match(await page.locator("#graph-artboard").innerHTML(), /<path/);
console.log("PASS parametric curve");
await tool("math");
const science = page.locator('[data-adv-form="science"]');
await science.locator('[name="operation"]').selectOption("analytic-integral");
await science.locator('[name="expression"]').fill("x^2");
await science.locator('[name="a"]').fill("0");
await science.locator('[name="b"]').fill("3");
await science.locator("button").click();
assert.match(await page.locator(".modal").textContent(), /9/);
await page.getByRole("button", { name: "閉じる", exact: true }).click();
console.log("PASS analytic integral and math typesetting");
await tool("geometry");
await page.locator('[data-adv="new-object"][data-kind="rect"]').click();
await page.locator('[data-adv="new-object"][data-kind="ellipse"]').click();
assert.equal(await page.locator("#graph-artboard [data-object-id]").count(), 2);
await tool("layers");
await page.locator('[data-adv="select-object"]').first().click();
await page
  .locator('[data-adv="select-object"]')
  .nth(1)
  .click({ modifiers: ["Shift"] });
await page.locator('[data-adv="object-group"]').click();
await page.locator('[data-adv="object-duplicate"]').click();
assert.equal(await page.locator("#graph-artboard [data-object-id]").count(), 4);
console.log("PASS vector multi-selection group and duplicate");
await tool("typography");
await page
  .locator('[data-adv-form="latex"] [name="text"]')
  .fill("\\frac{x^2}{2}");
await page.locator('[data-adv-form="latex"] button').click();
assert.equal(await page.locator("#graph-artboard [data-object-id]").count(), 5);
assert.ok((await page.locator("#graph-artboard [data-c]").count()) > 0);
console.log("PASS LaTeX converted to true SVG glyphs");
await tool("settings");
await page.locator('select[name="layout-properties"]').selectOption("float");
assert.equal(await page.locator(".studio-inspector.managed-float").count(), 1);
await page.locator('.studio-panel .panel-heading').evaluate(source=>{const transfer=new DataTransfer();transfer.setData('text/plot-panel','tools');const target=document.querySelector('.studio-inspector .panel-heading'),box=target.getBoundingClientRect();target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:box.left+box.width/2,clientY:box.top+box.height-2}));});
assert.equal(await page.locator('.panel-split').count(),1);
console.log('PASS docking relative to another panel');
await page.locator('[data-adv="layout-save"]').click();
await page.reload();
await page.locator('[data-action="view-studio"]').first().click();
assert.equal(await page.locator(".panel-split").count(), 1);
assert.equal(await page.locator("#graph-artboard [data-object-id]").count(), 5);
console.log("PASS saved layout, complete project and undo history restoration");
await page.locator('[data-action="export"]').first().click();
await page.locator('input[value="pdf"]').check();
const downloaded = page.waitForEvent("download", { timeout: 60000 });
await page.locator('#export-form button[type="submit"]').click();
const file = await downloaded,
  bytes = await readFile(await file.path());
assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
assert.ok(bytes.length > 10000);
console.log("PASS actual downloadable vector PDF with Japanese glyph paths");
await page.locator('[data-action="view-sheet"]').first().click();
await page.locator("#grid-scroll").evaluate((el) => (el.scrollTop = 50000));
await page.waitForTimeout(200);
const row = await page
  .locator(".cell-grid td[data-r]")
  .first()
  .getAttribute("data-r");
assert.ok(Number(row) > 1000);
assert.ok((await page.locator("td[data-r]").count()) <= 1200);
console.log("PASS bounded DOM virtual scrolling");
await page.locator('[data-action="menu"][data-menu="5"]').click();
await page.locator('[data-action="freeze"]').click();
await page.locator('#freeze-form [name="rows"]').fill("1");
await page.locator('#freeze-form [name="cols"]').fill("1");
await page.locator("#freeze-form button").click();
await page.locator("#grid-scroll").evaluate((el) => {
  el.scrollTop = 50000;
  el.scrollLeft = 2500;
});
await page.waitForTimeout(250);
assert.equal(await page.locator(".freeze-rows").count(), 1);
assert.equal(await page.locator(".freeze-cols").count(), 1);
console.log("PASS frozen regions survive virtual scrolling");
assert.deepEqual(errors, []);
await browser.close();
