// adc :: floral.js

import * as Calc from "../math/calc.js";
import {
    Rand, π,
} from "../math/calc.js";
import { V4, B4, M4 } from "../math/vector.js";

import { Scene } from "../node/scene.js";
import { Geometry } from "../node/scene/geometry.js";

import { VertexArray, IndexBuffer, Vertex, IndexArray } from "../gpubuffer.js";
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
        Rand.Gauss(0)(1/12)(), Rand.Gauss(0)(1/12)(), Rand.Gauss(0)(1/4)(),
        Rand.Gauss(1/2)(1/4)(), Rand.Gauss(0)(1/8)(), Rand.Gauss(0)(1/8)(),
    ],
    BR: [
        Rand.Gauss(0)(1/12)(), Rand.Gauss(0)(1/12)(), Rand.Gauss(0)(1/4)(),
        Rand.Gauss(1/2)(1/4)(), Rand.Gauss(0)(1/8)(), Rand.Gauss(0)(1/8)(),
    ],

    SSL: 1, SSLP: 1, SFL: 1,
    SSR: 1, SSRP: 1, SFR: 1,
    
    DL: [1, 1, 1, 1, 1, 1],
    DR: [1, 1, 1, 1, 1, 1],
    
    CO: [Rand.Unit(), Rand.Unit(), Rand.Unit(), 1],
    CL: [Rand.Unit(), Rand.Unit(), Rand.Unit(), 0.2],
    CR: [Rand.Unit(), Rand.Unit(), Rand.Unit(), 0.2],    
    CF: [1,1,1,1],
    CS: [0,0,0,0], CG: [0,0,0,0],

    Depth: 6,

    Mask: 0b1010,
};

const Pstr = Orveyl.InitParams.get("Ps");
if (Pstr) { Ps = decode(Pstr); } else { randomize(); }

const [
    BL, BR,
    DL, DR,
    CO,
    CL, CR,
    CF,
    CS, CG,
] = [
    B4.of(...Ps.BL), B4.of(...Ps.BR),
    B4.of(...Ps.DL), B4.of(...Ps.DR),
    V4.of(...Ps.CO),
    V4.of(...Ps.CL), V4.of(...Ps.CR),
    V4.of(...Ps.CF),
    V4.of(...Ps.CS), V4.of(...Ps.CG),
];

const Base_BL = BL.dup;
const Base_BR = BR.dup;

