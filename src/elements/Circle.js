import { BaseElement } from './BaseElement.js';

export class Circle extends BaseElement {
  constructor(cx, cy, r, fill = 'black') {
    super('circle', { cx, cy, r, fill });
  }

  getBoundingBox() {
    const cx = parseFloat(this.attrs.cx) || 0;
    const cy = parseFloat(this.attrs.cy) || 0;
    const r = parseFloat(this.attrs.r) || 0;
    
    return {
      x: cx - r,
      y: cy - r,
      width: r * 2,
      height: r * 2
    };
  }
}
