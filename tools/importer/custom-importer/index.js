import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './user_data',
  });
  const page = await browser.newPage();

  await page.goto('https://creativecloud.adobe.com/apps/all/desktop/pdp/creative-cloud', { timeout: 3000000 });
  // await page.goto('https://creativecloud.adobe.com/apps/all/desktop/pdp/photoshop', { timeout: 3000000 });

  await page.waitForTimeout(10000);

  await page.waitForSelector('.pdp-platform-agnostic-layout-resources', { timeout: 3000000 });
  await page.click('[aria-label*="languages"]');

  const html = await page.evaluate(() => document.documentElement.outerHTML);
  console.log('html', html);

  await fs.writeFile('./output/creative-cloud.html', html);
  // await fs.writeFile('./output/photoshop.html', html);
  
  // await browser.close();
})();