import {PINSPACE} from "./Constants.js";

const UNCALIBRATED_SIZE = 5000; // 50mm, size of the longest image side when no scale can be derived
const DEVIATION_WARNING = 0.05; // warn when a header's pin spacing is off by more than 5%
const MISMATCH_WARNING = 100; // warn when back holes are more than 1mm away from their front counterparts
const SIDES = ['left', 'right', 'top', 'bottom'];

/**
 * Image-first layout
 *
 * Instead of a fixed pin grid that the image has to be adjusted to, the PCB photo defines the
 * coordinate system. Pin headers are placed on the photo by giving the pixel coordinates of their
 * first and last hole, the holes in between are spaced equally. The known pin pitch is then used
 * to derive the real world scale of the photo, so the output is still printable at 100%.
 *
 * Headers can optionally be placed on the back photo independently. The back photo is then fitted
 * onto the (mirrored) front, so both diagrams can still be folded on top of each other.
 *
 * All returned coordinates are in SVG units (1/100 mm).
 */
export class PhotoLayout {

    /**
     * @param {object} setup The full configuration, using `headers` instead of `pins`
     */
    constructor(setup) {
        this.pitch = setup.pitch ?? 2.54;
        this.front = setup.image?.front ?? {};
        this.back = setup.image?.back ?? {};

        if (!this.front.src) {
            throw new Error('Layouts using headers need a front image (image.front.src)');
        }
        this.checkImage(this.front, 'front');
        if (this.back.src) this.checkImage(this.back, 'back');

        this.headers = (setup.headers ?? []).map((header, index) => this.normalizeHeader(header, index));
        this.scale = this.calibrate();
        this.sheetWidth = this.front.naturalWidth * this.scale; // the axis we mirror the back side on
        this.backMatrix = this.fitBack();
    }

    /**
     * Make sure the dimensions of an image are known
     *
     * @param {object} image The image configuration
     * @param {string} side Which image this is
     * @throws {Error} If the image could not be loaded or measured
     */
    checkImage(image, side) {
        if (image.naturalWidth && image.naturalHeight) return;
        if (image.error) {
            throw new Error(`Could not load the ${side} image: ${image.error}`);
        }
        throw new Error(`Could not determine the dimensions of the ${side} image "${image.src.substring(0, 100)}"`);
    }

    /**
     * Validate a header definition, fill in defaults and calculate its hole positions
     *
     * @param {object} header
     * @param {int} index
     * @returns {{side: string, pitch: number, pins: Array<string[]|null>, holes: {x: number, y: number}[], back: {side: string|undefined, holes: {x: number, y: number}[]}|null}}
     */
    normalizeHeader(header, index) {
        const name = `Header ${index + 1}`;

        // pins can be given as a single label string for convenience
        let pins = (header?.pins ?? []).map(pin => {
            if (pin === null || pin === undefined) return null;
            return (Array.isArray(pin) ? pin : [pin]).map(String);
        });

        const count = header?.count ?? pins.length;
        if (pins.length > count) {
            console.warn(`${name}: ${pins.length} pins defined, but count is ${count}. Ignoring excess pins.`);
            pins = pins.slice(0, count);
        }
        pins = pins.concat(Array(count - pins.length).fill([]));

        const holes = this.holePositions(header, count, name);
        const side = header.side ?? this.guessSide(holes);
        if (!SIDES.includes(side)) {
            throw new Error(`${name}: side must be one of ${SIDES.join(', ')}`);
        }

        let back = null;
        if (header.back) {
            if (!this.back.src) {
                throw new Error(`${name}: back coordinates need a back image (image.back.src)`);
            }
            back = {
                side: header.back.side,
                holes: this.holePositions(header.back, count, `${name} (back)`),
            };
            if (back.side !== undefined && !SIDES.includes(back.side)) {
                throw new Error(`${name} (back): side must be one of ${SIDES.join(', ')}`);
            }
        }

        return {
            side,
            pitch: header.pitch ?? this.pitch,
            pins,
            holes,
            back,
        };
    }

    /**
     * Space holes equally between the start and end coordinates
     *
     * @param {object} coordinates Object with start and end pixel coordinates
     * @param {int} count Number of holes
     * @param {string} name Header name for error messages
     * @returns {{x: number, y: number}[]}
     */
    holePositions(coordinates, count, name) {
        const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

        if (!isPoint(coordinates?.start)) {
            throw new Error(`${name}: start must be the pixel coordinates [x, y] of the first hole`);
        }
        if (count > 1 && !isPoint(coordinates.end)) {
            throw new Error(`${name}: end must be the pixel coordinates [x, y] of the last hole`);
        }

        const [x1, y1] = coordinates.start;
        const [x2, y2] = count > 1 ? coordinates.end : coordinates.start;
        if (count > 1 && x1 === x2 && y1 === y2) {
            throw new Error(`${name}: start and end can't be the same point`);
        }

        return Array.from({length: count}, (_, i) => {
            const t = count > 1 ? i / (count - 1) : 0;
            return {x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t};
        });
    }

