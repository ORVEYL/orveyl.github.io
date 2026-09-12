// adc :: light.js

import { Scene } from "../scene.js";
import { F32Buffer } from "../../gpubuffer.js";
import { Orveyl } from "../../orveyl.js";

import { DrawCollector } from "../drawCollector.js";

export class Light extends Scene {
    static Mode = {
        Point: 0,
        Line: 1,  Collar: 2,
        Plane: 3, Zone: 4,
        Ambient: 5,
    };

    constructor (name="Light", mode=Light.Mode.Point, r0=0, r1=1, tint=[1,1,1,1]) {
        super(name);

        this.mode = mode;
        this.r0 = r0;
        this.r1 = r1;
        this.tint = tint;

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

        this.lb = {
            params: new F32Buffer(
                Orveyl.Device, `${name}.lb.params`,
                GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                new Float32Array(3),
            ),
        };

        this.bg_lightData = null;

        this.write();
    }

    invalidate() {
        super.invalidate();
        DrawCollector.invalidate();
        return this.write();
    }

    write() {
        this.ob.mat.set(this.world_from_local, 0).write();
        this.ob.tint.set(this.tint ?? [1,1,1,1], 0).write();
        

        this.bg_objData = Orveyl.Device.createBindGroup({
            label: `${this.name}.bg_objData`,
            layout: Orveyl.BindGroupLayouts.ObjectData,
            entries: [
                { binding: 0, resource: { buffer: this.ob.mat.gpubuf } },
                { binding: 1, resource: { buffer: this.ob.tint.gpubuf } },
            ],
        });

        this.lb.params.set(
            [this.mode, this.r0, this.r1], 0
        ).write();

        this.bg_lightData = Orveyl.Device.createBindGroup({
            label: `${name}.bg_lightData`,
            layout: Orveyl.BindGroupLayouts.LightData,
            entries: [
                { binding: 0, resource: { buffer: this.lb.params.gpubuf } },
            ],
        });

        return this;
    }
};