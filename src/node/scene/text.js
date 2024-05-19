// adc :: text.js

import { Scene } from "../scene.js";
import { Geometry } from "./geometry.js";
import { VertexArray } from "../../gpubuffer.js";
import { V4, M4 } from "../../math/vector.js";

const s = Math.sqrt(2)/2;

export class Text extends Scene {

    static Verts = new VertexArray().push(
        [V4.of(+s, 0, 0, 1)], [V4.of(+s,+s, 0, 1)], [V4.of( 0,+s, 0, 1)],
        [V4.of(-s,+s, 0, 1)], [V4.of(-s, 0, 0, 1)], [V4.of(-s,-s, 0, 1)],
        [V4.of( 0,-s, 0, 1)], [V4.of(+s,-s, 0, 1)], [V4.of( 0, 0, 0, 1)],
    );

    static Dict = new Map();

    static {
        // for (let v of Text.Verts) {
        //     const [x,y] = [v.pos.x, v.pos.y];
        //     v.pos.setW(x*x + y*y + 1);
        // }

        Text.Dict.set(null, [0,1, 1,2, 2,3, 3,4, 4,5, 5,6, 6,7, 7,0, 1,8, 8,5]);
        Text.Dict.set("#", [0,1, 1,2, 2,3, 3,4, 4,5, 5,6, 6,7, 7,0, 8,0, 8,2, 8,4, 8,6]);

        Text.Dict.set("A", [1,2, 2,4, 4,5, 1,0, 0,7, 4,8, 8,0]);
        Text.Dict.set("B", [3,4, 4,5, 3,2, 2,1, 1,8, 8,4, 8,0, 0,7, 7,6, 6,5]);
        Text.Dict.set("C", [1,2, 2,4, 4,5, 5,6, 6,7]);
        Text.Dict.set("D", [0,2, 2,3, 3,4, 4,5, 5,6, 6,7, 7,0]);
        Text.Dict.set("E", [1,2, 2,3, 3,4, 4,5, 5,6, 6,7, 4,8, 8,0]);
        Text.Dict.set("F", [1,2, 2,3, 3,4, 4,5, 4,8]);
        Text.Dict.set("G", [1,2, 2,4, 4,5, 5,6, 6,7, 7,8]);
        Text.Dict.set("H", [3,4, 4,5, 4,8, 8,0, 1,0, 0,7]);
        Text.Dict.set("I", [3,2, 2,1, 2,8, 8,6, 5,6, 6,7]);

        Text.Dict.set("J", [3,2, 2,1, 1,0, 0,6, 6,5]);
        Text.Dict.set("K", [3,4, 4,5, 1,8, 4,8, 8,0, 0,7]);
        Text.Dict.set("L", [3,4, 4,5, 5,6, 6,7]);
        Text.Dict.set("M", [3,4, 4,5, 3,8, 8,2, 2,0, 0,7]);
        Text.Dict.set("N", [3,4, 4,5, 3,2, 2,0, 1,0, 0,7]);
        Text.Dict.set("O", [1,2, 2,4, 4,5, 5,6, 6,7, 7,0, 0,1]);
        Text.Dict.set("P", [3,4, 4,5, 3,2, 2,1, 1,8, 8,4]);
        Text.Dict.set("Q", [1,2, 2,4, 4,5, 5,6, 6,7, 7,0, 0,1, 8,7]);
        Text.Dict.set("R", [3,4, 4,5, 3,2, 2,1, 1,0, 0,8, 8,4, 8,7]);
        
        Text.Dict.set("S", [1,2, 2,4, 4,8, 8,0, 0,7, 7,6, 6,5]);
        Text.Dict.set("T", [3,2, 2,1, 2,8, 8,6]);
        Text.Dict.set("U", [3,4, 4,5, 5,6, 6,0, 0,1, 0,7]);
        Text.Dict.set("V", [3,4, 4,5, 5,6, 6,0, 0,1]);
        Text.Dict.set("W", [3,4, 4,5, 5,8, 8,6, 6,0, 0,1]);
        Text.Dict.set("X", [3,8, 8,7, 1,8, 8,5]);
        Text.Dict.set("Y", [3,8, 1,8, 8,6]);
        Text.Dict.set("Z", [3,2, 2,1, 1,8, 8,5, 5,6, 6,7]);

        Text.Dict.set("0", [0,1, 1,2, 2,3, 3,4, 4,5, 5,6, 6,7, 7,0]);
        Text.Dict.set("1", [3,2, 2,8, 8,6, 5,6, 6,7]);
        Text.Dict.set("2", [3,2, 2,1, 1,0, 0,8, 8,4, 4,5, 5,6, 6,7]);
        Text.Dict.set("3", [3,2, 2,1, 1,0, 0,8, 8,4, 0,7, 7,6, 6,5]);
        Text.Dict.set("4", [3,4, 4,8, 8,0, 1,0, 0,7]);
        Text.Dict.set("5", [1,2, 2,3, 3,4, 4,8, 8,0, 0,7, 7,6, 6,5]);
        Text.Dict.set("6", [1,2, 2,3, 3,4, 4,5, 5,6, 6,7, 7,0, 0,8, 8,4]);
        Text.Dict.set("7", [3,2, 2,1, 1,0, 0,7]);
        Text.Dict.set("8", [1,2, 2,3, 3,4, 4,8, 8,0, 0,1, 4,5, 5,6, 6,7, 7,0]);
        Text.Dict.set("9", [1,2, 2,3, 3,4, 4,8, 8,0, 1,0, 0,7, 7,6, 6,5]);

        Text.Dict.set("+", [4,8, 8,0, 2,8, 8,6]);
        Text.Dict.set("-", [4,8, 8,0]);
        Text.Dict.set("/", [1,8, 8,5]);
        Text.Dict.set("\\", [3,8, 8,7]);
        Text.Dict.set("|", [2,8, 8,6]);

        Text.Dict.set("[", [2,3, 3,4, 4,5, 5,6]);
        Text.Dict.set("]", [2,1, 1,0, 0,7, 7,6]);
        Text.Dict.set("{", [1,8, 8,4, 8,7]);
        Text.Dict.set("}", [3,8, 8,0, 8,5]);
        Text.Dict.set("<", [1,4, 4,7]);
        Text.Dict.set(">", [3,0, 0,5]);
        Text.Dict.set("(", [2,4, 4,6]);
        Text.Dict.set(")", [2,0, 0,6]);

        // 3 2 1
        // 4 8 0
        // 5 6 7
    }

