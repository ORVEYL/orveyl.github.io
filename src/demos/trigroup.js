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

import * as KB from "../math/knuthbendix.js";
import { WordTree, Chamber } from "../node/scene/wordtree.js";
import { VertexArray, IndexBuffer, Vertex } from "../gpubuffer.js";
import { Orveyl } from "../orveyl.js";

import { Orveyl3dController } from "../node/component/controllers/Orveyl3dController.js";

Orveyl.DefaultPlayer.attach(
    new Orveyl3dController("3dController")
);

class TriGroup extends WordTree {
    constructor(name, PQR, scale, depth, bailout) {
        const [P,Q,R] = PQR;
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

        super(name, sys);

        this.PQR = PQR;
        this.scale = scale;
        this.depth = depth;
        this.bailout = bailout;

        this.tri = this.AAA(π/P, π/Q, π/R);
        this.spin = s => this.tri.geom.Case(s, 0, s);
        this.flux = f => this.tri.geom.Case(0, f, f);
        this.motor = dist => M4.Motor(
            0, this.spin(dist),0,
            this.flux(dist),0,0,
            1, Calc.Sgn(this.scale), 1,
        );

        this.sys.repr["a"] = M4.Refl(
            M4.rm(
                this.motor(this.tri.sides[0]), M4.RotI(π/2-this.tri.angles[2])
            ).T.Rx
        );
        this.sys.repr["b"] = M4.Refl(
            M4.rm(
                M4.RotI(this.tri.angles[1])
            ).T.Ry
        );
        this.sys.repr["c"] = M4.Refl(
            M4.id.Ry
        );
    }

    expand() {
        this.clear();
        this.orbit("", "bc", 2*this.PQR[1]);

        const t0 = Date.now();
        for (let i = 0; i < this.depth; ++i) {
            super.expand(1);
    
            const t = Date.now();
            const dt = t-t0;
            if (dt > 1000*this.bailout) {
                Orveyl.Status.innerHTML += `${this.name} bailed out after ${dt}ms @ depth=${i}<br>`;
                break;
            }
        }

        Orveyl.Status.innerHTML += `${this.name} generated ${this.count} chambers.<br>`;
    }

    AAA(a, b, c=π/2) {
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

    getCol(pal, v, M, par) {

        const RGauss = Rand.Gauss(0.5)(0.25);
        const [ev_col, od_col] = [
            V4.of(0.8, 0.8, 0.8, 1),
            V4.of(0.2, 0.2, 0.2, 1),
        ];
        const par_col = par ? ev_col : od_col;

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

            case 2: return v.col.dup.mul(
                V4.of(1, 0.75*RGauss(), 0, 1)
            );
            case 3: return v.col.dup.mul(
                V4.of(0.25*RGauss(), 0.5+0.25*RGauss(), 0, 1)
            );
            case 4: return v.col.dup.mul(
                V4.of(0, 0.5*RGauss(), 0.75+0.25*RGauss(), 1)
            );
            case 5: return v.col.dup.mul(
                V4.of(0.5*RGauss(), 0.5+0.25*RGauss(), 0.75+0.25*RGauss(), 1)
            );
            case 6: return v.col.dup.mul(
                V4.of(0.5+0.5*RGauss(), 0.25*RGauss(), 0.5+0.5*RGauss(), 1)
            );
            case 7: return v.col.dup.mul(
                V4.of(0.75+0.25*RGauss(), 0.5+0.25*RGauss(), 0.5*RGauss(), 1)
            );
            case 8: return v.col.dup.mul(
                V4.of(0.75+0.25*RGauss(), 0.75+0.25*RGauss(), 0.75+0.25*RGauss(), 1)
            );
            case 9: return v.col.dup.mul(
                V4.of(0.125*RGauss(), 0.125*RGauss(), 0.125*RGauss(), 1)
            );
            case 10: return v.col.dup.mul(
                V4.of(RGauss(), RGauss(), RGauss(), 1)
            );
        }

    }
};

