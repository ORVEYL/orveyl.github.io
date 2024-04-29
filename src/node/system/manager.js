// adc :: manager.js

import { System } from "../system.js";
import { Wrap } from "../../math/calc.js";

export class Manager extends System {
    constructor() {
        super();
        this.nodes = [];
        this.active = null; this.idx = undefined;
    }

    onAdd(node) {}
    onChanged(prev, curr) {}

    add(...nodes) {
        for (let node of nodes) {
            this.nodes.push(node);
            this.onAdd(node);
        }
        return this;
    }

    use(node) {
        if (!this.nodes.find(n => n === node)) this.add(node);

        const prev = this.active;
        this.active = node;
        this.idx = this.nodes.findIndex(n => n === node);

        console.log(
            `${this.constructor.name}[${this.idx}]:\n`,
            this.active,
        );

        if (prev != this.active) this.onChanged(prev, this.active);

        return this.active;
    }

    useName(name) {
        const found = this.nodes.find(node => node.name == name);
        return this.use(found ?? this.active);
    }

    useIndex(idx) {
        this.idx = Wrap(this.nodes.length)(idx);
        return this.use(this.nodes[this.idx]);
    }

    useNext() {
        return this.useIndex(this.idx+1);
    }

    usePrev() {
        return this.useIndex(this.idx-1);
    }
};