const num_input = col => `type="number" min="-10" max="10" step="0.05" style="width:6em; background-color:${col};"`;
const int_input = `type="number" min="1" max="16" step="1" style="width:2.5em"`;

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
    `:: <input type="button" id="generate" value="Generate URL"> :: <input type="button" id="randomize" value="Randomize"> ::`,
    ``,
    `<details><summary title="Branch Parameters">:: Branch Parameters ::</summary>`,
    [
        `L Branch:<br>`,
        `<input type="button" id="clearSpinL" value="Clear"> ( Spin:`,
        `<input id="BLk" ${num_input("#088")} name="BLk" value="${BL[2]}">`,
        `<input id="BLj" ${num_input("#808")} name="BLj" value="${BL[1]}">`,
        `<input id="BLi" ${num_input("#880")} name="BLi" value="${BL[0]}">`,
        ` * <input id="SSL" ${num_input("inherit")} name="SSL" value="${Ps.SSL}"> π<input id="SSLP" type="checkbox" ${Ps.SSLP ? "checked" : ""}></input>`,
        ` )<br>`,
        `<input type="button" id="clearFluxL" value="Clear"> [ Flux:`,
        `<input id="BLX" ${num_input("#800")} name="BLX" value="${BL[3]}">`,
        `<input id="BLY" ${num_input("#080")} name="BLY" value="${BL[4]}">`,
        `<input id="BLZ" ${num_input("#008")} name="BLZ" value="${BL[5]}">`,
        ` * <input id="SFL" ${num_input("inherit")} name="SFL" value="${Ps.SFL}">`,
        ` ]`,
    ].join(" "),
    ``,
    [
        `R Branch:<br>`,
        `<input type="button" id="clearSpinR" value="Clear"> ( Spin:`,
        `<input id="BRk" ${num_input("#088")} name="BRk" value="${BR[2]}">`,
        `<input id="BRj" ${num_input("#808")} name="BRj" value="${BR[1]}">`,
        `<input id="BRi" ${num_input("#880")} name="BRi" value="${BR[0]}">`,
        ` * <input id="SSR" ${num_input("inherit")} name="SSR" value="${Ps.SSR}"> π<input id="SSRP" type="checkbox" ${Ps.SSRP ? "checked" : ""}></input>`,
        ` )<br>`,
        `<input type="button" id="clearFluxR" value="Clear"> [ Flux:`,
        `<input id="BRX" ${num_input("#800")} name="BRX" value="${BR[3]}">`,
        `<input id="BRY" ${num_input("#080")} name="BRY" value="${BR[4]}">`,
        `<input id="BRZ" ${num_input("#008")} name="BRZ" value="${BR[5]}">`,
        ` * <input id="SFR" ${num_input("inherit")} name="SFR" value="${Ps.SFR}">`,
        ` ]`,
    ].join(" "),
    ``,
    [
        `L Factor:<br>`,
        `( Spin: <input id="DLk" ${num_input("#088")} name="DLk" value="${DL[2]}">`,
        `<input id="DLj" ${num_input("#808")} name="DLj" value="${DL[1]}">`,
        `<input id="DLi" ${num_input("#880")} name="DLi" value="${DL[0]}">`,
        ` )<br>`,
        `[ Flux: <input id="DLX" ${num_input("#800")} name="DLX" value="${DL[3]}">`,
        `<input id="DLY" ${num_input("#080")} name="DLY" value="${DL[4]}">`,
        `<input id="DLZ" ${num_input("#008")} name="DLZ" value="${DL[5]}"> ]`,
    ].join(" "),
    ``,
    [
        `R Factor:<br>`,
        `( Spin: <input id="DRk" ${num_input("#088")} name="DRk" value="${DR[2]}">`,
        `<input id="DRj" ${num_input("#808")} name="DRj" value="${DR[1]}">`,
        `<input id="DRi" ${num_input("#880")} name="DRi" value="${DR[0]}">`,
        ` )<br>`,
        `[ Flux: <input id="DRX" ${num_input("#800")} name="DRX" value="${DR[3]}">`,
        `<input id="DRY" ${num_input("#080")} name="DRY" value="${DR[4]}">`,
        `<input id="DRZ" ${num_input("#008")} name="DRZ" value="${DR[5]}"> ]`,
    ].join(" "),
    `</details>`,
    `<hr>`,
    `<details><summary title="Appearance">:: Appearance ::</summary>`,
    `Root Color: <input id="rootCol" type="color" value=#${rgb2hex(CO)}>`,
    `L Color: <input id="LCol" type="color" value=#${rgb2hex(CL)}> <input id="LColWeight" ${num_input("inherit")} name="LColWeight" value="${CL.w}">`,
    `R Color: <input id="RCol" type="color" value=#${rgb2hex(CR)}> <input id="RColWeight" ${num_input("inherit")} name="RColWeight" value="${CR.w}">`,
    `Leaf Color: <input id="leafCol" type="color" value=#${rgb2hex(CF)}> <input id="leafColWeight" ${num_input("inherit")} name="leafColWeight" value="${CF.w}">`,
    `<div id="SkyFog">`,
    `Sky Color: <input id="skyCol" type="color" value=#${rgb2hex(CS)}>`,
    `Fog Color: <input id="fogCol" type="color" value=#${rgb2hex(CG)}> <input id="fogColAlpha" type="number" min="0" max="10" step="0.001" style="width:4em;" name="fogColAlpha" value="${CG.w}">`,
    `</div>`,
    `Depth: <input id="depth" ${int_input} name="depth" value="${Ps.Depth}">`,
    [
        `<div id="Mask">Mask: `,
            `<input id="M0" type="checkbox" ${Ps.Mask & 0b0001 ? "checked" : ""}>`,
            `<input id="M1" type="checkbox" ${Ps.Mask & 0b0010 ? "checked" : ""}>`,
            `<input id="M2" type="checkbox" ${Ps.Mask & 0b0100 ? "checked" : ""}>`,
            `<input id="M3" type="checkbox" ${Ps.Mask & 0b1000 ? "checked" : ""}>`,
            `<br>Gizmos:`,
            `<input id="GizmoL" type="checkbox" ${Ps.Mask & 0b0001_0000 ? "checked" : ""}>`,
            `<input id="GizmoR" type="checkbox" ${Ps.Mask & 0b0010_0000 ? "checked" : ""}>`,
            `</div></details>`,
    ].join(" "),
    `<hr>`,
    `<details>
        <summary>:: Help ::</summary>
        <ul>
            <li>Generate URL: save current flower to URL</li>
            <li>Randomize: create a new random flower</li>
            <br>
            <li>Branch Parameters:
            <ul>
                <li>Values determine the angle and length of growth.
                <li>The Left and Right branches can be manipulated separately.
                <li>Consecutive branches are scaled by the L/R Factors.
                <li>Negative factors can create alternating patterns.
                <li>Inputs:
                <ul>
                    <li>Spin: (
                        <span style="color:#8ff">yz</span>,
                        <span style="color:#f8f">zx</span>,
                        <span style="color:#ff8">xy</span>
                    ) - rotation between each node </li>
                    <li> Flux: [
                        <span style="color:#f88">x</span>,
                        <span style="color:#8f8">y</span>,
                        <span style="color:#88f">z</span>
                    ] - translation between each node</li>
                </ul></li>
                <li>Spin angles are in radians (with optional factor of π)
                <li>Large values lose precision quickly. Watch out!
            </ul>
            <br>
            <li>Root Color: color of initial node</li>
            <li>L/R Color: tint color to apply to Left / Right branch, with weight</li>
            <li>Leaf Color: applied to final layer of branches, with weight</li>
            <br>
            <li>Sky Color: Do you love the color of the sky?</li>
            <li>Fog Color: applied to objects based on density value</li>
            <br>
            <li>Depth: how many layers of growth to generate</li>
            <li>Mask: toggles visibility of different meshes</li>
            <li>Gizmos: toggles cool & helpful debug visuals</li>
        </ul>
    </details>`
].join("<br>") + `</form>`;

