import { chromium } from '@playwright/test';

const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.fill('input[type="text"], input[name="username"], input#username', 'admin');
await page.fill('input[type="password"]', 'admin1234');
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(4000);

// El contenido scrollea en un contenedor interno, no en el body.
async function scrollTo(y) {
  await page.evaluate((target) => {
    const el = [...document.querySelectorAll('*')].find(
      (n) => n.scrollHeight > n.clientHeight + 100 && n.clientHeight > 400,
    );
    if (el) el.scrollTop = target;
  }, y);
  await page.waitForTimeout(900);
}

async function capturar(prefijo) {
  await scrollTo(0);
  await page.screenshot({ path: `${OUT}/${prefijo}-1.png` });
  await scrollTo(880);
  await page.screenshot({ path: `${OUT}/${prefijo}-2.png` });
  await scrollTo(1800);
  await page.screenshot({ path: `${OUT}/${prefijo}-3.png` });
  await scrollTo(0);
}

await capturar('light');

await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
});
await page.waitForTimeout(2500);
await capturar('dark');

// Tooltip de la línea: se comprueba que el hover produce algo
await page.hover('canvas');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/dark-hover.png` });

console.log('errores:', errors.length ? [...new Set(errors)].join(' || ') : 'ninguno');
await browser.close();
