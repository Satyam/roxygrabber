import puppeteer from 'puppeteer-core';
import { outputFile, ensureDir, outputJSON, readJson } from 'fs-extra/esm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEST_DIR = join(__dirname, '../html1');
const PENDING = join(__dirname, 'pending.json');

const base = 'https://roxanacabut.wixsite.com/';

let lista;
try {
  lista = await readJson(PENDING);
} catch (err) {
  lista = {
    '/roxanacabut': false,
  };
}

await ensureDir(DEST_DIR);

const browser = await puppeteer.launch({
  product: 'chrome',
  executablePath: '/usr/bin/google-chrome',
  ignoreDefaultArgs: ['--disable-extensions'],
});

const onEnd = async (err) => {
  if (err) console.error(err);
  await outputJSON(PENDING, lista, { spaces: 2 });
};
const page = await browser.newPage();

let more = true;
while (more) {
  more = false;

  for (const p in lista) {
    if (!lista[p]) {
      lista[p] = true;
      const url = new URL(p, base);
      console.log(url.href);
      await page.goto(url.href, { waitUntil: 'networkidle0' }).catch(onEnd);
      // await page.screenshot({ path: 'example.png' });
      // const m = postRx.exec(p);
      // if (m) {
      //   splitPost(page, ...m);
      // }

      // const sp = singlePostRx.exec(p);
      // if (sp) {
      //   splitSinglePost(page, ...sp);
      // }

      // pdf generation
      // const path = join(__dirname, '../pdf', decodeURIComponent(p)) + '.pdf';
      // console.log(path);
      // await ensureFile(path);
      // await page.pdf({ path, format: 'A4' });

      // html generation
      await outputFile(
        join(DEST_DIR, decodeURIComponent(p)) + '.html',
        await page.content().catch(onEnd)
      ).catch(onEnd);
      const links = await page
        .$$eval('a[href*="roxanacabut"]', (anchors) =>
          anchors.map((a) => a.getAttribute('href'))
        )
        .catch(onEnd);
      links.forEach((l) => {
        const u = new URL(l, base);
        const s = u.pathname;
        if (lista[s]) return;
        lista[s] = false;
        more = true;
      });
    }
  }
}

await browser.close();
await onEnd();
