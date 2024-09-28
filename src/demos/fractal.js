// adc :: fractal.js

import { Scene } from "../node/scene.js";
import { Ticker } from "../node/component/ticker.js";
import * as Calc from "../math/calc.js";
import { Complex, M4 } from "../math/vector.js";
import { Orveyl } from "../orveyl.js";

let polar_mode = false; 
let complex_input;
let complex_write;
let complex_read;

let step_size = 0.01;

const encode = obj => btoa(JSON.stringify(obj));
const decode = str => JSON.parse(atob(str));

class Polynomial {
    constructor (label, degree=8) {
        this.label = label;
        this.c = new Array(degree);
        this.d = new Array(degree);

        for (let i = 0; i < degree; ++i) {
            this.c[i] = Complex.zero;
            this.d[i] = Complex.zero;
        }
    }

    static of(label, ...cs) {
        const p = new Polynomial(label, cs.length/2);
        for (let i = 0; i < cs.length-1; i+=2) {
            p.c[Calc.Floor(i/2)].set(cs[i], cs[i+1]);
            p.d[Calc.Floor(i/2)].set(cs[i], cs[i+1]);
        }

        return p;
    }

    reset() {
        for (let i = 0; i < this.c.length; ++i) {
            this.c[i].copy(this.d[i]);
        }
        return this;
    }

    read() {
        for (let i = 0; i < this.c.length; ++i) {
            complex_read(this.label + i.toString(), this.c[i]);
        }
    }

    write() {
        for (let i = 0; i < this.c.length; ++i) {
            complex_write(this.label + i.toString(), this.c[i]);
        }
    }

    flat() {
        const cs = [];
        for (let c of this.c) {
            cs.push(c.re, c.im);
        }
        return cs;
    }

    setDerivative(src) {
        this.c[0].copy(src.c[1]);
        this.c[1].copy(src.c[2]).sc(2);
        this.c[2].copy(src.c[3]).sc(3);
        this.c[3].copy(src.c[4]).sc(4);
        this.c[4].copy(src.c[5]).sc(5);
        this.c[5].copy(src.c[6]).sc(6);
        this.c[6].copy(src.c[7]).sc(7);
        this.c[7].set(0, 0);
        return this;
    }

    setIntegral(src) {
        this.c[0].set(0, 0);
        this.c[1].copy(src.c[0]);
        this.c[2].copy(src.c[1]).sc(1/2);
        this.c[3].copy(src.c[2]).sc(1/3);
        this.c[4].copy(src.c[3]).sc(1/4);
        this.c[5].copy(src.c[4]).sc(1/5);
        this.c[6].copy(src.c[5]).sc(1/6);
        this.c[7].copy(src.c[6]).sc(1/7);
        return this;
    }

    swap(other) {
        for (let i = 0; i < this.c.length; ++i) {
            const [re, im] = [this.c[i].re, this.c[i].im];
            this.c[i].copy(other.c[i]);
            other.c[i].set(re, im);
        }
        return this;
    }
}

let pal = 5;
let iter = 8;

const m = Polynomial.of("m", 1,0, 0,0, 0,0, 1,0);
const a = Polynomial.of("a", 0,0, 1,0);
const b = Polynomial.of("b", 0,0, 1,0);
const c = Polynomial.of("c", 0,0, 1,0);
const f = Polynomial.of("f", 0,0, 1,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0);
const g = Polynomial.of("g", 1,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0);
const [e0, e1, e2] = [[0], [0], [0]];

const reset_params = () => {
    m.reset();
    a.reset(); b.reset(); c.reset();
    f.reset(); g.reset();

    e0[0] = e1[0] = 0;
    e2[0] = 4;
}