const update = ev => {
    if (ev.target.parentElement.id == "Mask") update_visibility();
    else if (ev.target.parentElement.id == "SkyFog") update_skyfog();
    else populate();
}

const update_BLspin = ev => {
    document.getElementById(`BLk`).value = BL.k;
    document.getElementById(`BLj`).value = BL.j;
    document.getElementById(`BLi`).value = BL.i;
    document.getElementById(`BLX`).value = BL.X;
    document.getElementById(`BLY`).value = BL.Y;
    document.getElementById(`BLZ`).value = BL.Z;
    update(ev);
}

const update_BLflux = ev => {
    document.getElementById(`BLX`).value = BL.X;
    document.getElementById(`BLY`).value = BL.Y;
    document.getElementById(`BLZ`).value = BL.Z;
    update(ev);
}

const update_BRspin = ev => {
    document.getElementById(`BRk`).value = BR.k;
    document.getElementById(`BRj`).value = BR.j;
    document.getElementById(`BRi`).value = BR.i;
    update(ev);
}

const update_BRflux = ev => {
    document.getElementById(`BRX`).value = BR.X;
    document.getElementById(`BRY`).value = BR.Y;
    document.getElementById(`BRZ`).value = BR.Z;
    update(ev);
}

document.getElementById("clearSpinL").onclick = ev => { BL.setSpin(0,0,0); update_BLspin(ev); }
document.getElementById("clearFluxL").onclick = ev => { BL.setFlux(0,0,0); update_BLflux(ev); }
document.getElementById("clearSpinR").onclick = ev => { BR.setSpin(0,0,0); update_BRspin(ev); }
document.getElementById("clearFluxR").onclick = ev => { BR.setFlux(0,0,0); update_BRflux(ev); }

document.getElementById("menu").addEventListener("change", ev => update(ev), false);

document.getElementById("generate").onclick = () => {
    update_parameters();
    window.location.assign([
        `/?demo=floral`,
        `Ps=${encode({
            BL: [...Base_BL], BR: [...Base_BR],
            SSL: Ps.SSL, SSLP: Ps.SSLP, SFL: Ps.SFL,
            SSR: Ps.SSR, SSRP: Ps.SSRP, SFR: Ps.SFR,
            DL: [...DL], DR: [...DR],
            CO: [...CO],
            CL: [...CL], CR: [...CR],
            CF: [...CF],
            CS: [...CS], CG: [...CG],
            Depth: Math.min(8, Ps.Depth),
            Mask: Ps.Mask,
        })}`,
    ].join("&"));
};

document.getElementById("randomize").onclick = () => {
    randomize();
    window.location.assign([
        `/?demo=floral`,
        `Ps=${encode({
            BL: [...Ps.BL], BR: [...Ps.BR],
            SSL: Ps.SSL, SSLP: Ps.SSLP, SFL: Ps.SFL,
            SSR: Ps.SSR, SSRP: Ps.SSRP, SFR: Ps.SFR,
            DL: [...Ps.DL], DR: [...Ps.DR],
            CO: [...Ps.CO],
            CL: [...Ps.CL], CR: [...Ps.CR],
            CF: [...Ps.CF],
            CS: [...Ps.CS], CG: [...Ps.CG],
            Depth: Ps.Depth,
            Mask: Ps.Mask,
        })}`,
    ].join("&"));
}

