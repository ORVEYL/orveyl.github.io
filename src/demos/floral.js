// adc :: floral.js

import * as Calc from "../math/calc.js";
import {
    Rand,
} from "../math/calc.js";
import { V4, B4, M4 } from "../math/vector.js";

import { Scene } from "../node/scene.js";
import { Geometry } from "../node/scene/geometry.js";

import { VertexArray, IndexBuffer, Vertex } from "../gpubuffer.js";
import { Orveyl } from "../orveyl.js";

import { Orveyl3dController } from "../node/component/controllers/Orveyl3dController.js";

Orveyl.DefaultPlayer.attach(
    new Orveyl3dController("3dController")
);

const encode = obj => btoa(JSON.stringify(obj));
const decode = str => JSON.parse(atob(str));

let Ps;
const randomize = () => Ps = {
    BL: [
        Rand.Gauss(0)(0.1)(), Rand.Gauss(0)(0.1)(), Rand.Sign(),
        Rand.Gauss(0.5)(0.25)(), Rand.Gauss(0)(0.1)(), Rand.Gauss(0)(0.1)(),
    ],
    BR: [
        Rand.Gauss(0)(0.1)(), Rand.Gauss(0)(0.1)(), Rand.Sign(),
        Rand.Gauss(0.5)(0.25)(), Rand.Gauss(0)(0.1)(), Rand.Gauss(0)(0.1)(),
    ],
    
    DL: [1, 1, 1, 1, 1, 1],
    DR: [1, 1, 1, 1, 1, 1],
    
    CO: [Rand.Unit(), Rand.Unit(), Rand.Unit(), 1],
    CL: [Rand.Unit(), Rand.Unit(), Rand.Unit(), 0.2],
    CR: [Rand.Unit(), Rand.Unit(), Rand.Unit(), 0.2],    
    CF: [1,1,1,1],

    Mask: 0b010,
};

const Pstr = Orveyl.InitParams.get("Ps");
if (Pstr) { Ps = decode(Pstr); } else { randomize(); }

const [
    BL, BR,
    DL, DR,
    CO,
    CL, CR,
    CF,
] = [
    B4.of(...Ps.BL), B4.of(...Ps.BR),
    B4.of(...Ps.DL), B4.of(...Ps.DR),
    V4.of(...Ps.CO),
    V4.of(...Ps.CL), V4.of(...Ps.CR),
    V4.of(...Ps.CF),
]

const num_input = col => `type="number" min="-10" max="10" step="0.05" style="width:4em; background-color:${col};"`;

const rgb2hex = v => {
    const c = x => {
        const xx = (Calc.Floor(x*255)).toString(16);
        return (xx.length == 1) ? "0" + xx : xx;
    }
    return `${c(v[0])}${c(v[1])}${c(v[2])}`;
}
const hex2rgb = rrggbb => {
    const [_, r, g, b] = rrggbb.match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return V4.of(
        parseInt(r,16)/255,
        parseInt(g,16)/255,
        parseInt(b,16)/255,
        1,
    );
}

