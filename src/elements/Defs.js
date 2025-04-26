import {BaseElement} from './BaseElement.js';
import fontData from '@fontsource/roboto-mono/files/roboto-mono-latin-500-normal.woff2';

export class Defs extends BaseElement {
  constructor(children = []) {
    super('defs', {}, children);


    const style = new BaseElement('style', { type: 'text/css' });

    // Embed the Open-Sans font
    style.textContent = `
      @font-face {
        font-family: 'Roboto Mono';
        src: url('${fontData}') format('woff2');
      }
    `;

    this.append(style);
  }

  render(document) {
    const el = super.render(document);

    // Handle any elements with textContent property
    for (const child of this.children) {
      if (child.textContent) {
        const childEl = el.childNodes[this.children.indexOf(child)];
        childEl.textContent = child.textContent;
      }
    }

    return el;
  }
}
