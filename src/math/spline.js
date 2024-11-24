// adc :: spline.js

import * as Calc from "../math/calc.js";
import { V4, B4 } from "../math/vector.js";

export class Spline {
    constructor (ps, cs) {
        this.ps = ps;
        this.cs = cs;
    }

    static eval = (t) => t;
    get eval() { return Spline.eval; }

    reticulate(n, f) {
        for (let i = 0; i < n; ++i) {
            const t = i/n;
            const y = this.eval(t);
            f(y, t, i);
        }
    }
};

class Bezier extends Spline {};

class Bezier2 extends Bezier {
    constructor (P0, C0, P1) { super([P0, P1], [C0]); }
    
    static eval = lerp => (P0, C0, P1) => t => lerp(
        lerp(P0, C0)(t),
        lerp(C0, P1)(t),
    )(t);

    get eval() {
        return this.constructor.eval(
            this.ps[0], this.cs[0], this.ps[1],
        );
    }
};

export class Bezier2f extends Bezier2 { static eval = Bezier2.eval(Calc.Lerp); };
export class Bezier2v extends Bezier2 { static eval = Bezier2.eval(V4.lerp);  };
export class Bezier2b extends Bezier2 { static eval = Bezier2.eval(B4.mix);  };

class Bezier3 extends Bezier {
    constructor (P0, C0, C1, P1) { super([P0, P1], [C0, C1]); }

    static eval = lerp => (P0, C0, C1, P1) => t => lerp(
        Bezier2.eval(lerp)(P0, C0, C1)(t),
        Bezier2.eval(lerp)(C0, C1, P1)(t),
    )(t);

    get eval() {
        return this.constructor.eval(
            this.ps[0], this.cs[0], this.cs[1], this.ps[1],
        );
    }
};

export class Bezier3f extends Bezier3 { static eval = Bezier3.eval(Calc.Lerp); };
export class Bezier3v extends Bezier3 { static eval = Bezier3.eval(V4.lerp); };
export class Bezier3b extends Bezier3 { static eval = Bezier3.eval(B4.mix); };