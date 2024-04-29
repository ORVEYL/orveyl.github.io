// adc :: shape.js

import { Scene } from "../scene.js";
import { V4, B4, M4 } from "../../math/vector.js";

import * as Calc from "../../math/calc.js";
import { Any, All, Map, Fold, Min, Max, SmoothMinExp } from "../../math/calc.js";

export class Shape extends Scene {

    constructor(name="Shape", parent=null) {
        super(name, parent);
        this.invert = false;
        this.sdf = () => 0;
    }

    get shapes() { return this.collect(ch => ch instanceof Shape); }
    get sign() { return this.invert ? -1 : +1; }

    dist(pos=V4.w) { return this.sign * this.sdf(this.local_from_world.ra(pos)); }
    test(pos=V4.w) { return this.dist(pos) <= 0; }

    grad(pos=V4.w, ε=1e-8) {
        const C = M4.Center(pos);
        const [
            Xp, Yp, Zp,
            Xn, Yn, Zn,
        ] = [
            M4.MovX(+ε), M4.MovY(+ε), M4.MovZ(+ε),
            M4.MovX(-ε), M4.MovY(-ε), M4.MovZ(-ε),
        ].map(M => M.rc(C));

        const G = V4.of(
            this.sdf(Xp.ra(pos)) - this.sdf(Xn.ra(pos)),
            this.sdf(Yp.ra(pos)) - this.sdf(Yn.ra(pos)),
            this.sdf(Zp.ra(pos)) - this.sdf(Zn.ra(pos)),
        ).normalize();

        return G.copy(M4.Along(pos).ra(G)).normalize();
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
    constructor(name="ShapeJoin", parent=null) {
        super(name, parent);
        this.sdf = p => Fold(Min, +Infinity)(Map(sh => sh.dist(p))(this.shapes));
    }
};

export class ShapeSmoothJoin extends ShapeJoin {
    constructor(name="ShapeSmoothJoin", parent=null, λ=1) {
        super(name, parent);
        if (λ>0) {
            this.sdf = p => Fold(SmoothMinExp(λ), +Infinity)(Map(sh => sh.dist(p))(this.shapes));
        }
    }
}

export class ShapeMeet extends Shape {
    constructor(name="ShapeMeet", parent=null) {
        super(name, parent);
        this.sdf = p => Fold(Max, -Infinity)(Map(sh => sh.dist(p))(this.shapes));
    }
};

const PX = M4.ProjX();
const PK = M4.ProjK();

class Path extends Shape {
    constructor(name="Path", parent=null) {
        super(name, parent);
        this.sdf = p => 0;
    }
};

class Line extends Path {
    constructor(name="Line", parent=null) {
        super(name, parent);
        this.sdf = p => PX.ra(p).dist(p);
    }
};

class MotorPath extends Path {
    constructor(name="Path", parent=null, B=B4.X) {
        super(name, parent);
    }
};


export class Sphere extends Shape {
    constructor(name="Sphere", parent=null, radius=0) {
        super(name, parent);
        this.radius = radius;
        this.sdf = p => p.dist() - this.radius;
    }
};

export class Horosphere extends Shape {
    constructor(name="Horosphere", parent=null, radius=0) {
        super(name, parent);
        this.radius = radius;
        this.sdf = p => Calc.Log(p.z + p.w) - this.radius;
    }
};

export class Cylinder extends Shape {
    constructor(name="Cylinder", parent=null, radius=0) {
        super(name, parent);
        this.radius = radius;
        this.sdf = p => PX.ra(p).dist(p) - this.radius;
    }
};

export class Orthocyl extends Shape {
    constructor(name="Orthocyl", parent=null, radius=0) {
        super(name, parent);
        this.radius = radius;
        this.sdf = p => PK.ra(p).dist( ) - this.radius;
    }
};

export class Halfspace extends Shape {
    constructor(name="Halfspace", parent=null, radius=0) {
        super(name, parent);
        this.radius = radius;
        this.sdf = p => (
            (this.radius >= 0) ? (p.x >= 0 ? +1 : -1) : (p.x <= 0 ? -1 : +1)
        ) * PK.ra(p).dist(p) - this.radius;
    }
};

export class Equidistant extends Shape {
    constructor(name="Equidistant", parent=null, radius=0) {
        super(name, parent);
        this.radius = radius;
        this.sdf = p => PK.ra(p).dist(p) - this.radius;
    }
};

export class Zone extends Shape {
    constructor(name="Zone", parent=null, radius=0) {
        super(name, parent);
        this.radius = radius;
        this.sdf = p => PX.ra(p).dist( ) - this.radius;
    }
};