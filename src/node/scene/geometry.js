// adc :: geometry.js

import { Scene } from "../scene.js";
import { F32Buffer, Vertex, VertexBuffer, IndexBuffer } from "../../gpubuffer.js";
import { Visitor } from "../visitor.js";
import { Orveyl } from "../../orveyl.js";

export class Geometry extends Scene {
    static Device = null;

    constructor(name="Geometry", va=null, ia=null) {
        super(name);

        this.va = va;
        this.ia = ia;

        this.ob = {
            mat: new F32Buffer(
                Orveyl.Device, `${name}.ob.mat`,
                GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                new Float32Array(16),
            ),
            tint: new F32Buffer(
                Orveyl.Device, `${name}.ob.mat`,
                GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                new Float32Array(4),
            ),
        };

        this.bg = Orveyl.Device.createBindGroup({
            label: `${name}.bg`,
            layout: Orveyl.BindGroupLayouts.ObjectData,
            entries: [
                { binding: 0, resource: { buffer: this.ob.mat.gpubuf } },
                { binding: 1, resource: { buffer: this.ob.tint.gpubuf } },
            ],
        });

        this.write();

        this.mode = 2;
        this.blend = 0;
    }

    invalidate() {
        super.invalidate();
        Orveyl.DrawCache.Collector = null;
        return this.write();
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

        this.ob?.mat.set(this.world_from_local, 0).write();
        this.ob?.tint.set(this.tint ?? [1,1,1,1], 0).write();

        this.bg = Orveyl.Device.createBindGroup({
            label: `${this.name}.bg`,
            layout: Orveyl.BindGroupLayouts.ObjectData,
            entries: [
                { binding: 0, resource: { buffer: this.ob.mat.gpubuf } },
                { binding: 1, resource: { buffer: this.ob.tint.gpubuf } },
            ],
        });

        return this;
    }

    setMode(mode) {
        this.mode = mode;
        return this;
    }

    setBlend(blend) {
        this.blend = blend;
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