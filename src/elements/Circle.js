import { BaseElement } from './BaseElement.js';

export class Circle extends BaseElement {
  constructor(cx, cy, r, fill = 'black') {
    super('circle', { cx, cy, r, fill });
  }
}
