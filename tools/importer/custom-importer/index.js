import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

import urls from './urls.json' assert {type: 'json'};

// const urls = [
//   'https://creativecloud.adobe.com/apps/all/desktop/pdp/creative-cloud',
//   'https://creativecloud.adobe.com/apps/all/desktop/pdp/photoshop',
//   'https://creativecloud.adobe.com/apps/all/desktop/pdp/photoshop-mobile',
//   'https://creativecloud.adobe.com/apps/all/desktop/pdp/photoshop-web',
// ];

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    await callback(array[index], index, array);
  }
}

const captureClicks = async (page, selector, browser, cb, parent) => {
  let more = false;
  do {
    const before = (await browser.pages()).length;
    const link = await page.$(`.${selector}:not(.already-clicked)`);
    console.log(`captureClicks ${selector}`, link);
    if (link) {
      await link.click();
      await page.waitForTimeout(7000);

      const popupLinks = await page.evaluate(() => document.querySelector(`.resource-more-link:not(.already-clicked,.already-detected)`) !== null);

      if (popupLinks) {
        await page.evaluate(() => {
          document.querySelectorAll('.resource-more-link').forEach((l) => {
            l.classList.add('already-detected');
          });
        });
        await page.evaluate((l) => {
          l.classList.add('already-clicked');
          l.classList.add('parent-menu');
        }, link);
        await captureClicks(page, 'resource-more-link', browser, async (processLinked, url, subp) => {
          await page.evaluate((rml, p, url) => {
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.textContent = rml.textContent;
            p.parentNode.append(a);
            rml.classList.add('already-clicked');
          }, processLinked, subp, url);
          await page.waitForTimeout(1000);
        }, link);
        await page.evaluate((l) => {
          const h3 = document.createElement('h3');
          h3.textContent = l.textContent;
          l.replaceWith(h3);
        }, link);
        more = await page.evaluate((s) => document.querySelector(`.${s}:not(.already-clicked)`) !== null, selector);
      } else {
        const pages = await browser.pages();
        if (pages.length > before) {
          const url = pages[pages.length - 1].url();
          console.log('new page url', url);
          pages[pages.length - 1].close();
          if (cb) {
            await cb(link, url, parent);
          } else {
            await page.evaluate((u, l) => {
              if (l.tagName === 'A') {
                l.setAttribute('href', u);
              } else {
                l.setAttribute('data-href', u);
              }
              l.classList.add('already-clicked');
            }, url, link);
          }
          more = await page.evaluate((s) => document.querySelector(`.${s}:not(.already-clicked)`) !== null, selector);
        } else {
          more = false;
        }
      }
    } else {
      more = false;
    }
  } while (more);
}

const doImport = async (browser, url, output) => {
  console.log('Import', url);
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080
  });
  await page.goto(url, { timeout: 3000000 });
  await page.waitForTimeout(15000);

  await page.waitForSelector('.pdp-platform-agnostic-layout-resources', { timeout: 3000000 });

  await captureClicks(page, 'resource-link', browser);
  await captureClicks(page, 'tutorial-card', browser);

  await page.click('[aria-label*="languages"]');

  const html = await page.evaluate(() => document.documentElement.outerHTML);
  await fs.writeFile(output, html);
  page.close();
} 

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './user_data',
  });

  const input = urls.map((u) => ({ url: u, output: `./output/${u.split('/').pop()}.html` }));

  await asyncForEach(input, async (o) => {
    await doImport(browser, o.url, o.output);
  });
  // await doImport(browser, input[2].url, input[2].output);
  
  await browser.close();
})();