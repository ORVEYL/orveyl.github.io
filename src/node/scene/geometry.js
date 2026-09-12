// adc :: geometry.js

import { Orveyl } from "../../orveyl.js";

import { Scene } from "../scene.js";
import {
    F32Buffer,
    Vertex, VertexArray, VertexBuffer,
    IndexArray, IndexBuffer,
} from "../../gpubuffer.js";

import { DrawCollector } from "../drawCollector.js";
import { M4 } from "/src/math/vector.js";

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

        this.bg_objData = null;
        this.write();

        this.mode = 2;
        this.blend = 0;
    }

    invalidate() {
        super.invalidate();
        DrawCollector.invalidate();
        return this.write();
    }

    write_vb() {
        this.vb = this.va ? new VertexBuffer(
            Geometry.Device, `${this.name}.vb`, 1,
            Vertex.Layout.Default,
            GPUBufferUsage.COPY_DST,
            this.va.data,
        ).write() : null;
        return this;
    }

    write_ib() {
        this.ib = this.ia ? new IndexBuffer(
            Geometry.Device, `${this.name}.ib`,
            GPUBufferUsage.COPY_DST,
            this.ia,
        ).write() : null;
        return this;
    }

    write_ob() {
        this.ob.mat.set(this.world_from_local, 0).write();
        this.ob.tint.set(this.tint ?? [1,1,1,1], 0).write();

        // TODO: relative transform invalidations causing reallocs
        if (!this.bg_objData) {
            this.bg_objData = Orveyl.Device.createBindGroup({
                label: `${this.name}.bg_objData`,
                layout: Orveyl.BindGroupLayouts.ObjectData,
                entries: [
                    { binding: 0, resource: { buffer: this.ob.mat.gpubuf } },
                    { binding: 1, resource: { buffer: this.ob.tint.gpubuf } },
                ],
            });
        }

        return this;
    }

    write() {
        this.write_vb();
        this.write_ib();
        this.write_ob();
        return this;
    }

    setVisible(visible) {
        if (visible != this.visible) DrawCollector.invalidate();
        return super.setVisible(visible);
    }

    setMode(mode) {
        this.mode = mode;
        return this;
    }

    setBlend(blend) {
        this.blend = blend;
        return this;
    }

    append(geom, rel=M4.id, paint=src=>src) {
        if (this.va) {
            if (this.ia) this.ia.base = this.va.length;
            for (let v of geom.va) {
                this.va.push([rel.ra(v.pos), paint(v.col)]);
            }
        } else {
            if (geom.va) {
                this.va = new VertexArray();
                for (let v of geom.va) {
                    this.va.push([rel.ra(v.pos), paint(v.col)]);
                }
            }
        }

        if (this.ia) this.ia.push(...geom.ia);
        else this.ia = geom.ia ? new IndexArray().push(...geom.ia) : this.ia;

        return this;
    }
};