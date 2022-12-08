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