Orveyl.Menu.innerHTML = `<form>` + [
    [,
        `BL:`,
        `<input id="BLi" ${num_input("#880")} name="BLi" value="${BL[0]}">`,
        `<input id="BLj" ${num_input("#808")} name="BLj" value="${BL[1]}">`,
        `<input id="BLk" ${num_input("#088")} name="BLk" value="${BL[2]}">`,
        ` :: `,
        `<input id="BLX" ${num_input("#800")} name="BLX" value="${BL[3]}">`,
        `<input id="BLY" ${num_input("#080")} name="BLY" value="${BL[4]}">`,
        `<input id="BLZ" ${num_input("#008")} name="BLZ" value="${BL[5]}">`,
    ].join(" "),
    [,
        `BR:`,
        `<input id="BRi" ${num_input("#880")} name="BRi" value="${BR[0]}">`,
        `<input id="BRj" ${num_input("#808")} name="BRj" value="${BR[1]}">`,
        `<input id="BRk" ${num_input("#088")} name="BRk" value="${BR[2]}">`,
        ` :: `,
        `<input id="BRX" ${num_input("#800")} name="BRX" value="${BR[3]}">`,
        `<input id="BRY" ${num_input("#080")} name="BRY" value="${BR[4]}">`,
        `<input id="BRZ" ${num_input("#008")} name="BRZ" value="${BR[5]}">`,
    ].join(" "),
    ``,
    [,
        `ΔL:`,
        `<input id="DLi" ${num_input("#880")} name="DLi" value="${DL[0]}">`,
        `<input id="DLj" ${num_input("#808")} name="DLj" value="${DL[1]}">`,
        `<input id="DLk" ${num_input("#088")} name="DLk" value="${DL[2]}">`,
        ` :: `,
        `<input id="DLX" ${num_input("#800")} name="DLX" value="${DL[3]}">`,
        `<input id="DLY" ${num_input("#080")} name="DLY" value="${DL[4]}">`,
        `<input id="DLZ" ${num_input("#008")} name="DLZ" value="${DL[5]}">`,
    ].join(" "),
    [,
        `ΔR:`,
        `<input id="DRi" ${num_input("#880")} name="DRi" value="${DR[0]}">`,
        `<input id="DRj" ${num_input("#808")} name="DRj" value="${DR[1]}">`,
        `<input id="DRk" ${num_input("#088")} name="DRk" value="${DR[2]}">`,
        ` :: `,
        `<input id="DRX" ${num_input("#800")} name="DRX" value="${DR[3]}">`,
        `<input id="DRY" ${num_input("#080")} name="DRY" value="${DR[4]}">`,
        `<input id="DRZ" ${num_input("#008")} name="DRZ" value="${DR[5]}">`,
    ].join(" "),
    ``,
    `Root Color: <input id="rootCol" type="color" value=#${rgb2hex(CO)}>`,
    `L Color: <input id="LCol" type="color" value=#${rgb2hex(CL)}> <input id="LColWeight" ${num_input("inherit")} name="LColWeight" value="${CL.w}">`,
    `R Color: <input id="RCol" type="color" value=#${rgb2hex(CR)}> <input id="RColWeight" ${num_input("inherit")} name="RColWeight" value="${CR.w}">`,
    `Leaf Color: <input id="leafCol" type="color" value=#${rgb2hex(CF)}>`,
    ``,
    [,
        `Mask: `,
        `<input id="M0" type="checkbox" ${Ps.Mask & 0b001 ? "checked" : ""}>`,
        `<input id="M1" type="checkbox" ${Ps.Mask & 0b010 ? "checked" : ""}>`,
        `<input id="M2" type="checkbox" ${Ps.Mask & 0b100 ? "checked" : ""}>`,
    ].join(" "),
    ``,
    //`Sky Color: <input id="skyCol" type="color" value=#${CF}>`,
    `:: <input type="button" id="generate" value="Generate"> :: <input type="button" id="randomize" value="Randomize"> ::`,
    ``,
    `<details>
        <summary>:: Help ::</summary>
        <ul>
            <li>BL / BR: Left / Right branch transformations</li>
            <li>ΔL / ΔR: Left / Right branch scale factors</li>
            <li>Inputs: Rotation (
                <span style="color:#ff8">xy</span>,
                <span style="color:#f8f">zx</span>,
                <span style="color:#8ff">yz</span>
            ) :: Translation (
                <span style="color:#f88">x</span>,
                <span style="color:#8f8">y</span>,
                <span style="color:#88f">z</span>
            )</li>
            <br>
            <li>Root Color: initial color of first node</li>
            <li>L / R Color: tint color to apply to Left / Right branch, with weight</li>
            <li>Leaf Color: color applied to final layer of branches</li>
            <br>
            <li>Mask: toggles Point, Line, and Triangle rendering</li>
            <br>
            <li>Generate: apply current parameters & regenerate tree</li>
            <li>Randomize: randomize parameters & regenerate tree</li>
        </ul>
    </details>`
].join("<br>") + `</form>`;

