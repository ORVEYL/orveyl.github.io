// adc :: text.js

import { Scene } from "../scene.js";
import { Geometry } from "./geometry.js";
import { VertexArray } from "../../gpubuffer.js";
import { V4, B4, M4 } from "../../math/vector.js";

const s = Math.sqrt(2)/2;

// TODO: this entire class is a STATEFUL MESS.
// please replace it with something less terrible
// at some point in the future
export class Text extends Geometry {

    // TODO: consider a uniform NxN grid for more flexible glyphs
    /*
        9 A B
         HCI
        3 2 1
        4 8 0
          M
        5J6K7
        GL
        D E F
    */

    static Verts = new VertexArray().push(
        [V4.of(+s, 0, 0, 1)], [V4.of(+s,+s, 0, 1)], [V4.of( 0,+s, 0, 1)],
        [V4.of(-s,+s, 0, 1)], [V4.of(-s, 0, 0, 1)], [V4.of(-s,-s, 0, 1)],
        [V4.of( 0,-s, 0, 1)], [V4.of(+s,-s, 0, 1)], [V4.of( 0, 0, 0, 1)],

        [V4.of(-s,+3*s, 0, 1)], [V4.of( 0,+3*s, 0, 1)], [V4.of(+s,+3*s, 0, 1)],
        [V4.of(0,+2*s, 0, 1)],

        [V4.of(-s,-3*s, 0, 1)], [V4.of( 0,-3*s, 0, 1)], [V4.of(+s,-3*s, 0, 1)],
        [V4.of(-s,-2*s, 0, 1)],

        [V4.of(-s/8,+2*s, 0, 1)],
        [V4.of(+s/8,+2*s, 0, 1)],

        [V4.of(-s/8,-s, 0, 1)],
        [V4.of(+s/8,-s, 0, 1)],
        [V4.of(-s/8,-3*s/2, 0, 1)],
        [V4.of(0,-s/2,0,1)],
        [V4.of(0,+s/4,0,1)],
    );

    static Dict = new Map();

