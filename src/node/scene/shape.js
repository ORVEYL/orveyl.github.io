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

    get neg() { this.invert = !this.invert; return this; }

    dist(pos=V4.w) { return this.sign * this.sdf(this.local_from_world.ra(pos)); }
    test(pos=V4.w) { return this.dist(pos) <= 0; }

    static GradEps = 1e-4;
    static GradMats = [];

    static set GradEps(ε) {
        if (Calc.ApproxEq(1e-16)(ε)(Shape.GradEps)) return;
        Shape.GradEps = ε;
        Shape.GradMats = [];
    }

    static GetGradMats() {
        if (Shape.GradMats.length) return Shape.GradMats; 
        Shape.GradMats = [
            M4.MovX(+Shape.GradEps), M4.MovX(-Shape.GradEps),
            M4.MovY(+Shape.GradEps), M4.MovY(-Shape.GradEps),
            M4.MovZ(+Shape.GradEps), M4.MovZ(-Shape.GradEps),
        ];
        return Shape.GradMats;
    }

    grad(pos=V4.w, ε=Shape.GradEps) {
        const [Xp, Xn, Yp, Yn, Zp, Zn] = Shape.GetGradMats();
        return V4.of(
            this.dist(Xp.ra(pos)) - this.dist(Xn.ra(pos)),
            this.dist(Yp.ra(pos)) - this.dist(Yn.ra(pos)),
            this.dist(Zp.ra(pos)) - this.dist(Zn.ra(pos)),
            0,
        ).sc(0.5/ε);
    }

    proj(pos=V4.Ew(), max_iters=5, dt=1, ε=Shape.GradEps) {
        let d, p = pos.dup;
        for (let i = 0; i < max_iters; ++i) {
            if (Calc.Abs(d = this.dist(p)) <= ε) break;
            const g = this.grad(p);
            p.copy(M4.Mov(g.x, g.y, g.z, -d*dt).ra(p));
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

export class Line extends Path {
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
        this.sdf = p => Calc.Log(p.w - p.x) - this.radius;
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
        this.sdf = p => PK.ra(p).dist( ) - Calc.Abs(this.radius);
    }
};

export class Halfspace extends Shape {
    constructor(name="Halfspace", radius=0) {
        super(name);
        this.radius = radius;
        this.sdf = p => (
            (this.radius >= 0) ? (p.x >= 0 ? -1 : +1) : (p.x <= 0 ? +1 : -1)
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
        this.sdf = p => PX.ra(p).dist( ) - Calc.Abs(this.radius);
    }
};