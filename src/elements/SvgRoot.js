import { BaseElement } from './BaseElement.js';

export class SvgRoot extends BaseElement {
    constructor(width, height) {
        super('svg', {
            width,
            height,
            xmlns: 'http://www.w3.org/2000/svg',
        });
    }
}
