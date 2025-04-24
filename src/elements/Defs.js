import { BaseElement } from './BaseElement.js';

export class Defs extends BaseElement {
  constructor(children = []) {
    super('defs', {}, children);
  }
  
  /**
   * Add a font face definition to the defs element
   * @param {string} fontFamily - The name of the font family
   * @param {string} fontSrc - The source URL of the font file
   * @param {Object} options - Additional font options
   * @returns {Defs} - Returns this for chaining
   */
  addFontFace(fontFamily, fontSrc, options = {}) {
    const style = new BaseElement('style', { type: 'text/css' });
    
    // Create the CSS @font-face rule
    const fontFaceRule = `
      @font-face {
        font-family: '${fontFamily}';
        src: url('${fontSrc}');
        ${options.fontWeight ? `font-weight: ${options.fontWeight};` : ''}
        ${options.fontStyle ? `font-style: ${options.fontStyle};` : ''}
      }
    `;
    
    // Set the text content for the style element
    style.textContent = fontFaceRule;
    
    this.append(style);
    return this;
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
