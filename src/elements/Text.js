import { BaseElement } from './BaseElement.js';

export class Text extends BaseElement {
  constructor(x, y, text, attrs = {}) {
    super('text', {
      x,
      y,
      ...attrs,
      // align on top left corner
      'dominant-baseline': 'text-top',
      'alignment-baseline': 'text-before-edge',
      'font-family': 'Arial',
    });
    this.text = text;
  }

  getBoundingBox() {
    // Text bounding box is approximate since we don't have access to font metrics
    // A more accurate implementation would require measuring the text in the browser
    const x = parseFloat(this.attrs.x) || 0;
    const y = parseFloat(this.attrs.y) || 0;

    // Estimate width based on text length and font size
    const fontSize = parseFloat(this.attrs['font-size'] || 12);
    const estimatedWidth = this.text.length * fontSize * 0.6; // rough approximation

    return {
      x: x,
      y: y,
      width: estimatedWidth,
      height: fontSize
    };
  }

  render(document) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', this.name);

    for (const [key, val] of Object.entries(this.attrs)) {
      if (typeof key === 'string' && val != null) {
        el.setAttribute(String(key), String(val));
      }
    }

    el.textContent = this.text;

    for (const child of this.children) {
      el.appendChild(child.render(document));
    }

    return el;
  }
}
