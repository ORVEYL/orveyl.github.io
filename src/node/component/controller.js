// adc :: controller.js

import { Component } from "../component.js";
import { System } from "../system.js";

class ControllerSystem extends System {};

export class Controller extends Component {

    static System = new ControllerSystem();
    
    constructor(name="Controller") {
        super(name);
        Controller.System.add(this);
    }

    update(input, dt) {}

};