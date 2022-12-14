/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

const makeProxySrcs = (main, host) => {
  main.querySelectorAll('img').forEach((img) => {
    if (img.src.startsWith('/')) {
      // make absolute
      const cu = new URL(host);
      img.src = `${cu.origin}${img.src}`;
    }
    try {
      const u = new URL(img.src);
      u.searchParams.append('host', u.origin);
      img.src = `http://localhost:3001${u.pathname}${u.search}`;
    } catch (error) {
      console.warn(`Unable to make proxy src for ${img.src}: ${error.message}`);
    }
  });
};

const createMetadata = (document) => {
  const meta = {};

  const title = document.querySelector('title');
  if (title) {
    meta.Title = title.innerHTML.replace(/[\n\t]/gm, '');
  }

  // find the <meta property="og:description"> element
  const desc = document.querySelector('[property="og:description"]');
  if (desc) {
    meta.Description = desc.content;
  }

  // find the <meta property="og:image"> element
  const img = document.querySelector('[property="og:image"]');
  if (img) {
    // create an <img> element
    const el = document.createElement('img');
    el.src = img.content;
    meta.Image = el;
  }
  
  const icon = document.querySelector('.product-icon');
  if (icon) {
    meta.Icon = icon.getAttribute('alt') || '';
  }

  const compat = document.querySelector('a[aria-label*="compatibility"]');
  if (compat) {
    meta.Compatibility = compat.textContent;
  }

  const languages = document.querySelector('.languages-tab-content');
  if (languages) {
    meta.Languages = [...languages.children].map((l) => l.textContent).join(', ');
  }

  const related = document.querySelectorAll('.pdp-platform-agnostic-layout-related-apps .tile-version-wrapper');
  if (related.length > 0) {
    meta.Related = [...related].map((r) => r.textContent).join(', ');
  }

  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  document.body.append(block);
}

const toHeading2 = (selectors, document) => {
  document.querySelectorAll(selectors).forEach((e) => {
    const h2 = document.createElement('h2');
    h2.textContent = e.textContent;
    e.replaceWith(h2);
  })
}

const verticalTabListToBlock = (document) => {
  document.querySelectorAll('.verticalTabList').forEach((verticalTabList) => {
    const cells = [['Vertical Tab List']];
    verticalTabList.querySelectorAll('.tab').forEach((tab) => {
      const a = tab.querySelector('a');
      if (a) {
        const h3 = document.createElement('h3');
        h3.textContent = a.textContent;
        a.replaceWith(h3);
      }
      const div = document.createElement('div');
      div.innerHTML = tab.innerHTML;
      const row = [div];

      const i = tab.getAttribute('data-index');
      const preview = verticalTabList.querySelector(`.preview.p${i}`);
      if (preview) {
        row.push(preview);
      }

      cells.push(row);
    });
    const table = WebImporter.DOMUtils.createTable(cells, document);
    verticalTabList.replaceWith(table);
  });
}

const tutorialCardsToBlock = (document) => {
  document.querySelectorAll('.tutorial-cards').forEach((cards) => {
    const cells = [['Tutorial Cards']];
    cards.querySelectorAll('.tutorial-card').forEach((card) => {
      const row = [card];

      const href = card.getAttribute('data-href');
      if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = href;
        card.append(a);
      }

      const title = card.querySelector('.tutorial-card-title');
      if (title) {
        const h3 = document.createElement('h3');
        h3.textContent = title.textContent;
        title.replaceWith(h3);
      }

      const details = card.querySelector('.tutorial-card-details');
      if (details) {
        const p = document.createElement('p');
        p.innerHTML = details.textContent.split('.').join('<br>');
        details.replaceWith(p);
      }

      const img = card.querySelector('.tutorial-card-image');
      if (img) {
        row.push(img);
      }

      cells.push(row);
    });
    const table = WebImporter.DOMUtils.createTable(cells, document);
    cards.replaceWith(table);
  });
}

const additionalResourcesToBlock = (document) => {
  document.querySelectorAll('.pdp-platform-agnostic-layout-resources .resource-container').forEach((resources) => {
    const cells = [['Resources']];
    resources.querySelectorAll('.resource-well').forEach((r) => {
      const row = [r];

      const links = r.querySelectorAll('a');
      
      if (links.length > 1) {
        const ul = document.createElement('ul');
        links.forEach((a) => {
          const li = document.createElement('li');
          li.append(a);
          ul.append(li);
        });
        r.append(ul);
      }


      cells.push(row);
    });
    const table = WebImporter.DOMUtils.createTable(cells, document);
    resources.replaceWith(table);
  });
}

const cleanupLinks = (document) => {
  document.querySelectorAll('a').forEach((a) => { 
    const href = a.getAttribute('href');
    if (href) {
      try {
        const u = new URL(href);
        u.searchParams.delete('mv');
        u.searchParams.delete('guid');
        u.searchParams.delete('context_guid');
        u.searchParams.delete('promoid');
        u.searchParams.delete('x-product');
        u.searchParams.delete('x-product-location');
        u.searchParams.delete('trackingid');
        const newHref = u.toString();
        a.setAttribute('href', newHref);
        if (a.textContent === href) {
          a.textContent = newHref;
        }
      } catch(e) {
        console.log('Invalid link', href);
      }
    }
  });
}

export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {HTMLElement} The root element to be transformed
   */
  transformDOM: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    WebImporter.DOMUtils.remove(document.body, [
      '.navbar',
      '.leftnav-wrapper',
      '.pdp-header',
      '#footer',
      '.platform-tabs',
      '.action-bar',
      '.slider',
      '.view-more',
      '.adbMsgClientWrapper',
      'iframe',
      '#loader',
      '.spectrum-Popover',
    ]);

    toHeading2(['h1', '.title', '.ccdHeader__item'], document);

    // promote title to h1
    const name = document.querySelector('.product-name')
    if (name) {
      const h1 = document.createElement('h1');
      h1.innerHTML = name.innerHTML;
      name.replaceWith(h1);
    }

    verticalTabListToBlock(document);
    tutorialCardsToBlock(document);
    additionalResourcesToBlock(document);

    createMetadata(document);

    const bckimg = document.querySelectorAll('[style*="background-image"]');
    bckimg.forEach((e) => {
      WebImporter.DOMUtils.replaceBackgroundByImg(e, document);
    });

    makeProxySrcs(document.body, ' https://odin.adobe.com');
    cleanupLinks(document);

    WebImporter.DOMUtils.remove(document.body, [
      '.product-icon',
      '[role="dialog"]',
      '.pdp-platform-agnostic-layout-related-apps',
      '.hidden',
      '.information',
    ]);

    return document.body;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @return {string} The path
   */
  generateDocumentPath: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => new URL(url).pathname.replace(/\.html$/, '').replace(/\/$/, ''),
};