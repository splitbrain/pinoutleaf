// src/components/Legend.js
import {Group} from '../elements/Group.js';
import {Rect} from '../elements/Rect.js';
import {LegendItem} from './LegendItem.js';
import {CORNERS, PADDING} from "../Constants.js";
import {BaseElement} from '../elements/BaseElement.js'; // Needed for static method access


export class Legend extends Group {
    /**
     * Creates a legend component.
     * @param {object} allTypes - The full map of type names to {bgcolor, fgcolor} from setup.types.
     * @param {object} pinsData - The pin definitions from setup.pins (e.g., setup.pins.left).
     */
    constructor(allTypes, pinsData) {
        super();

        const usedTypes = this.getUsedTypes(pinsData, allTypes);
        const items = this.createLegendItems(usedTypes);

        if (items.length === 0) {
            return; // No legend needed if no types are used
        }

        const itemsBBox = BaseElement.getCombinedBoundingBox(items);
        const background = this.createBackground(itemsBBox);

        if (background) {
            this.prepend(background);
        }
        this.children.push(...items); // Append all items at once
    }

    /**
     * Determines the unique types used and retrieves their label and background color.
     *
     * @returns {Map<string, {label: string, bgcolor: string}>}
     */
    getUsedTypes(pinsData, allTypes) {
        const usedTypeInfo = new Map();

        for (const rowKey in pinsData) {
            pinsData[rowKey].forEach(pinLabels => {
                if (!pinLabels) return; // pin is null
                pinLabels.forEach(labelData => {
                    const parts = labelData.split(':');
                    const typeName = (parts.length > 1 && allTypes[parts[1]]) ? parts[1] : 'default';
                    if (usedTypeInfo.has(typeName)) return;

                    const typeDefinition = allTypes[typeName];
                    usedTypeInfo.set(typeName, {
                        label: typeDefinition.label ?? typeName,
                        bgcolor: typeDefinition.bgcolor
                    });
                });
            });
        }
        return usedTypeInfo;
    }

    /**
     * Creates and positions LegendItem instances for each used type.
     * @param {Map<string, {label: string, bgcolor: string}>} usedTypeInfo - Map from getUsedTypes.
     * @returns {LegendItem[]} An array of positioned LegendItem elements.
     */
    createLegendItems(usedTypeInfo) {
        let currentY = PADDING;
        const items = [];

        // Sort items by label for consistent legend order
        const sortedItemsData = Array.from(usedTypeInfo.values()).sort((a, b) =>
            a.label.localeCompare(b.label)
        );

        sortedItemsData.forEach(itemData => {
            const legendItem = new LegendItem(itemData.label, itemData.bgcolor);
            legendItem.setTranslate(PADDING, currentY); // Position item
            items.push(legendItem);

            const itemBBox = legendItem.getBoundingBox();
            currentY += itemBBox.height + PADDING;
        });
        return items;
    }

    /**
     * Creates a background rectangle based on the bounding box of legend items.
     * @param {object|null} itemsBBox - The bounding box { x, y, width, height } of the items.
     * @returns {Rect|null} The background Rect element or null.
     */
    createBackground(itemsBBox) {
        if (!itemsBBox) {
            return null;
        }

        return new Rect(
            itemsBBox.x - PADDING,
            itemsBBox.y - PADDING,
            itemsBBox.width + PADDING * 2,
            itemsBBox.height + PADDING * 2,
            {fill: '#ffffff', stroke: '#cccccc', 'stroke-width': 10, rx: CORNERS, ry: CORNERS}
        );
    }
}
