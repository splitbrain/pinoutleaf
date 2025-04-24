export class BaseElement {
    constructor(name, attrs = {}, children = []) {
        this.name = name;
        this.attrs = { ...attrs };
        this.children = [...children];
        this.textContent = null;
    }

    append(child) {
        this.children.push(child);
        return this;
    }

    prepend(child) {
        this.children.unshift(child);
        return this;
    }

    setAttr(name, value) {
        this.attrs[name] = value;
        return this;
    }

    /**
     * Calculates the combined bounding box of an array of elements.
     * @param {BaseElement[]} elements - An array of elements.
     * @returns {object|null} The combined bounding box { x, y, width, height } or null if no elements have bounds.
     */
    static getCombinedBoundingBox(elements) {
        if (!elements || elements.length === 0) {
            return null;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let hasValidBounds = false;

        for (const element of elements) {
            // Ensure element has the method and call it
            if (typeof element?.getBoundingBox === 'function') {
                const bbox = element.getBoundingBox();
                if (bbox) {
                    minX = Math.min(minX, bbox.x);
                    minY = Math.min(minY, bbox.y);
                    maxX = Math.max(maxX, bbox.x + bbox.width);
                    maxY = Math.max(maxY, bbox.y + bbox.height);
                    hasValidBounds = true;
                }
            }
        }

        if (!hasValidBounds) {
            return null;
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }


    getBoundingBox() {
        if (this.children.length === 0) {
            return null;
        }

        // If we have children, compute the bounding box from them
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let hasValidBounds = false;

        for (const child of this.children) {
            const bbox = child.getBoundingBox();
            if (bbox) {
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
                hasValidBounds = true;
            }
        }

        if (!hasValidBounds) {
            return null;
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
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

        // Set text content if it exists
        if (this.textContent !== null) {
            el.textContent = this.textContent;
        }

        return el;
    }
}
