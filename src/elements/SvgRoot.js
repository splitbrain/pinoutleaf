import { BaseElement } from './BaseElement.js';

export class SvgRoot extends BaseElement {
    constructor() {
        super('svg', {
            xmlns: 'http://www.w3.org/2000/svg',
        });
    }
}
