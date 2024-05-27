// adc :: trigroup.js

import * as Calc from "../math/calc.js";
import {
    Rand,
    π,τ,ϕ,
    Geom,
} from "../math/calc.js";
import { V4, B4, M4 } from "../math/vector.js";

import { Scene } from "../node/scene.js";
import { Geometry } from "../node/scene/geometry.js";
import { Camera } from "../node/scene/camera.js";

import * as KB from "../math/knuthbendix.js";
import { WordTree } from "../node/scene/wordtree.js";
import { VertexArray, IndexBuffer, Vertex } from "../gpubuffer.js";
import { Orveyl } from "../orveyl.js";

const [P,Q,R] = [
    Calc.Clamp(Orveyl.InitParams.get("P") ?? 5, 2, 16),
    Calc.Clamp(Orveyl.InitParams.get("Q") ?? 4, 2, 16),
    Calc.Clamp(Orveyl.InitParams.get("R") ?? 2, 2, 16),
];

const floorZ = Orveyl.InitParams.get("floorZ") ?? 0;
const ceilZ = Orveyl.InitParams.get("ceilZ") ?? 2;

const offset = Orveyl.InitParams.get("offset") ?? 1.5;
const scale = Orveyl.InitParams.get("scale") ?? 1;
const depth = Orveyl.InitParams.get("depth") ?? 16;
const bailout = Orveyl.InitParams.get("bailout") ?? 3;

const pqr_input = `type="number" min="2" max="16" step="1" style="width:2.5em"`;

const mask_input = name => {
    const mask = mask_value(name);
    return [
        `<input id="${name}M0" type="checkbox" ${mask & 0b00001 ? "checked" : ""}>`,
        `<input id="${name}M1" type="checkbox" ${mask & 0b00010 ? "checked" : ""}>`,
        `<input id="${name}M2" type="checkbox" ${mask & 0b00100 ? "checked" : ""}>`,
        `<input id="${name}M3" type="checkbox" ${mask & 0b01000 ? "checked" : ""}>`,
        `<input id="${name}M4" type="checkbox" ${mask & 0b10000 ? "checked" : ""}>`,
    ].join("")
};

const mask_default = {
    floor: 0b00001, ceil: 0b11110,
};
const mask_value = name => Orveyl.InitParams.get(`${name}M`) ?? mask_default[name];

const mask_arr = name => {
    return [
        document.getElementById(`${name}M0`).checked,
        document.getElementById(`${name}M1`).checked,
        document.getElementById(`${name}M2`).checked,
        document.getElementById(`${name}M3`).checked,
        document.getElementById(`${name}M4`).checked,
    ];
};

const mask_byte = name => {
    const arr = mask_arr(name);
    return (
        (arr[0]     ) |
        (arr[1] << 1) |
        (arr[2] << 2) |
        (arr[3] << 3) |
        (arr[4] << 4)
    );
};

const mask_idx = name => {
    const out = [];
    const arr = mask_arr(name);
    for (let i=0; i<arr.length; ++i) {
        if (arr[i]) out.push(i);
    }
    return out;
}

const pal_input = name => {
    const pal = pal_value(name);
    return [
        `<select id="${name}Pal">`,
        `<option value="0" ${pal == 0 ? "selected" : ""}>Default</option>`,
        `<option value="1" ${pal == 1 ? "selected" : ""}>Rainbow</option>`,
        `<option value="2" ${pal == 2 ? "selected" : ""}>Flame</option>`,
        `<option value="3" ${pal == 3 ? "selected" : ""}>Forest</option>`,
        `<option value="4" ${pal == 4 ? "selected" : ""}>Ocean</option>`,
        `<option value="5" ${pal == 5 ? "selected" : ""}>Mist</option>`,
        `<option value="6" ${pal == 6 ? "selected" : ""}>Dusk</option>`,
        `<option value="7" ${pal == 7 ? "selected" : ""}>Shine</option>`,
        `<option value="8" ${pal == 8 ? "selected" : ""}>Prism</option>`,
        `<option value="9" ${pal == 9 ? "selected" : ""}>Void</option>`,
        `<option value="10" ${pal == 10 ? "selected" : ""}>Random</option>`,
        `</select>`,
    ].join("")
};

const pal_default = {
    floor: 0, ceil: 1,
};
const pal_value = name => Orveyl.InitParams.get(`${name}Pal`) ?? pal_default[name];

