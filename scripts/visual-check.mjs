import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs/promises';
import path from 'node:path';
const out = path.resolve('.qa');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1487, height: 1058 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1000);
const sections = ['inicio','sobre','projetos','contato'];
const metrics = {};
for (const id of sections) {
  const section = page.locator(`#${id}`);
  const box = await section.boundingBox();
  const top = box.y + await page.evaluate(() => scrollY);
  metrics[id] = {...box, y:top};
  await page.evaluate(y => window.scrollTo({top:y, behavior:'instant'}), id === 'inicio' ? 0 : top);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, `${id}-1487.png`) });
}
for (const width of [1440,1024,768,390,360]) {
  await page.setViewportSize({width,height:1058});
  await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0 && (r.right>innerWidth+1 || r.left < -1) && s.position!=='absolute' && s.position!=='fixed' && !e.closest('.hero-portrait,.about-portrait,.project-preview')}).map(e=>`${e.tagName}.${e.className}`)}));
  metrics[width] = overflow;
  await page.screenshot({path:path.join(out,`page-${width}.png`),fullPage:true});
}
console.log(JSON.stringify({metrics,errors},null,2));
await browser.close();
