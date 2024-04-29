// adc :: ticker.js

import { Component } from "../component.js";
import { System } from "../system.js";

class TickerSystem extends System {};

export class Ticker extends Component {

    static System = new TickerSystem();

    constructor(name="Ticker", parent=null, proc=null) {
        super(name, parent);
        this.proc = proc;
        this.dt = 1/1000;
        this.t = 0;
        this.active = false;

        Ticker.System.add(this);
    }

    update(dt) {
        if (!this.active) return;
        this.t += this.dt * dt;
        if (this.proc) { this.proc(this); }
    }

    play(rate=1) {
        this.dt = rate/1000;
        this.active = true;
        return this;
    }

    pause() {
        this.active = false;
        return this;
    }

    reset(t=0) {
        this.t = t;
        return this;
    }

    stop(t=0) {
        return this.pause().reset(t);
    }
};