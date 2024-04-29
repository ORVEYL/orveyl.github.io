// adc :: system.js

export class System {
    static Instances = new Set();

    constructor() {
        System.Instances.add(this);
        this.nodes = new Set();
    }

    add(...nodes) {
        for (let node of nodes) { this.nodes.add(node); }
    }

    update(...args) {
        for (let node of this.nodes) {
            node.update(...args);
        }
    }
};