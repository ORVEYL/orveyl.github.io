// adc :: fractal.js

import { Scene } from "../node/scene.js";
import { Ticker } from "../node/component/ticker.js";
import * as Calc from "../math/calc.js";
import { Complex, M4 } from "../math/vector.js";
import { Orveyl } from "../orveyl.js";

const Tosc = Calc.Geom.Sph.Osc(1, 0.25);
const Rosc = Calc.Osc(0.25, Calc.ϕ);
const z3re = Calc.Osc(2, 1/7);
const z3im = Calc.Osc(3, 1/8);
const z4re = Calc.Osc(0.5, 0.1);
const z6re = Calc.Osc(0.3, 0.05*Calc.ϕ);
const λre = Calc.Osc(1, Calc.ϕ);
const λim = Calc.Osc(1, 1);

const preset = Orveyl.InitParams.get("mode") ?? "mandelbrot";
let pal = Orveyl.InitParams.get("pal") ?? 2;
let iter = Orveyl.InitParams.get("iter") ?? 32;

const [f0, f1, f2, f3, f4, f5, f6, f7] = [
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(1, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
];

const [g0, g1, g2, g3, g4, g5, g6, g7] = [
    Complex.of(1, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
    Complex.of(0, 0),
];

const [a0, a1, b0, b1, c0, c1] = [
    Complex.of(0, 0), Complex.of(1, 0),
    Complex.of(0, 0), Complex.of(1, 0),
    Complex.of(0, 0), Complex.of(1, 0),
];

const complex_input = (name, ref) => {
    return [
        `${name}: `,
        `<input id="${name}re" type="number" step="0.01" style="width:4em" value="${ref.re}">`,
        `<input id="${name}im" type="number" step="0.01" style="width:4em" value="${ref.im}">`,
    ].join("");
}

const complex_read = (name, ref) => {
    const re = document.getElementById(`${name}re`);
    const im = document.getElementById(`${name}im`);
    ref.copy([re.value, im.value]);
}

Orveyl.Parameters.innerHTML = `<div id=fractalparams>` + [
    ``,
    `Palette: ${[
        `<select id="pal">`,
        `<option value="0" ${pal == 0 ? "selected" : ""}>Grid</option>`,
        `<option value="1" ${pal == 1 ? "selected" : ""}>Escape</option>`,
        `<option value="-1" ${pal == -1 ? "selected" : ""}>Rev. Escape</option>`,
        `<option value="2" ${pal == 2 ? "selected" : ""}>Normal</option>`,
        `<option value="-2" ${pal == -2 ? "selected" : ""}>Rev. Normal</option>`,
        `<option value="3" ${pal == 3 ? "selected" : ""}>Argument</option>`,
        `<option value="4" ${pal == 4 ? "selected" : ""}>Plotter</option>`,
        `</select>`,
    ].join("")}`,
    `Iterations: <input id="iter" type="number" step="1" style="width:4em" value="${iter}">`,
    ``,
    `:: A ::`,
    `${complex_input("a0", a0)}`, `${complex_input("a1", a1)}`,
    ``,
    `:: B ::`,
    `${complex_input("b0", b0)}`, `${complex_input("b1", b1)}`,
    ``,
    `:: C ::`,
    `${complex_input("c0", c0)}`, `${complex_input("c1", c1)}`,
    ``,
    `:: F ::`,
    `${complex_input("f0", f0)}`,
    `${complex_input("f1", f1)}`,
    `${complex_input("f2", f2)}`,
    `${complex_input("f3", f3)}`,
    `${complex_input("f4", f4)}`,
    `${complex_input("f5", f5)}`,
    `${complex_input("f6", f6)}`,
    `${complex_input("f7", f7)}`,
    ``,
    `:: G :: <input type="button" id="newton" value="dF/dz">`,
    `${complex_input("g0", g0)}`,
    `${complex_input("g1", g1)}`,
    `${complex_input("g2", g2)}`,
    `${complex_input("g3", g3)}`,
    `${complex_input("g4", g4)}`,
    `${complex_input("g5", g5)}`,
    `${complex_input("g6", g6)}`,
    `${complex_input("g7", g7)}`,
    ``,
    `<details>
        <summary>:: Help ::</summary>
        <ul>
            <li>init: z = a0 + a1*z0</li>
            <li>iter: z = b0*z + b1*(F(z) / G(z)) + c0 + c1*z0</li>
        </ul>
    </details>`
].join("<br>") + `</div>`;

document.getElementById("fractalparams").addEventListener("change", ev => {
    update_params();
}, false);

document.getElementById("newton").onclick = () => {
    document.getElementById("g0re").value = document.getElementById("f1re").value;
    document.getElementById("g0im").value = document.getElementById("f1im").value;

    document.getElementById("g1re").value = 2*document.getElementById("f2re").value;
    document.getElementById("g1im").value = 2*document.getElementById("f2im").value;

    document.getElementById("g2re").value = 3*document.getElementById("f3re").value;
    document.getElementById("g2im").value = 3*document.getElementById("f3im").value;

    document.getElementById("g3re").value = 4*document.getElementById("f4re").value;
    document.getElementById("g3im").value = 4*document.getElementById("f4im").value;

    document.getElementById("g4re").value = 5*document.getElementById("f5re").value;
    document.getElementById("g4im").value = 5*document.getElementById("f5im").value;

    document.getElementById("g5re").value = 6*document.getElementById("f6re").value;
    document.getElementById("g5im").value = 6*document.getElementById("f6im").value;

    document.getElementById("g6re").value = 7*document.getElementById("f7re").value;
    document.getElementById("g6im").value = 7*document.getElementById("f7im").value;

    document.getElementById("g7re").value = 0;
    document.getElementById("g7im").value = 0;

    update_params();
}

Scene.Manager.add(new Scene()).useIndex(1);

const update_params = () => {

    pal = document.getElementById("pal").value;
    iter = document.getElementById("iter").value;
    
    complex_read("a0", a0); complex_read("a1", a1);
    complex_read("b0", b0); complex_read("b1", b1);
    complex_read("c0", c0); complex_read("c1", c1);

    complex_read("f0", f0); complex_read("f1", f1);
    complex_read("f2", f2); complex_read("f3", f3);
    complex_read("f4", f4); complex_read("f5", f5);
    complex_read("f6", f6); complex_read("f7", f7);

    complex_read("g0", g0); complex_read("g1", g1);
    complex_read("g2", g2); complex_read("g3", g3);
    complex_read("g4", g4); complex_read("g5", g5);
    complex_read("g6", g6); complex_read("g7", g7);

    Orveyl.SetSkyComplex(
        pal, iter,
        null,
        [...a0, ...a1], [...b0, ...b1], [...c0, ...c1],
        [...f0, ...f1, ...f2, ...f3, ...f4, ...f5, ...f6, ...f7],
        [...g0, ...g1, ...g2, ...g3, ...g4, ...g5, ...g6, ...g7],
    );
}

switch (preset) {
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