Orveyl.Parameters.innerHTML = `<form>` + [
    [
        `(P,Q,R):`,
        `<input id="P" ${pqr_input} name="P" value="${P}">`,
        `<input id="Q" ${pqr_input} name="Q" value="${Q}">`,
        `<input id="R" ${pqr_input} name="R" value="${R}">`,
    ].join(" "),
    ``,
    `Floor Mask: ${mask_input("floor")}`,
    `Floor Palette: ${pal_input("floor")}`,
    `Floor Height: <input id="floorZ" type="number" step="0.1" style="width:4em" value="${floorZ}">`,
    ``,
    `Ceil Mask: ${mask_input("ceil")}`,
    `Ceil Palette: ${pal_input("ceil")}`,
    `Ceil Height: <input id="ceilZ" type="number" step="0.1" style="width:4em" value="${ceilZ}">`,
    ``,
    `Offset: <input id="offset" type="number" step="0.1" style="width:3em" value="${offset}">`,
    `Scale: <input id="scale" type="number" step="0.1" style="width:4em" value="${scale}">`,
    ``,
    `Depth: <input id="depth" type="number" min="0" step="1" style="width:2.5em" value="${depth}">`,
    `Bailout: <input id="bailout" type="number" min="0" step="1" style="width:2.5em" value="${bailout}"> seconds`,
    
    `<input type="button" id="generate" value="Generate">`,
].join("<br>") + `</form>`;

document.getElementById("generate").onclick = () => {
    window.location.assign([
        `/?demo=trigroup`,
        `P=${document.getElementById("P").value}`,
        `Q=${document.getElementById("Q").value}`,
        `R=${document.getElementById("R").value}`,

        `floorM=${mask_byte("floor")}`,
        `floorPal=${document.getElementById("floorPal").value}`,
        `floorZ=${document.getElementById("floorZ").value}`,

        `ceilM=${mask_byte("ceil")}`,
        `ceilPal=${document.getElementById("ceilPal").value}`,
        `ceilZ=${document.getElementById("ceilZ").value}`,

        `offset=${document.getElementById("offset").value}`,
        `scale=${document.getElementById("scale").value}`,

        `depth=${document.getElementById("depth").value}`,
        `bailout=${document.getElementById("bailout").value}`,
    ].join("&"));
};

const sys = new KB.System(
    ["a", "b", "c"],
    ["a", "b", "c"],
    KB.Rule.Array(
        ["aa"], ["bb"], ["cc"],
        ["ab".repeat(P)],
        ["bc".repeat(Q)],
        ["ac".repeat(R)],
    )
).complete();

function AAA(a, b, c=π/2) {
    const tri = {};

    tri.angles = [a, b, c];
    tri.sides = [0,0,0];

    const excess = Calc.Excess(a,b,c);
    tri.geom = Geom.Match(excess);
    if (tri.geom === Geom.Par) {
        tri.sides[0] = Calc.Abs(scale);
        tri.sides[1] = Calc.Abs(scale) * Geom.Sph.Sin(b) / Geom.Sph.Sin(a);
        tri.sides[2] = Calc.Abs(scale) * Geom.Sph.Sin(c) / Geom.Sph.Sin(a);

        const s = tri.perimeter / 2;
        tri.area = Calc.Sqrt(
            s*
            (s-tri.sides[0])*
            (s-tri.sides[1])*
            (s-tri.sides[2])
        );
        return tri;
    }

    const [cA, sA] = Geom.Sph.Exp(a);
    const [cB, sB] = Geom.Sph.Exp(b);
    const [cC, sC] = Geom.Sph.Exp(c);

    tri.sides[0] = tri.geom.CosInv((cA + cB*cC) / (sB*sC));
    tri.sides[1] = tri.geom.CosInv((cB + cC*cA) / (sC*sA));
    tri.sides[2] = tri.geom.CosInv((cC + cA*cB) / (sA*sB));

    tri.area = Calc.Abs(-excess);

    return tri;
}

const tri = AAA(π/P, π/Q, π/R);
const [
    dAB, dBC, dCA,
    tab, tbc, tca,
] = [
    tri.sides[0],
    tri.sides[1],
    tri.sides[2],

    tri.angles[0],
    tri.angles[1],
    tri.angles[2],
];

const [sp, fl] = [
    s => tri.geom.Case(s,0,s),
    f => tri.geom.Case(0,f,f),
];

const Mot = (d, dt=1) => M4.Motor(
    0,sp(-d),0,
    fl(+d),0,0,
    1, 1, dt
);

sys.repr["a"] = M4.Refl(
    M4.rm(Mot(dAB), M4.RotI(π/2-tca)).T.Rx
);
sys.repr["b"] = M4.Refl(
    M4.rm(M4.RotI(tbc)).T.Ry
);
sys.repr["c"] = M4.Refl(
    M4.rm().T.Ry
);

const SphR = M4.MovZ(tri.geom.Case(scale,0,0));
const A_from_O = M4.id;
const B_from_A = M4.rm(Mot(dAB), M4.RotI(π-tca));
const C_from_B = M4.rm(Mot(dBC), M4.RotI(π-tab));

const [A,B,C] = [
    M4.lm(SphR, A_from_O),
    M4.lm(SphR, B_from_A, A_from_O),
    M4.lm(SphR, C_from_B, B_from_A, A_from_O),
];