const [P,Q,R] = [
    Calc.Clamp(2, 32)(Orveyl.InitParams.get("P") ?? 5),
    Calc.Clamp(2, 32)(Orveyl.InitParams.get("Q") ?? 4),
    Calc.Clamp(2, 32)(Orveyl.InitParams.get("R") ?? 2),
];

const floorR = Orveyl.InitParams.get("floorR") ?? 0;
const floorZ = Orveyl.InitParams.get("floorZ") ?? 0;

const ceilR = Orveyl.InitParams.get("ceilR") ?? 2;
const ceilZ = Orveyl.InitParams.get("ceilZ") ?? 0;

const offset = Orveyl.InitParams.get("offset") ?? 1.5;
const scale = Orveyl.InitParams.get("scale") ?? 1;
const skyCol = Orveyl.InitParams.get("skyCol") ?? "000000";
const fogAmt = Orveyl.InitParams.get("fogAmt") ?? 0;
const fogCol = Orveyl.InitParams.get("fogCol") ?? "000000";

const depth = Orveyl.InitParams.get("depth") ?? 16;
const bailout = Orveyl.InitParams.get("bailout") ?? 3;

const pqr_input = `type="number" min="2" max="32" step="1" style="width:2.5em"`;

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

Orveyl.Menu.innerHTML = `<form>` + [
    [
        `(P,Q,R):`,
        `<input id="P" ${pqr_input} name="P" value="${P}">`,
        `<input id="Q" ${pqr_input} name="Q" value="${Q}">`,
        `<input id="R" ${pqr_input} name="R" value="${R}">`,
    ].join(" "),
    ``,
    `:: Floor ::`,
    `- Mask: ${mask_input("floor")}`,
    `- Palette: ${pal_input("floor")}`,
    `- Radius: <input id="floorR" type="number" step="0.1" style="width:4em" value="${floorR}">`,
    `- Height: <input id="floorZ" type="number" step="0.1" style="width:4em" value="${floorZ}">`,
    ``,
    `:: Ceiling ::`,
    `- Mask: ${mask_input("ceil")}`,
    `- Palette: ${pal_input("ceil")}`,
    `- Radius: <input id="ceilR" type="number" step="0.1" style="width:4em" value="${ceilR}">`,
    `- Height: <input id="ceilZ" type="number" step="0.1" style="width:4em" value="${ceilZ}">`,
    ``,
    `Offset: <input id="offset" type="number" step="0.1" style="width:3em" value="${offset}">`,
    `Scale: <input id="scale" type="number" step="0.1" style="width:4em" value="${scale}">`,
    `Sky Color: <input id="skyCol" type="color" value=#${skyCol}>`,
    `Fog Amount: <input id="fogAmt" type="number" step="0.001" style="width:4em" value="${fogAmt}">`,
    `Fog Color: <input id="fogCol" type="color" value=#${fogCol}>`,
    ``,
    `Depth: <input id="depth" type="number" min="0" step="1" style="width:2.5em" value="${depth}">`,
    `Bailout: <input id="bailout" type="number" min="0" step="1" style="width:2.5em" value="${bailout}"> seconds`,
    ``,
    `:: <input type="button" id="generate" value="Generate"> ::`,
].join("<br>") + `</form>`;

document.getElementById("generate").onclick = () => {
    window.location.assign([
        `/?demo=trigroup`,
        `P=${document.getElementById("P").value}`,
        `Q=${document.getElementById("Q").value}`,
        `R=${document.getElementById("R").value}`,

        `floorM=${mask_byte("floor")}`,
        `floorPal=${document.getElementById("floorPal").value}`,
        `floorR=${document.getElementById("floorR").value}`,
        `floorZ=${document.getElementById("floorZ").value}`,

        `ceilM=${mask_byte("ceil")}`,
        `ceilPal=${document.getElementById("ceilPal").value}`,
        `ceilR=${document.getElementById("ceilR").value}`,
        `ceilZ=${document.getElementById("ceilZ").value}`,

        `offset=${document.getElementById("offset").value}`,
        `scale=${document.getElementById("scale").value}`,
        `skyCol=${document.getElementById("skyCol").value.slice(1)}`,
        `fogAmt=${document.getElementById("fogAmt").value}`,
        `fogCol=${document.getElementById("fogCol").value.slice(1)}`,

        `depth=${document.getElementById("depth").value}`,
        `bailout=${document.getElementById("bailout").value}`,
    ].join("&"));
};

