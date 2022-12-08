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
      '.ccdHeader',
      '#footer',
      '.platform-tabs',
      '.information',
      '.action-bar',
      '.slider',
    ]);

    const bckimg = document.querySelectorAll('[style*="background-image"]');
    bckimg.forEach((e) => {
      WebImporter.DOMUtils.replaceBackgroundByImg(e, document);
    });

    toHeading2(['h1', '.title'], document);

    // promote title to h1
    const name = document.querySelector('.product-name')
    if (name) {
      const h1 = document.createElement('h1');
      h1.innerHTML = name.innerHTML;
      name.replaceWith(h1);
    }

    makeProxySrcs(document.body, ' https://odin.adobe.com');

    createMetadata(document);

    WebImporter.DOMUtils.remove(document.body, [
      '.product-icon'
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