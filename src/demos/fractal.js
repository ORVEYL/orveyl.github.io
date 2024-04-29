// adc :: fractal.js

import { Scene } from "../node/scene.js";
import { Ticker } from "../node/component/ticker.js";
import * as Calc from "../math/calc.js";
import { M4 } from "../math/vector.js";
import { Orveyl } from "../orveyl.js";

const Tosc = Calc.Geom.Sph.Osc(1, 0.25);
const Rosc = Calc.Osc(0.25, Calc.ϕ);
const z3re = Calc.Osc(2, 1/7);
const z3im = Calc.Osc(3, 1/8);
const z4re = Calc.Osc(0.5, 0.1);
const z6re = Calc.Osc(0.3, 0.05*Calc.ϕ);
const λre = Calc.Osc(1, Calc.ϕ);
const λim = Calc.Osc(1, 1);

const mode = Orveyl.InitParams.get("mode") ?? "mandelbrot";
const pal = Orveyl.InitParams.get("pal") ?? 2;
const iter = Orveyl.InitParams.get("iter") ?? 32;

import { DefaultDemo } from "./default.js";
Scene.Manager.add(new Scene()).useIndex(1);

switch (mode) {
    default:
    case "mandelbrot":
        Orveyl.SetSkyComplex(
            pal, iter,
            null,
            null, null, null,
            [0,0, 0,0, 1,0, 0,0, 0,0, 0,0, 0,0, 0,0],
        );
        Orveyl.DefaultPlayer.rm(M4.MovX(-3/2), M4.MovY(1/3));
        break;

    case "julia":
        new Ticker("Julia", null,
            self => {
                const t = self.t;
                const [c, s] = Tosc(self.t);
                const r = 0.75 + Rosc(self.t);
                Orveyl.SetSkyComplex(
                    pal, iter,
                    null,
                    null, null, [r*c, r*s, 0,0],
                    [0,0, 0,0, 1,0, 0,0, z4re(t),0, 0,0, z6re(t),0, 0,0],
                );
            }
        ).play(1/4);
        Orveyl.DefaultPlayer.rm(M4.MovX(-2));
        break;

    case "newton":
        new Ticker("Newton", null,
            self => {
                const t = self.t;
                Orveyl.SetSkyNewton(
                    pal, iter,
                    null,
                    //[-1,0, 0,0, 0,0, z3re(self.t),z3im(self.t), 1,0, 0,0, 0,0, 0,0],
                    //[2,0, -2,0, 0,0, 1,0, 0,0, 0,0, 0,0, 0,0],
                    //[-λre(t),-λim(t), (λre(t)-1),λim(t), 0,0, 1,0, 0,0, 0,0, 0,0, 0,0],
                    [-1,0, 0,0, -2.55+Rosc(t),0, 0,0, 1,0, 0,0, 0,0, 0,0],
                    //[-1,0, 0,0, 0,0, 1,0, 0,0, 0,0, 0,0, 0,0],
                    [0.025, 0, 8],
                );
            }
        ).play(1/60);
        break;
}