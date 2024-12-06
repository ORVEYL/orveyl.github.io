// adc :: gpubuffer.js

import { Orveyl } from "./orveyl.js";
import { V4 } from "./math/vector.js";

class GPUBuffer {
    constructor(device, label, usage, size) {
        this.device = device ?? Orveyl.Device;

        this.rawbuf = new ArrayBuffer(size);
        this.u8buf = new Uint8Array(this.rawbuf);

        this.gpubuf = device.createBuffer({
            label: label,
            size: this.u8buf.byteLength,
            usage: usage,
        });

        this.dirty = true;
    }

    realloc(size) {
        this.rawbuf = new ArrayBuffer(size);
        this.u8buf = new Uint8Array(this.rawbuf);

        this.gpubuf = this.device.createBuffer({
            label: this.gpubuf.label,
            size: size,
            usage: this.gpubuf.usage,
        });

        this.dirty = true;

        return this;
    }

    write() {
        if (!this.dirty) return this;
        this.device.queue.writeBuffer(this.gpubuf, 0, this.u8buf);
        this.dirty = false;
        return this;
    }

    set(array, offset) {
        this.u8buf.set(array, offset);
        this.dirty = true;
        return this;
    }
};

export class F32Buffer extends GPUBuffer {
    constructor (device, label, usage, data) {
        super(device, label, usage, Float32Array.BYTES_PER_ELEMENT*data.length);
        this.f32buf = new Float32Array(this.rawbuf);
        this.f32buf.set(data);
    }

    set(array, offset) {
        this.f32buf.set(array, offset);
        this.dirty = true;
        return this;
    }
};

export class U32Buffer extends GPUBuffer {
    constructor (device, label, usage, data) {
        super(device, label, usage, Uint32Array.BYTES_PER_ELEMENT*data.length);
        this.u32buf = new Uint32Array(this.rawbuf);
        this.u32buf.set(data);
    }

    set(array, offset) {
        this.u32buf.set(array, offset);
        this.dirty = true;
        return this;
    }
};

class VertexAttribute {

    static Format = (type, width, count) => {
        /* GPUVertexFormats:
            --          uint8x2         --             uint8x4
            --          uint16x2        --             uint16x4
            uint32      uint32x2        uint32x3       uint32x4

            --          sint8x2         --             sint8x4
            --          sint16x2        --             sint16x4
            sint32      sint32x2        sint32x3       sint32x4

            --          unorm8x2        --             unorm8x4
            --          unorm16x2       --             unorm16x4

            --          snorm8x2        --             snorm8x4
            --          snorm16x2       --             snorm16x4

            --          float16x2       --             float16x4
            float32     float32x2       float32x3      float32x4
        */

        const widths_by_type = {
            uint:  [8,16,32],
            sint:  [8,16,32],
            unorm: [8,16],
            snorm: [8,16],
            float: [16,32],
        };
        const counts_by_width = {
            8:  [2,4],
            16: [2,4],
            32: [1,2,3,4],
        };

        console.assert(type in widths_by_type, `Invalid type "${type}".`);
        console.assert(widths_by_type[type].includes(width), `Invalid width ${width} -- [${widths_by_type[type]}]`);
        console.assert(counts_by_width[width].includes(count), `Invalid count ${count} -- [${counts_by_width[width]}]`);
        const xN = (count>1) ? ["x2", "x3", "x4"][count-2] : "";
        return `${type}${width}${xN}`;
    };

    constructor (label, type, width, count) {
        this.label = label;
        this.format = VertexAttribute.Format(type, width, count);

        this.type = type;
        this.width = width;
        this.count = count;
    }

    get byteLength() { return (this.width / 8) * this.count; }
};

export class Vertex {
    static Layout = {};
    static {
        Vertex.Layout.Default = {
            arrayStride: 4*12,
            attributes: [
                {
                    label: "pos", default: [0,0,0,1],
                    format: VertexAttribute.Format("float", 32, 4),
                    offset: 0,
                    shaderLocation: 0,
                },
                {
                    label: "col", default: [1,1,1,1],
                    format: VertexAttribute.Format("float", 32, 4),
                    offset: 16,
                    shaderLocation: 1,
                },
                {
                    label: "tex", default: [0.5, 0.5, 0.5, 0.5],
                    format: VertexAttribute.Format("float", 32, 4),
                    offset: 32,
                    shaderLocation: 2,
                },
            ],
        };

        Vertex.Layout.Splat = {
            stepMode: "instance",
            ...Vertex.Layout.Default,
        };
    }

    constructor(layout=Vertex.Layout.Default, attrlist) {
        let i = 0;
        for (let attr of layout.attributes) {
            this[attr.label] = V4.from(attrlist[i++] ?? attr.default);
        }
    }
};

export class VertexArray extends Array {

    constructor(layout=Vertex.Layout.Default) {
        super();
        this.layout = layout;
    }

    push(...verts) {
        for (let vert of verts) {
            if (vert instanceof Vertex) {
                super.push(vert);
            } else {
                super.push(new Vertex(this.layout, vert))
            }
        }
        return this;
    }

    get data() {
        const out = [];
        for (let v of this) {
            for (let attr of this.layout.attributes) {
                out.push(...v[attr.label]);
            }
        }
        return out;
    }
};

export class VertexBuffer extends F32Buffer {
    constructor (device, label, instance_count, layout, usage, data) {
        super(device, label, GPUBufferUsage.VERTEX | usage, data);
        //this.instance_count = AbsMath.Clamp(instance_count, 1, AbsGPU.InstanceCount);
        this.layout = layout;
    }

    get count() { return this.f32buf.byteLength / this.layout.arrayStride; }
};

export class IndexArray extends Array {
    constructor() {
        super();
        this.base = 0;
    }

    push(...indices) {
        for (let idx of indices) {
            super.push(this.base + idx);
        }
    }
};

export class IndexBuffer extends U32Buffer {
    constructor (device, label, usage, data) {
        super(device, label, GPUBufferUsage.INDEX | usage, data);
    }

    get count() { return this.u32buf.length; }
};