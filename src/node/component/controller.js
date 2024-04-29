// adc :: controller.js

import { Component } from "../component.js";
import { Manager } from "../system/manager.js";

export class ControllerManager extends Manager {};

export class Controller extends Component {

    static Manager = new ControllerManager();
    
    constructor(name="Controller", parent=null) {
        super(name, parent);
    }

};