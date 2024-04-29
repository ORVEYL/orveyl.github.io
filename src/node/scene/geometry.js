// adc :: geometry.js

import { Scene } from "../scene.js";
import { Vertex, VertexBuffer, IndexBuffer } from "../../gpubuffer.js";
import { Visitor } from "../visitor.js";

export class Geometry extends Scene {
    static Device = null;

    constructor(name="Geometry", parent=null, va=null, ia=null) {
        super(name, parent);

        this.va = va;
        this.ia = ia;
        this.write();

        this.mode = 2;
        this.blend = 0;
    }

    write() {
        this.vb = this.va ? new VertexBuffer(
            Geometry.Device, `${this.name}.vb`, 1,
            Vertex.Layout.Default,
            GPUBufferUsage.COPY_DST,
            this.va.data,
        ).write() : null;

        this.ib = this.ia ? new IndexBuffer(
            Geometry.Device, `${this.name}.ib`,
            GPUBufferUsage.COPY_DST,
            this.ia,
        ).write() : null;

        return this;
    }
};

export class GeometryCollector extends Visitor {
    constructor() {
        super(
            here => (here instanceof Scene && here.visible),
            here => {
                if (here instanceof Geometry) { this.data[here.blend].push(here); }
            },
        );

        this.data = [[],[],[]];
    }
};