let geom_va = new VertexArray();
const geom0 = new Geometry("FloralGeom0", geom_va, new IndexArray()).setMode(0).setBlend(1);
const geom1 = new Geometry("FloralGeom1", geom_va, new IndexArray()).setMode(1).setBlend(1);
const geom2 = new Geometry("FloralGeom2", geom_va, new IndexArray()).setMode(2).setBlend(0);
const geom3 = new Geometry("FloralGeom3", geom_va, new IndexArray()).setMode(2).setBlend(0);

let gizmoL_va = new VertexArray();
let gizmoR_va = new VertexArray();
let gizmo_ia = new VertexArray();
const gizmoL_geom = new Geometry("GizmoL", gizmoL_va, new IndexArray()).setMode(1).setBlend(1);
const gizmoR_geom = new Geometry("GizmoR", gizmoR_va, new IndexArray()).setMode(1).setBlend(1);

const geom_clear = () => {
    geom_va = new VertexArray();
    geom0.va = geom_va; geom0.ia = new IndexArray();
    geom1.va = geom_va; geom1.ia = new IndexArray();
    geom2.va = geom_va; geom2.ia = new IndexArray();
    geom3.va = geom_va; geom3.ia = new IndexArray();

    gizmoL_va = new VertexArray();
    gizmoR_va = new VertexArray();
    gizmo_ia = new IndexArray();
    gizmoL_geom.va = gizmoL_va; gizmoL_geom.ia = gizmo_ia;
    gizmoR_geom.va = gizmoR_va; gizmoR_geom.ia = gizmo_ia;
}

const sc = new Scene("Floral");
sc.attach(geom0, geom1, geom2, geom3);
sc.attach(gizmoL_geom, gizmoR_geom);
Scene.Manager.add(sc).useIndex(0);

let timestamp = Date.now();

async function* gen(start_timestamp) {
    const root = { M: M4.id, L: BL, R: BR, c: CO, d: Ps.Depth };

    geom_clear();

    let batch_size = 1;
    let i = 0;
    const next = [root];
    while (next.length) {
        // abort on new modifications
        if (timestamp > start_timestamp) return;

        const here = next.shift();
        next.push(...branch(here));

        if (++i > batch_size) {
            i = 0; batch_size *= 2;

            geom0.write();
            geom1.write();
            geom2.write();

            gizmoL_geom.write();
            gizmoR_geom.write();

            await new Promise(
                resolve => setTimeout(resolve, 10)
            );
            yield;
        }
    }

    geom3.write();
}

const signmin = x => x < 0 ? Math.min(x,-0.025) : Math.max(x,0.025);