const read_url = () => {
    const Pstr = Orveyl.InitParams.get("Ps");
    const Ps = Pstr ? decode(Pstr) : null;
    if (Ps) {
        pal = Ps.p ?? 2;
        iter = Ps.i ?? 16;

        m.c[0].set(Ps.Ms[0], Ps.Ms[1]); m.c[1].set(Ps.Ms[2], Ps.Ms[3]);
        m.c[2].set(Ps.Ms[4], Ps.Ms[5]); m.c[3].set(Ps.Ms[6], Ps.Ms[7]);

        a.c[0].set(Ps.As[0], Ps.As[1]); a.c[1].set(Ps.As[2], Ps.As[3]);
        b.c[0].set(Ps.Bs[0], Ps.Bs[1]); b.c[1].set(Ps.Bs[2], Ps.Bs[3]);
        c.c[0].set(Ps.Cs[0], Ps.Cs[1]); c.c[1].set(Ps.Cs[2], Ps.Cs[3]);

        f.c[0].set(Ps.Fs[ 0], Ps.Fs[ 1]);
        f.c[1].set(Ps.Fs[ 2], Ps.Fs[ 3]);
        f.c[2].set(Ps.Fs[ 4], Ps.Fs[ 5]);
        f.c[3].set(Ps.Fs[ 6], Ps.Fs[ 7]);
        f.c[4].set(Ps.Fs[ 8], Ps.Fs[ 9]);
        f.c[5].set(Ps.Fs[10], Ps.Fs[11]);
        f.c[6].set(Ps.Fs[12], Ps.Fs[13]);
        f.c[7].set(Ps.Fs[14], Ps.Fs[15]);

        g.c[0].set(Ps.Gs[ 0], Ps.Gs[ 1]);
        g.c[1].set(Ps.Gs[ 2], Ps.Gs[ 3]);
        g.c[2].set(Ps.Gs[ 4], Ps.Gs[ 5]);
        g.c[3].set(Ps.Gs[ 6], Ps.Gs[ 7]);
        g.c[4].set(Ps.Gs[ 8], Ps.Gs[ 9]);
        g.c[5].set(Ps.Gs[10], Ps.Gs[11]);
        g.c[6].set(Ps.Gs[12], Ps.Gs[13]);
        g.c[7].set(Ps.Gs[14], Ps.Gs[15]);

        e0[0] = Ps.Es[0];
        e1[0] = Ps.Es[1];
        e2[0] = Ps.Es[2];
    } else {
        reset_params(); 
    }
}

const write_url = () => {
    window.history.replaceState(null, null, [
        `/?demo=fractal`,
        `Ps=${encode({
            p:pal, i:iter,
            Ms:m.flat(),
            As:a.flat(), Bs:b.flat(), Cs:c.flat(),
            Fs:f.flat(), Gs:g.flat(),
            Es:[e0, e1, e2],
        })}`,
    ].join("&"));
}

const float_input = (name, ref) => {
    return [
        `${name}: `,
        `<input id="${name}" type="number" step=${step_size} style="width:5em" value="${ref[0]}">`,
    ].join("");
}

const float_read = (name, ref) => {
    ref[0] = document.getElementById(`${name}`).value;
}

const float_write = (name, ref) => {
    document.getElementById(`${name}`).value = ref[0];
}

const rect_input = (name, ref) => {
    return [
        `${name}: `,
        `<input id="${name}re" type="number" step=${step_size} style="width:5em" value="${ref.re}">`,
        ` + <input id="${name}im" type="number" step=${step_size} style="width:5em" value="${ref.im}">i`,
    ].join("");
}

const rect_read = (name, ref) => {
    const re = document.getElementById(`${name}re`).value;
    const im = document.getElementById(`${name}im`).value;
    ref.set(re, im);
}

const rect_write = (name, ref) => {
    const re = document.getElementById(`${name}re`);
    const im = document.getElementById(`${name}im`);
    re.value = ref.re;
    im.value = ref.im;
}

const polar_input = (name, ref) => {
    return [
        `${name}: `,
        `<input id="${name}abs" type="number" step=${step_size} style="width:5em" value="${ref.abs}">`,
        ` * e^<input id="${name}arg" type="number" step=${step_size} style="width:5em" value="${ref.arg/Calc.π}">iπ`,
    ].join(""); 
}

