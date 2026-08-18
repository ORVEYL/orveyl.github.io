// adc :: drawCollector.js

import { Visitor } from "./visitor.js";
import { Scene } from "./scene.js";
import { Geometry } from "./scene/geometry.js";
import { Light } from "./scene/light.js";

export class DrawCollector extends Visitor {

    static Instance = null;

    constructor() {
        super(
            here => (here instanceof Scene && here.visible),
            here => {
                if (here instanceof Light) { this.lights.push(here); }
                if (here instanceof Geometry) { this.geom[here.blend].push(here); }
            },
        );

        this.geom = [[],[],[]];
        this.lights = [];
    }

    static invalidate() {
        DrawCollector.Instance = null;
    }
};