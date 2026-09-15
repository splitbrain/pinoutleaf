import {Group} from '../elements/Group.js';
import {Image} from '../elements/Image.js';

/**
 * The PCB photo of an image-first layout (see PhotoLayout)
 *
 * The image is drawn in its own pixel coordinates and transformed into place. This keeps the
 * pixel coordinates recoverable from the rendered SVG, which the editor uses to pick hole positions.
 */
export class PhotoPcb extends Group {

    /**
     * @param {object} placement Image placement from PhotoLayout.pcb()
     * @param {{x: number, y: number, width: number, height: number}} bounds The area this PCB occupies
     */
    constructor(placement, bounds) {
        super();
        this.bounds = bounds;

        const {src, side, width, height, opacity, grayscale, matrix} = placement;
        const attrs = {
            transform: `matrix(${matrix.join(' ')})`,
            opacity,
            class: 'pcb-photo',
            'data-side': side,
        };
        if (grayscale) {
            attrs.filter = 'url(#grayscale)';
        }

        this.append(new Image(0, 0, width, height, src, attrs));
    }

    /**
     * The image's own bounding box ignores its transform, so we report the precalculated area
     */
    getBoundingBox() {
        return {...this.bounds};
    }
}