    constructor(name="Text", parent=null) {
        super(name, parent);

        this.text = "#";
        this.cW = 1; this.cH = 1;
        this.dX = 1; this.dY = 1;
        this.offset = 0;
        this.convex = 0;
        this.proc = null; this.iters = 1;
        this.separator = "\r\n";
        this.tabstop = 8;

        this.geom = new Geometry("TextGeom", this);
        this.geom.mode = 1;
    }

    setText(...lines) {
        this.text = lines.join(this.separator);
        return this;
    }

    setSize(width, height, scale=1) {
        this.cW = scale*width;
        this.cH = scale*height;
        return this;
    }

    setSpacing(spacing) {
        this.dY = spacing;
        return this;
    }

    setOffset(offset=0) {
        this.offset = offset;
        return this;
    }

    setProc(proc, iters=1) {
        this.proc = proc; this.iters = iters;
        return this;
    }

    commit() {
        const va = new VertexArray();

        const Cursor = M4.id;

        const Row = M4.id;
        const dR = M4.Motor(0,0,this.convex, 0,1,0, 1,-1, 2*this.dY*this.cH);
        const dRT = dR.dup.T;

        const Col = M4.id;
        const dC = M4.Motor(0,this.convex,0, 1,0,0, 1,+1, 2*this.dX*this.cW);
        const dCT = dC.dup.T;

        const S = M4.D([this.cW, this.cH, 0, 1]);
        const O = M4.Motor(0,this.convex,0, 1,0,0, 1,+1, this.offset * 2*this.dX*this.cW);

        let branch = 0;
        let row = 0;
        let col = 0;
        for (let c of this.text) {
            switch (c) {
                case "\0": Cursor.id; row = col = 0; continue;
                case "\n": Cursor.rm(dR); ++row; continue;
                case " ": Cursor.rm(dC); ++col; continue;

                case "\v": Cursor.rm(dRT); --row; continue;
                case "\b": Cursor.rm(dCT); --col; continue;

                case "\f":
                    while (row) { Cursor.rm(dRT); row -= Math.sign(row); }
                    continue;
                case "\r":
                    while (col) { Cursor.rm(dCT); col -= Math.sign(col); }
                    continue;

                case "\t":
                    do { Cursor.rm(dC); ++col; } while (col%this.tabstop)
                    continue;

                case "@":
                    new Scene(`@${branch++}`, this, Cursor.dup.rm(O));
                    continue;
            }

            const F = M4.id;

            const ia = Text.Dict.get(c) ?? Text.Dict.get(null);
            for (let it = 0; it < this.iters; ++it) {

                const M = M4.rm(
                    Cursor, O, F, S
                );

                for (let i of ia) {
                    const v = Text.Verts[i];
                    va.push([M.ra(v.pos), v.col, v.tex]);
                }

                if (this.proc) this.proc(F);
            }

            Cursor.rm(dC); ++col;
        }

        this.geom.va = va;
        this.geom.write();

        return this;
    }

    getBranches() {
        return this.collect(ch => ch.name.charAt(0) == "@");
    }

    getBranch(idx) {
        const name = `@${idx}`;
        return [...this.children].find(ch => ch.name == name);
    }

};