    /**
     * Labels point away from the board: vertical headers get their labels on the closer
     * of the left or right edge, horizontal ones on the closer of top or bottom.
     *
     * @param {{x: number, y: number}[]} holes
     * @returns {string}
     */
    guessSide(holes) {
        if (!holes.length) return 'left';
        const first = holes[0];
        const last = holes[holes.length - 1];
        const cx = (first.x + last.x) / 2;
        const cy = (first.y + last.y) / 2;
        if (Math.abs(last.x - first.x) <= Math.abs(last.y - first.y)) {
            return cx < this.front.naturalWidth / 2 ? 'left' : 'right';
        }
        return cy < this.front.naturalHeight / 2 ? 'top' : 'bottom';
    }

    /**
     * Derive the scale (SVG units per front image pixel) from the hole spacing of all headers
     *
     * @returns {number}
     */
    calibrate() {
        const estimates = [];
        this.headers.forEach((header, index) => {
            if (header.holes.length < 2) return;
            const first = header.holes[0];
            const last = header.holes[header.holes.length - 1];
            const pixelPitch = Math.hypot(last.x - first.x, last.y - first.y) / (header.holes.length - 1);
            estimates.push({index, scale: header.pitch * PINSPACE / 2.54 / pixelPitch});
        });

        if (!estimates.length) {
            this.calibrated = false;
            return UNCALIBRATED_SIZE / Math.max(this.front.naturalWidth, this.front.naturalHeight);
        }
        this.calibrated = true;

        const scale = estimates.reduce((sum, e) => sum + e.scale, 0) / estimates.length;
        estimates.forEach(({index, scale: estimate}) => {
            const deviation = Math.abs(estimate - scale) / scale;
            if (deviation > DEVIATION_WARNING) {
                console.warn(
                    `Header ${index + 1}: hole spacing deviates ${Math.round(deviation * 100)}% from the average. ` +
                    `Check its start and end coordinates and its pin count.`
                );
            }
        });
        return scale;
    }

    /**
     * Where a front hole ends up in the back view
     *
     * @param {{x: number, y: number}} hole Front image pixel coordinates
     * @returns {{x: number, y: number}}
     */
    mirrorHole({x, y}) {
        return {x: this.sheetWidth - x * this.scale, y: y * this.scale};
    }

    /**
     * Find the transformation from back image pixels to back view coordinates
     *
     * When headers have back coordinates, the back photo is scaled, rotated and moved so its holes
     * match the mirrored front holes as closely as possible (least squares). Otherwise it is centered
     * at the front image's scale. Without a back image, the front image is mirrored.
     *
     * @returns {number[]} SVG transformation matrix
     */
    fitBack() {
        const s = this.scale;
        if (!this.back.src) {
            return [-s, 0, 0, s, this.sheetWidth, 0];
        }

        const pairs = this.headers
            .filter(header => header.back)
            .flatMap(header => header.holes.map((hole, i) => ({
                from: header.back.holes[i],
                to: this.mirrorHole(hole),
            })));

        const distinct = new Set(pairs.map(({from}) => `${from.x},${from.y}`));
        if (distinct.size < 2) {
            if (pairs.length) {
                console.warn('Back coordinates need at least two different holes to align the back image, ignoring them.');
            }
            return [
                s, 0, 0, s,
                (this.front.naturalWidth - this.back.naturalWidth) * s / 2,
                (this.front.naturalHeight - this.back.naturalHeight) * s / 2,
            ];
        }

        // similarity transform to = a * from + t, with a and t as complex numbers
        const mean = (points) => ({
            x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
            y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        });
        const fromMean = mean(pairs.map(p => p.from));
        const toMean = mean(pairs.map(p => p.to));

        let re = 0, im = 0, norm = 0;
        pairs.forEach(({from, to}) => {
            const fx = from.x - fromMean.x, fy = from.y - fromMean.y;
            const tx = to.x - toMean.x, ty = to.y - toMean.y;
            re += tx * fx + ty * fy;
            im += ty * fx - tx * fy;
            norm += fx * fx + fy * fy;
        });
        re /= norm;
        im /= norm;

        const matrix = [
            re, im, -im, re,
            toMean.x - (re * fromMean.x - im * fromMean.y),
            toMean.y - (im * fromMean.x + re * fromMean.y),
        ];

        const rotation = Math.atan2(im, re) * 180 / Math.PI;
        if (Math.abs(rotation) > 45) {
            console.warn(
                `The back image had to be rotated by ${Math.round(rotation)}° to match the front. ` +
                `Make sure back start and end point to the same first and last pin as on the front.`
            );
        }

        this.headers.forEach((header, index) => {
            if (!header.back) return;
            const offset = Math.max(...header.holes.map((hole, i) => {
                const fitted = this.transformPoint(matrix, header.back.holes[i]);
                const target = this.mirrorHole(hole);
                return Math.hypot(fitted.x - target.x, fitted.y - target.y);
            }));
            if (offset > MISMATCH_WARNING) {
                console.warn(
                    `Header ${index + 1}: back holes are up to ${(offset / 100).toFixed(1)}mm off from the front. ` +
                    `Check the back start and end coordinates, they need to point to the same first and last pin as on the front.`
                );
            }
        });

        return matrix;
    }