const polar_read = (name, ref) => {
    const abs = document.getElementById(`${name}abs`).value;
    const arg = document.getElementById(`${name}arg`).value*Calc.π;
    ref.copy(Complex.polar(abs, arg));
}

const polar_write = (name, ref) => {
    const abs = document.getElementById(`${name}abs`);
    const arg = document.getElementById(`${name}arg`);
    abs.value = ref.abs;
    arg.value = ref.arg/Calc.π;
}

const mobius_input = m => {
    return [
        `${complex_input(m.label+"0", m.c[0])}, ${complex_input(m.label+"1", m.c[1])} <br>`,
        `${complex_input(m.label+"2", m.c[2])}, ${complex_input(m.label+"3", m.c[3])}`,
    ].join("");
}

const poly_input = p => {
    let str = "";
    const deg = p.c.length;
    const br = (deg > 1);

    for (let i = 0; i < deg; ++i) {
        str += complex_input(p.label + i.toString(), p.c[i]);
        if (br && i != deg-1) str += "<br>";
    }

    return str;
}

const populate = () => {
    complex_input = polar_mode ? polar_input : rect_input;
    complex_write = polar_mode ? polar_write : rect_write;
    complex_read  = polar_mode ? polar_read : rect_read;
    const mode = polar_mode ? "Polar" : "Rect";

    Orveyl.Parameters.innerHTML = [
        `<input type="button" id="toggleMode" value="Input Mode"></input>: ${mode}`,
        `Step Size: <input id="stepsize" type="number" step=0.001 min=0 style="width:5em" value="${step_size}">`,
        ``,
        `Palette: ${[
            `<select id="pal">`,
            `<option value="0"  ${pal ==  0 ? "selected" : ""}>Grid</option>`,
            `<option value="1"  ${pal ==  1 ? "selected" : ""}>Esc</option>`,
            `<option value="-1" ${pal == -1 ? "selected" : ""}>RevEsc</option>`,
            `<option value="2"  ${pal ==  2 ? "selected" : ""}>IdealEsc</option>`,
            `<option value="-2" ${pal == -2 ? "selected" : ""}>IdealRevEsc</option>`,
            `<option value="3"  ${pal ==  3 ? "selected" : ""}>Abs</option>`,
            `<option value="-3" ${pal == -3 ? "selected" : ""}>AbsCos</option>`,
            `<option value="4"  ${pal ==  4 ? "selected" : ""}>Arg</option>`,
            `<option value="-4" ${pal == -4 ? "selected" : ""}>ArgCos</option>`,
            `<option value="5"  ${pal ==  5 ? "selected" : ""}>AbsArg</option>`,
            `<option value="-5" ${pal == -5 ? "selected" : ""}>AbsCosArg</option>`,
            `<option value="6"  ${pal ==  6 ? "selected" : ""}>Plot</option>`,
            `</select>`,
        ].join("")}`,
        `Iterations: <input id="iter" type="number" step=1 min=0 max=256 style="width:4em" value="${iter}">`,
        ``,
        `<details>
            <summary title="Input Mobius Transformation">
                :: M ::
                <input type="button" id="resetM" value="Reset">
            </summary>
            ${mobius_input(m)}
        </details>`,

        `<details>
            <summary title="Init Parameter">
                :: A ::
                <input type="button" id="resetA" value="Reset">
            </summary>
            ${poly_input(a)}
        </details>`,

        `<details>
            <summary title="Recursion Parameter">
                :: B ::
                <input type="button" id="resetB" value="Reset">
            </summary>
            ${poly_input(b)}
        </details>`,

        `<details>
            <summary title="Constant Parameter">
                :: C ::
                <input type="button" id="resetC" value="Reset">
            </summary>
            ${poly_input(c)}
        </details>`,
    
        `<details>
            <summary title="Rational Function Numerator">
                :: F ::
                <input type="button" id="resetF" value="Reset">
                <input type="button" id="randF" value="Rand">
                <input type="button" id="SGdz" value="∫G">
                <input type="button" id="swapFG" value="Swap">
            </summary>
            ${poly_input(f)}
        </details>`,
    
        `<details>
            <summary title="Rational Function Denominator">
                :: G ::
                <input type="button" id="resetG" value="Reset">
                <input type="button" id="randG" value="Rand">
                <input type="button" id="dFdz" value="dF">
            </summary>
            ${poly_input(g)}
        </details>`,
    
        `<details>
            <summary title="Escape Parameters">
                :: E ::
            </summary>
            ${float_input("e0", e0)} ${float_input("e1", e1)} ${float_input("e2", e2)}
        </details>`,

        `<input type="button" id="reset" value="Reset All"></input>`,
        ``,
    
        `<details>
            <summary>:: Help ::</summary>
            <ul>
                <li>init:<ul>
                    <li>z0 = M(z0)</li>
                    <li>z = a0 + a1*z0</li>
                    <li>c = c0 + c1*z0</li>
                </ul></li>
                <li>iter:<ul>
                    <li>z = b0*z + b1*(F(z) / G(z)) + c</li>
                </ul></li>
            </ul>
        </details>`,
    ].join("<br>");

    document.getElementById("parameters").addEventListener("change", ev => {
        read_params();
        update();
    }, false);
    
    document.getElementById("toggleMode").onclick = () => {
        read_params();
        polar_mode = !polar_mode;
        populate();
        update();
    }

    document.getElementById("stepsize").addEventListener("change", ev => {
        step_size = document.getElementById("stepsize").value;
        populate();
        update();
    }, false);

    document.getElementById("resetM").onclick = () => { m.reset(); update(); }
    document.getElementById("resetA").onclick = () => { a.reset(); update(); }
    document.getElementById("resetB").onclick = () => { b.reset(); update(); }
    document.getElementById("resetC").onclick = () => { c.reset(); update(); }
    document.getElementById("resetF").onclick = () => { f.reset(); update(); }
    document.getElementById("resetG").onclick = () => { g.reset(); update(); }
    document.getElementById("reset" ).onclick = () => { reset_params(); update(); }
    
    document.getElementById("randF").onclick = () => {
        const R = () => Complex.exp(Complex.im(Calc.π*Calc.Rand.Sign())).sc(Calc.Rand.Unit());
        f.c.map(c => c.copy(R()));
        update();
    }
    
    document.getElementById("SGdz").onclick = () => {
        f.setIntegral(g);
        update();
    }

    document.getElementById("swapFG").onclick = () => {
        f.swap(g);
        update();
    }
    
    document.getElementById("randG").onclick = () => {
        const R = () => Complex.exp(Complex.im(Calc.π*Calc.Rand.Sign())).sc(Calc.Rand.Unit());
        g.c.map(c => c.copy(R()));
        update();
    }
    
    document.getElementById("dFdz").onclick = () => {
        g.setDerivative(f);
        update();
    }
}

const read_params = () => {
    pal = document.getElementById("pal").value;
    iter = document.getElementById("iter").value;

    m.read();
    a.read(); b.read(); c.read();
    f.read(); g.read();

    float_read("e0", e0); float_read("e1", e1); float_read("e2", e2);
}

const write_params = () => {
    m.write();
    a.write(); b.write(); c.write();
    f.write(); g.write();

    float_write("e0", e0); float_write("e1", e1); float_write("e2", e2);
}

const update = () => {
    write_params();
    write_url();

    Orveyl.SetSkyComplex(
        pal, iter,
        m.flat(),
        a.flat(), b.flat(), c.flat(),
        f.flat(), g.flat(),
        [e0, e1, e2],
    );
}

read_url();
populate();
update();