const [mAB, mBC, mCA] = [
    M4.lm(SphR, Mot(dAB, 1/2), A_from_O),
    M4.lm(SphR, Mot(dBC, 1/2), B_from_A, A_from_O),
    M4.lm(SphR, Mot(dCA, 1/2), C_from_B, B_from_A, A_from_O),
];

const matrix_templates = [
    [A, B, C],
    [A, mAB, mCA],
    [B, mBC, mAB],
    [C, mCA, mBC],
    [mAB, mBC, mCA],
];

const FloorZ = M4.MovZ(floorZ);
const floor_template = new VertexArray();
for (let i of mask_idx("floor")) {
    for (let m of matrix_templates[i]) {
        floor_template.push([M4.rm(m, FloorZ).Cw, V4.ones]);
    }
}

const CeilZ = M4.MovZ(ceilZ);
const ceil_template = new VertexArray();
for (let i of mask_idx("ceil")) {
    for (let m of matrix_templates[i]) {
        ceil_template.push([M4.rm(m, CeilZ).Cw, V4.ones]);
    }
}

const floorPal = pal_value("floor");
const ceilPal = pal_value("ceil");

const [ev_col, od_col] = [
    V4.of(0.8, 0.8, 0.8, 1),
    V4.of(0.2, 0.2, 0.2, 1),
];

const RGauss = Rand.Gauss(0.5)(0.25);

const va = new VertexArray();
const trigroup_wt = new WordTree("TriGroupWT", sys);
const onAdd = here => {
    const M = here.world_from_local;

    here.par = !(here.parent.par ?? true);
    const par_col = here.par ? ev_col : od_col;

    const get_col = (pal, v) => {

        switch (+pal) {
            default:
            case 0:
                return v.col.dup.mul(par_col);

            case 1: {
                const c = M.ra(v.pos).setW(0);
                let csc = Calc.InvSqrt(c.ip(c));
                if (isFinite(csc)) {
                    c.sc(csc).add(V4.ones).sc(0.5).setW(1);
                } else {
                    c.set(1,1,1,1);
                }

                return c.mul(par_col);
            }

            case 2: {
                return v.col.dup.mul(V4.of(1, 0.75*RGauss(), 0, 1));
            }

            case 3: {
                return v.col.dup.mul(V4.of(0.25*RGauss(), 0.5+0.25*RGauss(), 0, 1));
            }

            case 4: {
                return v.col.dup.mul(V4.of(0, 0.5*RGauss(), 0.75+0.25*RGauss(), 1));
            }

            case 5: {
                return v.col.dup.mul(V4.of(0.5*RGauss(), 0.5+0.25*RGauss(), 0.75+0.25*RGauss(), 1));
            }

            case 6: {
                return v.col.dup.mul(V4.of(0.5+0.5*RGauss(), 0.25*RGauss(), 0.5+0.5*RGauss(), 1));
            }

            case 7: {
                return v.col.dup.mul(V4.of(0.75+0.25*RGauss(), 0.5+0.25*RGauss(), 0.5*RGauss(), 1));
            }

            case 8: {
                return v.col.dup.mul(V4.of(0.75+0.25*RGauss(), 0.75+0.25*RGauss(), 0.75+0.25*RGauss(), 1));
            }

            case 9: {
                return v.col.dup.mul(V4.of(0.125*RGauss(), 0.125*RGauss(), 0.125*RGauss(), 1));
            }

            case 10: {
                return v.col.dup.mul(V4.of(RGauss(), RGauss(), RGauss(), 1));
            }
        }
    }

    for (let v of floor_template) {
        const p = M.ra(v.pos);
        va.push([p, get_col(floorPal, v)]);
    }

    for (let v of ceil_template) {
        const p = M.ra(v.pos);
        va.push([p, get_col(ceilPal, v)]);
    }
};

onAdd(trigroup_wt.root);
trigroup_wt.orbit("", "bc", 2*Q, onAdd);

const total_t0 = Date.now();
for (let i = 0; i < depth; ++i) {
    trigroup_wt.expand(1, onAdd);

    const t = Date.now();
    const dt = t-total_t0;
    if (dt > 1000*bailout) {
        Orveyl.Status.innerHTML += `Bailed out after ${dt}ms @ depth=${i}`;
        break;
    }
}

const geom = new Geometry("TriGroup", null, va);
if (offset > 0) {
    tri.geom.Case(
        () => { geom.rm( M4.MovX(offset), M4.RotJ(+π/2) )},
        () => { geom.rm( M4.MovX(offset), M4.RotJ(-π/2) ) },
        () => { geom.rm( M4.MovX(offset), M4.RotJ(-Calc.Sgn(scale) * π/2) ) },
    )();
} else if (offset < 0) {
    geom.rm(M4.MovZ(offset));
}

Scene.Manager.add(geom).useIndex(0);
