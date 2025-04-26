import {Group} from "../elements/Group.js";

export class RootGroup extends Group {

    constructor() {
        super({
            id: 'root',
        });
    }

    /**
     * Moves the group to the origin (0, 0) of the coordinate system.
     */
    reframe() {
        const bBox = this.getBoundingBox();
        this.setTranslate(0 - bBox.x, 0 - bBox.y);
    }
}