    static { // yes, i did enter all of these values manually
        Text.Dict.set(null, [0,1, 1,2, 2,3, 3,4, 4,5, 5,6, 6,7, 7,0, 1,8, 8,5]);
        Text.Dict.set(" ", []);
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

        Text.Dict.set("a", [7,1, 1,3, 3,5, 5,0]);
        Text.Dict.set("b", [9,5, 5,7, 7,1, 1,4]);
        Text.Dict.set("c", [1,4, 4,5, 5,7]);
        Text.Dict.set("d", [11,7, 0,3, 3,5, 5,7]);
        Text.Dict.set("e", [4,1, 1,3, 3,5, 5,7]);
        Text.Dict.set("f", [11,12, 12,6, 6,16, 3,1]);
        Text.Dict.set("g", [1,3, 3,5, 5,0, 1,15, 15,16]);
        Text.Dict.set("h", [9,5, 4,1, 1,7]);
        Text.Dict.set("i", [3,2, 2,6, 5,7, 17,18]);
        Text.Dict.set("j", [3,2, 2,14, 14,16, 17,18]);
        Text.Dict.set("k", [9,5, 1,4, 4,0, 0,7]);
        Text.Dict.set("l", [9,10, 10,6, 6,0]);
        Text.Dict.set("m", [3,5, 4,2, 2,6, 8,1, 1,7]);
        Text.Dict.set("n", [3,5, 4,1, 1,7]);
        Text.Dict.set("o", [1,3, 3,5, 5,7, 7,1]);
        Text.Dict.set("p", [3,13, 4,1, 1,7, 7,5]);
        Text.Dict.set("q", [1,3, 3,5, 5,0, 1,15]);
        Text.Dict.set("r", [3,5, 4,1]);
        Text.Dict.set("s", [1,4, 4,0, 0,7, 7,16]);
        Text.Dict.set("t", [10,6, 3,1]);
        Text.Dict.set("u", [3,5, 5,0, 1,7]);
        Text.Dict.set("v", [3,5, 5,0, 0,1]);
        Text.Dict.set("w", [3,5, 5,8, 2,6, 6,0, 0,1]);
        Text.Dict.set("x", [3,7, 1,5]);
        Text.Dict.set("y", [3,5, 5,0, 1,15, 15,16]);
        Text.Dict.set("z", [3,1, 1,5, 5,7]);

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
        Text.Dict.set(".", [19,20]);
        Text.Dict.set(",", [20,21]);
        Text.Dict.set("!", [2,8, 8,22, 19,20]);
        Text.Dict.set("?", [3,1, 1,8, 8,22, 19,20]);
        Text.Dict.set("'", [23,2]);

        Text.Dict.set("[", [2,3, 3,4, 4,5, 5,6]);
        Text.Dict.set("]", [2,1, 1,0, 0,7, 7,6]);
        Text.Dict.set("{", [1,8, 8,4, 8,7]);
        Text.Dict.set("}", [3,8, 8,0, 8,5]);
        Text.Dict.set("<", [1,4, 4,7]);
        Text.Dict.set(">", [3,0, 0,5]);
        Text.Dict.set("(", [2,4, 4,6]);
        Text.Dict.set(")", [2,0, 0,6]);

        // orkind hexadecimal
        Text.Dict.set("0x0", [1,5]);
        Text.Dict.set("0x1", [1,5, 5,7]);
        Text.Dict.set("0x2", [1,5, 8,7]);
        Text.Dict.set("0x3", [1,5, 5,7, 7,8]);
        Text.Dict.set("0x4", [3,1, 1,5]);
        Text.Dict.set("0x5", [3,1, 1,5, 5,7]);
        Text.Dict.set("0x6", [3,1, 1,5, 8,7]);
        Text.Dict.set("0x7", [3,1, 1,5, 5,7, 7,8]);
        Text.Dict.set("0x8", [3,8, 1,5]);
        Text.Dict.set("0x9", [3,8, 1,5, 5,7]);
        Text.Dict.set("0xA", [3,8, 1,5, 8,7]);
        Text.Dict.set("0xB", [3,8, 1,5, 5,7, 7,8]);
        Text.Dict.set("0xC", [8,3, 3,1, 1,5]);
        Text.Dict.set("0xD", [8,3, 3,1, 1,5, 5,7]);
        Text.Dict.set("0xE", [8,3, 3,1, 1,5, 8,7]);
        Text.Dict.set("0xF", [8,3, 3,1, 1,5, 5,7, 7,8]);
    }