const generate = () => {

    BL.set(
        document.getElementById("BLi").value,
        document.getElementById("BLj").value,
        document.getElementById("BLk").value,
        document.getElementById("BLX").value,
        document.getElementById("BLY").value,
        document.getElementById("BLZ").value,
    );

    BR.set(
        document.getElementById("BRi").value,
        document.getElementById("BRj").value,
        document.getElementById("BRk").value,
        document.getElementById("BRX").value,
        document.getElementById("BRY").value,
        document.getElementById("BRZ").value,
    );

    DL.set(
        document.getElementById("DLi").value,
        document.getElementById("DLj").value,
        document.getElementById("DLk").value,
        document.getElementById("DLX").value,
        document.getElementById("DLY").value,
        document.getElementById("DLZ").value,
    );

    DR.set(
        document.getElementById("DRi").value,
        document.getElementById("DRj").value,
        document.getElementById("DRk").value,
        document.getElementById("DRX").value,
        document.getElementById("DRY").value,
        document.getElementById("DRZ").value,
    );

    CO.copy(hex2rgb(document.getElementById("rootCol").value.slice(1)));
    CL.copy(hex2rgb(document.getElementById("LCol").value.slice(1))).setW(
        document.getElementById("LColWeight").value
    );
    CR.copy(hex2rgb(document.getElementById("RCol").value.slice(1))).setW(
        document.getElementById("RColWeight").value,
    );
    CF.copy(hex2rgb(document.getElementById("leafCol").value.slice(1)));

    Ps.Mask = (
        (document.getElementById("M0").checked << 0) |
        (document.getElementById("M1").checked << 1) |
        (document.getElementById("M2").checked << 2)
    );

    window.location.assign([
        `/?demo=floral`,
        `Ps=${encode({
            BL: [...BL], BR: [...BR],
            DL: [...DL], DR: [...DR],
            CO: [...CO],
            CL: [...CL], CR: [...CR],
            CF: [...CF],
            Mask: Ps.Mask,
        })}`,
    ].join("&"));
};
document.getElementById("generate").onclick = generate;

document.getElementById("randomize").onclick = () => {
    randomize();
    window.location.assign([
        `/?demo=floral`,
        `Ps=${encode({
            BL: [...Ps.BL], BR: [...Ps.BR],
            DL: [...Ps.DL], DR: [...Ps.DR],
            CO: [...Ps.CO],
            CL: [...Ps.CL], CR: [...Ps.CR],
            CF: [...Ps.CF],
            Mask: Ps.Mask,
        })}`,
    ].join("&"));
}

const va0 = new VertexArray();
const va1 = new VertexArray();
const va2 = new VertexArray();

const branch = (here, depth) => {
    if (depth < 0) return;
    const final = (depth == 0);

    const [L, R] = [
        here.L.dup.mul(DL),
        here.R.dup.mul(DR),
    ];

    const [M, ML, MR] = [
        here.M,
        M4.rm(here.M, L.exp()),
        M4.rm(here.M, R.exp()),
    ];

    const [c, cL, cR] = [
        here.c,
        final ? CF : V4.mix(here.c, CL)(CL.w).setW(1),
        final ? CF : V4.mix(here.c, CR)(CR.w).setW(1),
    ];

    va0.push(
        [ML.Cw, cL],
        [MR.Cw, cR],
    );

    va1.push(
        [M.Cw, c], [ML.Cw, cL],
        [M.Cw, c], [MR.Cw, cR],
    );

    va2.push(
        [M.Cw, c], [ML.Cw, cL], [MR.Cw, cR],
    );

    branch({M:ML, L:L, R:R, c:cL}, depth-1);
    branch({M:MR, L:L, R:R, c:cR}, depth-1);
};

const depth = 13;
branch(
    {
        M: M4.id,
        L: BL, R: BR,
        c: CO,
    }, depth
);

const sc = new Scene("Floral");

if (Ps.Mask & 0b001) {
    new Geometry("FloralGeom0", va0).attachTo(sc)
    .setMode(0).setBlend(1);
}

if (Ps.Mask & 0b010) {
    const geom1 = new Geometry("FloralGeom1", va1).attachTo(sc)
    .setMode(1).setBlend(1);
}

if (Ps.Mask & 0b100) {
    const geom2 = new Geometry("FloralGeom2", va2).attachTo(sc)
    .setMode(2).setBlend(0);
}

Scene.Manager.add(sc).useIndex(0);