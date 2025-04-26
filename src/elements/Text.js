import { BaseElement } from './BaseElement.js';
import {FONTSIZE} from "../Constants.js";

export class Text extends BaseElement {
  constructor(x, y, text, attrs = {}) {
    super('text', {
      x,
      y,
      ...attrs,
      // align on top left corner
      'dominant-baseline': 'hanging',
      'font-family': 'Roboto Mono',
      'font-size': FONTSIZE,
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
    // Set the text content before rendering
    this.textContent = this.text;
    return super.render(document);
  }
}
