export class BaseElement {
    constructor(name, attrs = {}, children = []) {
        this.name = name;
        this.attrs = { ...attrs };
        this.children = [...children];
    }

    append(child) {
        this.children.push(child);
        return this;
    }

    setAttr(name, value) {
        this.attrs[name] = value;
        return this;
    }

    render(document) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', this.name);

        for (const [key, val] of Object.entries(this.attrs)) {
            if (typeof key === 'string' && val != null) {
                el.setAttribute(String(key), String(val));
            }
        }

        for (const child of this.children) {
            el.appendChild(child.render(document));
        }

        return el;
    }
}
