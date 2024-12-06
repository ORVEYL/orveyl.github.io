// adc :: shape.js

import { Scene } from "../scene.js";
import { V4, B4, M4 } from "../../math/vector.js";

import * as Calc from "../../math/calc.js";
import { Any, All, Map, Fold, Min, Max, SmoothMinExp } from "../../math/calc.js";

export class Shape extends Scene {

    constructor(name="Shape") {
        super(name);
        this.invert = false;
        this.sdf = () => 0;
    }

    get shapes() { return this.collect(ch => ch instanceof Shape); }
    get sign() { return this.invert ? -1 : +1; }

    dist(pos=V4.w) { return this.sign * this.sdf(this.local_from_world.ra(pos)); }
    test(pos=V4.w) { return this.dist(pos) <= 0; }

    grad(pos=V4.w, ε=1e-8) {
        // https://github.com/mtwoodard/hypVR-Ray/blob/master/shaders/fragment.glsl
        const [xx, yy, zz] = [
            V4.of(pos.w, 0, 0, pos.x).normalize(),
            V4.of(0, pos.w, 0, pos.y).normalize(),
            V4.of(0, 0, pos.w, pos.z).normalize(),
        ];

        yy.copy(
            yy.sub(xx.dup.sc(yy.ip(xx)))
        ).normalize();
        zz.copy(
            zz.sub(xx.dup.sc(zz.ip(xx)))
                .sub(yy.dup.sc(zz.ip(yy)))
        ).normalize();

        return V4.Σ(
            xx.sc(this.sdf(pos.dup.fma(+ε, xx).normalize()) - this.sdf(pos.dup.fma(-ε, xx).normalize())),
            yy.sc(this.sdf(pos.dup.fma(+ε, yy).normalize()) - this.sdf(pos.dup.fma(-ε, yy).normalize())),
            zz.sc(this.sdf(pos.dup.fma(+ε, zz).normalize()) - this.sdf(pos.dup.fma(-ε, zz).normalize())),
        ).normalize();

        // const C = M4.Center(pos);
        // const [
        //     Xp, Yp, Zp,
        //     Xn, Yn, Zn,
        // ] = [
        //     M4.MovX(+ε), M4.MovY(+ε), M4.MovZ(+ε),
        //     M4.MovX(-ε), M4.MovY(-ε), M4.MovZ(-ε),
        // ].map(M => M.rc(C));

        // const G = V4.of(
        //     this.sdf(Xp.ra(pos)) - this.sdf(Xn.ra(pos)),
        //     this.sdf(Yp.ra(pos)) - this.sdf(Yn.ra(pos)),
        //     this.sdf(Zp.ra(pos)) - this.sdf(Zn.ra(pos)),
        // );

        // G.sc(Calc.InvSqrt(G.x*G.x + G.y*G.y + G.z*G.z));

        // return G;//.copy(M4.Along(pos).ra(G));
    }

    // TODO
    snap(pos=V4.Ew(), ε=1e-2) {
        const p = pos.dup;
        for (let it = 0, d = this.dist(p); it < 100 && Calc.Abs(d) > ε; ++it) {
            const G = this.grad(p);
            p.copy(M4.Mov(G.x, G.y, G.z, -d/2).ra(p));
        }
        return p;
    }

};

export class ShapeJoin extends Shape {
    constructor(name="ShapeJoin") {
        super(name);
        this.sdf = p => Fold(Min, +Infinity)(Map(sh => sh.dist(p))(this.shapes));
    }
};

export class ShapeSmoothJoin extends ShapeJoin {
    constructor(name="ShapeSmoothJoin", λ=1) {
        super(name);
        if (λ>0) {
            this.sdf = p => Fold(SmoothMinExp(λ), +Infinity)(Map(sh => sh.dist(p))(this.shapes));
        }
    }
}

export class ShapeMeet extends Shape {
    constructor(name="ShapeMeet") {
        super(name);
        this.sdf = p => Fold(Max, -Infinity)(Map(sh => sh.dist(p))(this.shapes));
    }
};

const PX = M4.ProjX();
const PK = M4.ProjK();

class Path extends Shape {
    constructor(name="Path") {
        super(name);
        this.sdf = p => 0;
    }
};

class Line extends Path {
    constructor(name="Line") {
        super(name);
        this.sdf = p => PX.ra(p).dist(p);
    }
};

class MotorPath extends Path {
    constructor(name="Path", B=B4.X) {
        super(name);
    }
};


export class Sphere extends Shape {
    constructor(name="Sphere", radius=0) {
        super(name);
        this.radius = radius;
        this.sdf = p => p.dist() - this.radius;
    }
};

export class Horosphere extends Shape {
    constructor(name="Horosphere", radius=0) {
        super(name);
        this.radius = radius;
        this.sdf = p => Calc.Log(p.z + p.w) - this.radius;
    }
};

export class Cylinder extends Shape {
    constructor(name="Cylinder", radius=0) {
        super(name);
        this.radius = radius;
        this.sdf = p => PX.ra(p).dist(p) - this.radius;
    }
};

export class Orthocyl extends Shape {
    constructor(name="Orthocyl", radius=0) {
        super(name);
        this.radius = radius;
        this.sdf = p => PK.ra(p).dist( ) - this.radius;
    }
};

export class Halfspace extends Shape {
    constructor(name="Halfspace", radius=0) {
        super(name);
        this.radius = radius;
        this.sdf = p => (
            (this.radius >= 0) ? (p.x >= 0 ? +1 : -1) : (p.x <= 0 ? -1 : +1)
        ) * PK.ra(p).dist(p) - this.radius;
    }
};

export class Equidistant extends Shape {
    constructor(name="Equidistant", radius=0) {
        super(name);
        this.radius = radius;
        this.sdf = p => PK.ra(p).dist(p) - this.radius;
    }
};

export class Zone extends Shape {
    constructor(name="Zone", radius=0) {
        super(name);
        this.radius = radius;
        this.sdf = p => PX.ra(p).dist( ) - this.radius;
    }
};