    /**
     * All holes with their labels as seen from the given side
     *
     * @param {boolean} flipped Whether to look at the back side
     * @returns {{x: number, y: number, side: string, labels: string[]}[]}
     */
    holes(flipped) {
        const mirroredSide = {left: 'right', right: 'left'};

        return this.headers.flatMap(header => header.holes
            .map((hole, i) => {
                if (header.pins[i] === null) return null; // explicitly no hole here

                if (!flipped) {
                    return {x: hole.x * this.scale, y: hole.y * this.scale, side: header.side, labels: header.pins[i]};
                }

                const position = header.back
                    ? this.transformPoint(this.backMatrix, header.back.holes[i])
                    : this.mirrorHole(hole);
                return {
                    ...position,
                    side: header.back?.side ?? mirroredSide[header.side] ?? header.side,
                    labels: header.pins[i],
                };
            })
            .filter(Boolean)
        );
    }

    /**
     * Pin definitions in the format the legend expects
     *
     * @returns {Array<Array<string[]|null>>}
     */
    pinsData() {
        return this.headers.map(header => header.pins);
    }

    /**
     * The photo to show for the given side and the PCB area it occupies
     *
     * The area is the same for front and back (mirrored), so both diagrams can be folded on top of each other.
     *
     * @param {boolean} flipped Whether to look at the back side
     * @returns {{placement: object, bounds: {x: number, y: number, width: number, height: number}}}
     */
    pcb(flipped) {
        const front = this.placement(this.front, 'front', [this.scale, 0, 0, this.scale, 0, 0]);
        const back = this.back.src
            ? this.placement(this.back, 'back', this.backMatrix)
            : this.placement(this.front, 'front', this.backMatrix);

        const bounds = this.union(this.transformRect(front), this.mirrorRect(this.transformRect(back)));

        return flipped
            ? {placement: back, bounds: this.mirrorRect(bounds)}
            : {placement: front, bounds};
    }

    /**
     * @param {object} image The image configuration
     * @param {string} side Which photo this is
     * @param {number[]} matrix SVG transformation matrix from image pixels to SVG units
     * @returns {object}
     */
    placement(image, side, matrix) {
        return {
            src: image.src,
            side,
            width: image.naturalWidth,
            height: image.naturalHeight,
            opacity: image.opacity ?? 0.5,
            grayscale: image.grayscale ?? true,
            matrix,
        };
    }

    transformPoint([a, b, c, d, e, f], {x, y}) {
        return {x: a * x + c * y + e, y: b * x + d * y + f};
    }

    /**
     * Axis aligned bounding box of a transformed image
     */
    transformRect({width, height, matrix}) {
        const corners = [{x: 0, y: 0}, {x: width, y: 0}, {x: 0, y: height}, {x: width, y: height}]
            .map(corner => this.transformPoint(matrix, corner));
        const xs = corners.map(p => p.x);
        const ys = corners.map(p => p.y);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return {x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y};
    }

    mirrorRect(rect) {
        return {...rect, x: this.sheetWidth - rect.x - rect.width};
    }

    union(r1, r2) {
        const x = Math.min(r1.x, r2.x);
        const y = Math.min(r1.y, r2.y);
        return {
            x,
            y,
            width: Math.max(r1.x + r1.width, r2.x + r2.width) - x,
            height: Math.max(r1.y + r1.height, r2.y + r2.height) - y,
        };
    }
}
