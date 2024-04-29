// adc :: camera.js

import { Scene } from "../scene.js";
import { Manager } from "../system/manager.js";

export class CameraManager extends Manager {};

export class Camera extends Scene {

    static Manager = new CameraManager();

    constructor(name="Camera", parent=null, relativeTf) {
        super(name, parent, relativeTf);
    }

};