const branch = here => {
    if (here.d < 0) return [];
    const final = (here.d == 0);

    const [L, R] = [
        here.L.dup,
        here.R.dup,
    ];

    const [M, ML, MR] = [
        here.M,
        M4.rm(here.M, L.exp()),
        M4.rm(here.M, R.exp()),
    ];

    const [c, cL, cR] = [
        here.c,
        V4.mix(here.c, final?CF:CL)((final?CF:CL).w).setW(1),
        V4.mix(here.c, final?CF:CR)((final?CF:CR).w).setW(1),
    ];

    gizmoL_va.push(
        [M.Cw, [0,0,0,1]],
        [M4.rm(here.M, M4.Rot(...L.spin), M4.MovX(signmin(L.X))).Cw, [1,1/2,0,1]],
        [M4.rm(here.M, M4.RotK(L.k), M4.MovY(signmin(L.Y))).Cw, [3/4,1,0,1]],
        [M4.rm(here.M, M4.RotK(L.k), M4.MovZ(signmin(L.Z))).Cw, [1/2,0,1,1]],
    );

    gizmoR_va.push(
        [M.Cw, [0,0,0,1]],
        [M4.rm(here.M, M4.Rot(...R.spin), M4.MovX(signmin(R.X))).Cw, [1,0,1/2,1]],
        [M4.rm(here.M, M4.RotK(R.k), M4.MovY(signmin(R.Y))).Cw, [0,1,3/4,1]],
        [M4.rm(here.M, M4.RotK(R.k), M4.MovZ(signmin(R.Z))).Cw, [0,1/2,1,1]],
    );

    gizmo_ia.push(0,1, 0,2, 0,3);
    gizmo_ia.base += 4;

    geom_va.push(
        [M.Cw, c],
        [ML.Cw, cL],
        [MR.Cw, cR],
    );

    if (!final) {
        geom0.ia.push(1,2);
        geom1.ia.push(0,1, 0,2);
        geom2.ia.push(0,1,2);

        geom0.ia.base += 3;
        geom1.ia.base += 3;
        geom2.ia.base += 3;
        geom3.ia.base += 3;

        L.mul(DL);
        R.mul(DR);

        return [
            {M:ML, L:L, R:R, c:cL, d:here.d-1},
            {M:MR, L:L, R:R, c:cR, d:here.d-1},
        ];
    }

    const roll = M4.RotK(2*π/3);
    const r = V4.dist(ML.Cw, MR.Cw);
    const push = () => M4.MovY(r * Rand.Gauss(1/2)(1/8)());
    const Q = M.dup; let P = push();

    geom_va.push([Q.rm(roll, P).Cw, cL], [Q.rm(roll, P).Cw, cR]);
    Q.copy(M).rm(roll); P = push();
    geom_va.push([Q.rm(roll, P).Cw, cL], [Q.rm(roll, P).Cw, cR]);
    Q.copy(M).rm(roll, roll); P = push();
    geom_va.push([Q.rm(roll, P).Cw, cL], [Q.rm(roll, P).Cw, cR]);

    geom3.ia.push(
        0,1,2,
        0,3,4,
        0,5,6,
        0,7,8,
    );

    geom0.ia.base += 9;
    geom1.ia.base += 9;
    geom2.ia.base += 9;
    geom3.ia.base += 9;

    return [];
};

const update_parameters = () => {
    Base_BL.set(
        document.getElementById("BLi").value,
        document.getElementById("BLj").value,
        document.getElementById("BLk").value,
        document.getElementById("BLX").value,
        document.getElementById("BLY").value,
        document.getElementById("BLZ").value,
    );

    Ps.SSL = +document.getElementById("SSL").value;
    Ps.SSLP = document.getElementById("SSLP").checked ? 1 : 0;
    Ps.SFL = +document.getElementById("SFL").value;
    BL.copy(Base_BL).scSpin(Ps.SSL*(Ps.SSLP?π:1)).scFlux(Ps.SFL);

    Base_BR.set(
        document.getElementById("BRi").value,
        document.getElementById("BRj").value,
        document.getElementById("BRk").value,
        document.getElementById("BRX").value,
        document.getElementById("BRY").value,
        document.getElementById("BRZ").value,
    );

    Ps.SSR = +document.getElementById("SSR").value;
    Ps.SSRP = document.getElementById("SSRP").checked ? 1 : 0;
    Ps.SFR = +document.getElementById("SFR").value;
    BR.copy(Base_BR).scSpin(Ps.SSR*(Ps.SSRP?π:1)).scFlux(Ps.SFR);

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
    CF.copy(hex2rgb(document.getElementById("leafCol").value.slice(1))).setW(
        document.getElementById("leafColWeight").value,
    );

    update_skyfog();

    Ps.Depth = Math.min(16, document.getElementById("depth").value);

    update_visibility();
}

const update_skyfog = () => {
    CS.copy(hex2rgb(document.getElementById("skyCol").value.slice(1))).setW(1);
    CG.copy(hex2rgb(document.getElementById("fogCol").value.slice(1))).setW(
        document.getElementById("fogColAlpha").value,
    );

    Orveyl.SetSky(...CS);
    Orveyl.SetFog(...CG);
}

const update_visibility = () => {
    Ps.Mask = (
        (document.getElementById("M0").checked << 0) |
        (document.getElementById("M1").checked << 1) |
        (document.getElementById("M2").checked << 2) |
        (document.getElementById("M3").checked << 3) |
        (document.getElementById("GizmoL").checked << 4) |
        (document.getElementById("GizmoR").checked << 5) 
    );

    geom0.setVisible(Ps.Mask & 0b0001);
    geom1.setVisible(Ps.Mask & 0b0010);
    geom2.setVisible(Ps.Mask & 0b0100);
    geom3.setVisible(Ps.Mask & 0b1000);

    gizmoL_geom.setVisible(Ps.Mask & 0b0001_0000);
    gizmoR_geom.setVisible(Ps.Mask & 0b0010_0000);
}

const populate = async => {
    update_parameters();
    timestamp = Date.now();
    (async () => { for await (const _ of gen(timestamp)); })()
}

populate();