const set_sky = rrggbb => {
    const [_, r, g, b] = rrggbb.match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    Orveyl.SetSky(
        parseInt(r,16)/255,
        parseInt(g,16)/255,
        parseInt(b,16)/255,
    );
};

const set_fog = (rrggbb, a) => {
    const [_, r, g, b] = rrggbb.match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    Orveyl.SetFog(
        parseInt(r,16)/255,
        parseInt(g,16)/255,
        parseInt(b,16)/255,
        a
    );
};

set_sky(skyCol);
document.getElementById("skyCol").addEventListener("change", ev => {
    set_sky(ev.target.value.slice(1));
}, false);

set_fog(fogCol, fogAmt);
document.getElementById("fogCol").addEventListener("change", ev => {
    set_fog(ev.target.value.slice(1), document.getElementById("fogAmt").value);
}, false);
document.getElementById("fogAmt").addEventListener("change", ev => {
    set_fog(document.getElementById("fogCol").value.slice(1), ev.target.value);
}, false);

const Tg = new TriGroup("TriGroup", [P,Q,R], scale, depth, bailout);
Scene.Manager.add(Tg).useIndex(0);

async function* genstep(tg, layer) {

    const A_from_O = M4.id;

    const B_from_A = M4.rm(
        tg.motor(tg.tri.sides[0]),
        M4.RotI(π-tg.tri.angles[2])
    );

    const C_from_B = M4.rm(
        tg.motor(tg.tri.sides[1]),
        M4.RotI(π-tg.tri.angles[0])
    );

    const [A,B,C] = [
        M4.lm(A_from_O),
        M4.lm(B_from_A, A_from_O),
        M4.lm(C_from_B, B_from_A, A_from_O),
    ];

    const [mAB, mBC, mCA] = [
        M4.lm(tg.motor(tg.tri.sides[0]/2), A),
        M4.lm(tg.motor(tg.tri.sides[1]/2), B),
        M4.lm(tg.motor(tg.tri.sides[2]/2), C),
    ];

    const matrix_templates = [
        [A, B, C],
        [A, mAB, mCA],
        [B, mBC, mAB],
        [C, mCA, mBC],
        [mAB, mBC, mCA],
    ];

    const dR = M4.MovZ(layer.radius);
    const dH = M4.MovZ(layer.height);

    const template = new VertexArray();
    for (let i of layer.mask) {
        for (let m of matrix_templates[i]) {
            template.push([M4.rm(m, dR).Cw, V4.ones]);
        }
    }

    const geom = new Geometry(`${tg.name}Geom`, new VertexArray()).attachTo(tg);
    if (offset > 0) {
        geom.rm(M4.MovX(offset), M4.RotJ(-π/2));
    } else {
        geom.rm(M4.MovZ(offset));
    }

    let batch_size = 16;
    let i = 0;
    const next = [tg.root];
    while (next.length) {
        const here = next.shift();
        here.par = !(here.parent.par ?? true);

        const M = M4.rm(dH, here.world_from_local);
        for (let v of template) {
            geom.va.push([
                M.ra(v.pos),
                tg.getCol(layer.palette, v, M, here.par)
            ]);
        }

        next.push(...here.collect(ch => ch instanceof Chamber));
        
        if (++i > batch_size) {
            i = 0; batch_size *= 2;
            geom.write();
            await new Promise(
                resolve => setTimeout(resolve, 10)
            );
            yield;
        }
    }

    geom.write();
}

Tg.expand();
const layers = [
    {
        mask: mask_idx("floor"),
        radius: floorR,
        height: floorZ,
        palette: pal_value("floor"),
    },
    {
        mask: mask_idx("ceil"),
        radius: ceilR,
        height: ceilZ,
        palette: pal_value("ceil"),
    },
];

for (let layer of layers) {
    (async () => { for await (const _ of genstep(Tg, layer)); })();
}