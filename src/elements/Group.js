import { BaseElement } from './BaseElement.js';

export class Group extends BaseElement {
    constructor(attrs = {}, children = []) {
        super('g', attrs, children);
    }
}
