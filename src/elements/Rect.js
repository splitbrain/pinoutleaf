import { BaseElement } from './BaseElement.js';

export class Rect extends BaseElement {
  constructor(x, y, width, height, attrs = {}) {
    super('rect', { 
      x, 
      y, 
      width, 
      height,
      ...attrs 
    });
  }

  getBoundingBox() {
    const x = parseFloat(this.attrs.x) || 0;
    const y = parseFloat(this.attrs.y) || 0;
    const width = parseFloat(this.attrs.width) || 0;
    const height = parseFloat(this.attrs.height) || 0;
    
    return {
      x,
      y,
      width,
      height
    };
  }
}
