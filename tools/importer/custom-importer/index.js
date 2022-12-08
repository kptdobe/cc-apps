import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

const input = [{
  url: 'https://creativecloud.adobe.com/apps/all/desktop/pdp/creative-cloud',
  output: './output/creative-cloud.html',
}, {
  url: 'https://creativecloud.adobe.com/apps/all/desktop/pdp/photoshop',
  output: './output/photoshop.html',
}, {
  url: 'https://creativecloud.adobe.com/apps/all/desktop/pdp/photoshop-mobile',
  output: './output/photoshop-mobile.html',
}, {
  url: 'https://creativecloud.adobe.com/apps/all/desktop/pdp/photoshop-web',
  output: './output/photoshop-web.html',
}];

const doImport = async (browser, url, output) => {
  const page = await browser.newPage();
  await page.goto(url, { timeout: 3000000 });
  await page.waitForTimeout(15000);

  await page.waitForSelector('.pdp-platform-agnostic-layout-resources', { timeout: 3000000 });

  let more = false;
  do {
    const before = (await browser.pages()).length;
    const link = await page.$('.resource-link:not(.already-clicked)');
    if (link) {
      await link.click();
      await page.waitForTimeout(7000);
      const pages = await browser.pages();
      if (pages.length > before) {
        const url = pages[pages.length - 1].url();
        console.log('new page url', url);
        pages[pages.length - 1].close();
        await page.evaluate((u, l) => {
          // const l = document.querySelector('.resource-link');
          l.href = u;
          l.classList.add('already-clicked');
        }, url, link);
        more = await page.evaluate(() => document.querySelector('.resource-link:not(.already-clicked)') !== null);
      } else {
        more = false;
      }
    } else {
      more = false;
    }
  } while (more);

  await page.click('[aria-label*="languages"]');

  const html = await page.evaluate(() => document.documentElement.outerHTML);
  await fs.writeFile(output, html);
} 

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './user_data',
  });

  // input.forEach(async (o) => {
  //   await doImport(browser, o.url, o.output);
  // });
  await doImport(browser, input[2].url, input[2].output);
  
  // await browser.close();
})();