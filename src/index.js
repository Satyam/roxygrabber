const puppeteer = require('puppeteer-core');
const { ensureFile } = require('fs-extra');
const base = 'https://roxanacabut.wixsite.com/roxanacabut';
const lista = {
  '/': false,
}(
  // pptr.dev
  async () => {
    const browser = await puppeteer.launch({
      product: 'chrome',
      executablePath: '/usr/bin/google-chrome',
      ignoreDefaultArgs: ['--disable-extensions'],
    });
    const page = await browser.newPage();
    let more = true;
    while (more) {
      more = false;

      for (const p in lista) {
        if (lista[p]) return;
        await page.goto(`${base}${p}`);
        // await page.screenshot({ path: 'example.png' });
        const path = `pdf${p}`;
        console.log(path);
        await ensureFile(path);
        await page.pdf({ path, format: 'A4' });
        // https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Selectors/Attribute_selectors
        const links = await page.$$eval(
          'a[href*="roxanacabut"]',
          // (anchors) =>
          //   console.log(anchors)
          // );
          (anchors) => anchors.map((a) => a.getAttribute('href'))
        );
        links.forEach((l) => {
          const s = l.replace(base, '');
          if (lista[s]) return;
          lista[s] = false;
          more = true;
        });
      }
    }
    await browser.close();
  }
)();