    constructor(name="Text") {
        super(name);
        this.mode = 1;

        this.text = "#";

        this.scale = 1;
        this.cW = 1; this.cH = 1;
        this.dC = 1; this.dR = 1;

        this.bc = B4.zero;
        this.br = B4.zero;
        
        this.offset = 0;
        this.proc = null; this.iters = 1;
        this.separator = "\r\n";
        this.tabstop = 8;

        this.wrapcol = Infinity;
        this.wrap_on_space = true;

        this.glyphTransform = M4.id;
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

    setSpacing(col_spacing, row_spacing) {
        this.dC = col_spacing;
        this.dR = row_spacing;
        return this;
    }

    setOffset(offset=0) {
        this.offset = offset;
        return this;
    }

    setWrap(wrapcol=Infinity, on_space=true) {
        this.wrapcol = wrapcol;
        this.wrap_on_space = on_space;
        return this;
    }

    setProc(proc, iters=1) {
        this.proc = proc; this.iters = iters;
        return this;
    }

    setColor(fg_color=V4.ones) {
        this.tint = fg_color;
        return this;
    }

    setColCurve(di, dj, dk, dX, dY, dZ) {
        this.bc.set(di, dj, dk, dX, dY, dZ);
        return this;
    }

    setRowCurve(di, dj, dk, dX, dY, dZ) {
        this.br.set(di, dj, dk, dX, dY, dZ);
        return this;
    }

    commit() {
        if (!this.text) {
            this.va = null;
            return this.write();
        }

        const va = new VertexArray();

        const Cursor = M4.id;
        const CursorCR = M4.id;

        const Col = M4.id;
        const dCol = (() => {
            const bc = this.bc.dup;
            bc.scSpin(2*this.cW);
            bc.X += this.dC; bc.X *= 2*this.cW;
            bc.Y *= -2*this.cH;
            return bc;
        })().exp();
        const dCT = dCol.dup.T;
        
        const Row = M4.id;
        const dRow = (() => {
            const br = this.br.dup;
            br.scSpin(2*this.cH);
            br.X *= 2*this.cW;
            br.Y += this.dR; br.Y *= -2*this.cH;
            return br;
        })().exp();
        const dRT = dRow.dup.T;

        const S = M4.D([this.cW, this.cH, 0, 1]);
        const s = M4.D([this.cW, this.cH/2, 0, 1]);
        s.addC(3, V4.of(0,-this.cH/3,0,0));

        const oCol = (() => {
            const bc = this.bc.dup;
            bc.scSpin(2*this.cW);
            bc.X += this.dC; bc.X *= 2*this.cW;
            bc.Y *= -2*this.cH;
            return bc.sc(this.offset);
        })().exp();

        let branch = 0;
        let row = 0;
        let col = 0;
        let hex = false;

        const doFF = () => {
            Cursor.id; row = col = 0;
        };

        const doCR = () => {
            Cursor.copy(CursorCR);
            col = 0;
        };

        const doLF = () => {
            Cursor.rm(dRow);
            CursorCR.copy(Cursor);
            ++row;
        };

        const doTab = () => {
            do Cursor.rm(dCol); while ((++col)%this.tabstop);
        };

        const doBackspace = () => {
            Cursor.rm(dCT); --col;
        };

        const doBackline = () => {
            Cursor.rm(dRT); --row;
        };

        // TODO: factor out per-glyph commit logic
        // can parse out entire substrings of input as keys to Dict
        // instead of limiting to single characters
        for (let i = 0; i < this.text.length; ++i) {
            const c = this.text.at(i);

            switch (c) {
                case "\f": doFF(); continue;
                case "\r": doCR(); continue;
                case "\n": doLF(); continue;
                case "\t": doTab(); continue;
                case "\v": doBackline(); continue;
                case "\b": doBackspace(); continue;

                case "@":
                    new Scene(`@${branch++}`, Cursor.dup.rm(oCol)).attachTo(this);
                    continue;

                case "$": hex = true; continue;
                case ";": hex = false; continue;

                // TODO: parse #rrggbb; values for mid-text coloring
            }

            if (col >= this.wrapcol) {
                if (!this.wrap_on_space) {
                    doCR(); doLF();
                } else if (/\s/.test(c)) {
                    doCR(); doLF();
                    // discard current whitespace char
                    continue;
                }
            }

            const F = M4.id;

            const ia = (hex ? Text.Dict.get(`0x${c.toUpperCase()}`) : Text.Dict.get(c)) ?? Text.Dict.get(null);
            const cap = hex || (c && (c == c.toUpperCase()));
            for (let it = 0; it < this.iters; ++it) {

                const Co = M4.rm(Cursor, oCol, this.glyphTransform);
                const M = M4.rm(
                    Co, F, cap ? S : s
                );

                for (let i of ia) {
                    const v = Text.Verts[i];
                    va.push([M.ra(v.pos)]);
                }

                if (this.proc) this.proc(F);
            }

            Cursor.rm(dCol); ++col;
        }

        this.va = va;
        return this.write();
    }

    getBranches() {
        return this.collect(ch => ch.name.charAt(0) == "@");
    }

    getBranch(idx) {
        const name = `@${idx}`;
        return [...this.children].find(ch => ch.name == name);
    }

};