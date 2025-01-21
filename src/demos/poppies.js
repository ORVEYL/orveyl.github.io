// adc :: poppies.js

import * as Calc from "../math/calc.js";
import {
    Rand,
    π,τ,ϕ,
    Geom,
} from "../math/calc.js";
import { V4, B4, M4 } from "../math/vector.js";

import { Scene } from "../node/scene.js";
import { Camera } from "../node/scene/camera.js";
import { Geometry } from "../node/scene/geometry.js";
import { Ticker } from "../node/component/ticker.js";

import * as KB from "../math/knuthbendix.js";
import { WordTree } from "../node/scene/wordtree.js";
import { VertexArray, IndexBuffer, Vertex } from "../gpubuffer.js";
import { Orveyl } from "../orveyl.js";

import { Orveyl3dController } from "../node/component/controllers/Orveyl3dController.js";

Orveyl.DefaultPlayer.attach(
    new Orveyl3dController("3dController")
);

const size = Calc.Clamp(0, 4)(Orveyl.InitParams.get("size") ?? 0);

Orveyl.Menu.innerHTML = [
    `Size: ${[
        `<select id="size">`,
        `<option value="0" ${size == 0 ? "selected" : ""}>S</option>`,
        `<option value="1" ${size == 1 ? "selected" : ""}>M</option>`,
        `<option value="2" ${size == 2 ? "selected" : ""}>L</option>`,
        `<option value="3" ${size == 3 ? "selected" : ""}>XL</option>`,
        `</select>`,
    ].join("")}`,
].join("<br>");

document.getElementById("menu").addEventListener("change", ev => {
    const newsize = document.getElementById("size").value;
    if (newsize != size) {
        window.location.assign(`/?demo=poppies&size=${newsize}`);
    }
}, false);

const [P,Q,R] = [3,7,2];
const sys = new KB.System(
    ["a", "b", "c"],
    ["a", "b", "c"],
    KB.Rule.Array(
        ["aa"], ["bb"], ["cc"],
        ["ab".repeat(P)], ["bc".repeat(Q)], ["ac".repeat(R)],
    )
).complete();

function AAA(a, b, c=π/2) {
    const tri = {};

    tri.angles = [a, b, c];
    tri.sides = [0,0,0];

    const excess = Calc.Excess(a,b,c);
    tri.geom = Geom.Match(excess);
    if (tri.geom === Geom.Par) {
        const sc = 1;//0.5;
        tri.sides[0] = sc;
        tri.sides[1] = sc * Geom.Sph.Sin(b) / Geom.Sph.Sin(a);
        tri.sides[2] = sc * Geom.Sph.Sin(c) / Geom.Sph.Sin(a);

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

const M = d => M4.Motor(
    0,sp(-d),0,
    fl(+d),0,0
);

const Sr = 1;
const SR = M4.MovZ(tri.geom.Case(Sr,0,0));
const A_from_O = M4.id;
const B_from_A = M4.rm(M(dAB), M4.RotI(π-tca));
const C_from_B = M4.rm(M(dBC), M4.RotI(π-tab));

sys.repr["a"] = M4.Refl(
    M4.rm(M(dAB), M4.RotI(π/2-tca)).T.Rx
);
sys.repr["b"] = M4.Refl(
    M4.rm(M4.RotI(tbc)).T.Ry
);
sys.repr["c"] = M4.Refl(
    M4.rm().T.Ry
);

const [
    ground_c0, ground_c1,
    ground_c2, ground_c3,
] = [
    V4.of(0.5,0.3,0.1,1), V4.of(0.125,0.05,0.0,1),
    V4.of(0.4,0.8,0.15,1), V4.of(0.25,0.5,0,1),
];

const ground_va = new VertexArray();
const ground_template = new VertexArray().push(
    [M4.lm(SR, A_from_O, M4.MovZ(1/16)).Cw, ground_c2],
    [M4.lm(SR, B_from_A, A_from_O).Cw, ground_c3],
    [M4.lm(SR, C_from_B, B_from_A, A_from_O).Cw, ground_c3],
);

const sky = V4.of(0.5, 0.5, 1, 1);
Orveyl.SetSky(sky.x, sky.y, sky.z);

const star_va = new VertexArray();
const flower_va = new VertexArray();

const [
    stem_N,
    stem_w, stem_h,
    stem_c0, stem_c1,
] = [
    8,
    ...[
        [1/64, 0.5],
        [1/32, 0.75],
        [1/24, 1.5],
        [1/16, 3],
        [1/8, 4],
    ][size],
    V4.of(0, 0.4, 0.1, 1), V4.of(0.1, 0.6, 0.2, 1),
];

const stem_va = new VertexArray();
for (let i=0; i<stem_N; ++i) {
    const [t0, t1] = [i/stem_N, (i+1)/stem_N];
    const [x0, x1] = [2*t0-1, 2*t1-1];
    const [r0, r1] = [stem_w*(1-x0*x0), stem_w*(1-x1*x1)];

    const [Z0, Z1]  = [M4.MovZ(stem_h*t0), M4.MovZ(stem_h*t1)];
    const [X0, X1] = [M4.MovX(r0), M4.MovX(r1)];

    stem_va.push(
        [Z0.Cw, stem_c0],
        [M4.rm(Z0, X0).Cw, stem_c1],
        [M4.rm(Z1, X1).Cw, stem_c1],
        [Z0.Cw, stem_c0],
        [Z1.Cw, stem_c0],
        [M4.rm(Z1, X1).Cw, stem_c1],
    );
}
const RK = M4.ReflK();
const stem_refl = [];
for (let v of stem_va) {
    stem_refl.push(
        [RK.ra(v.pos), v.col]
    );
}
stem_va.push(...stem_refl);

const [
    petal_N, petal_M,
    petal_w, petal_h, petal_q,
    petal_c0, petal_c1,
] = [
    [
        4, 4, 8, 12, 16,
    ][size]
    , 4,
    ...[
        [1/32, 1/12, 1/24],
        [1/16, 1/6, 1/12],
        [1/8, 1/3, 1/6],
        [1/4, 2/3, 1/3],
        [1, 2, 4/3],
    ][size],
    V4.of(1,0.1,0,1), V4.of(1,0.75,0,1),
]
const petal_va = new VertexArray();
for (let i=0; i<petal_N; ++i) {
    const [t0, t1] = [i/petal_N, (i+1)/petal_N];
    const [x0, x1] = [2*t0-1, 2*t1-1];
    const [r0, r1] = [petal_w*(1-x0*x0), petal_w*(1-x1*x1)];

    const [P0, P1] = [
        M4.Transport(petal_h*t0, r0, 0.5*r0+petal_q*t0),
        M4.Transport(petal_h*t1, r1, 0.5*r1+petal_q*t1),
    ];

    petal_va.push(
        [V4.w, petal_c0],
        [P0.Cw, petal_c1],
        [P1.Cw, petal_c1],
    );
}
const RJ = M4.ReflJ();
const petal_refl = [];
for (let v of petal_va) {
    petal_refl.push(
        [RJ.ra(v.pos), v.col]
    );
}
petal_va.push(...petal_refl);

const ground_wt = new WordTree("TriGroup", sys);
const onAdd = here => {
    const M = here.world_from_local;
    const pz = M.ra(V4.of(0,0,-1,1));
    const ps = M.ras(...ground_template.map(v => v.pos));

    ground_va.push(
        [pz, ground_c0],
        [ps[0], ground_c1],
        [ps[1], ground_c1]
    );

    ground_va.push(
        [pz, ground_c0],
        [ps[1], ground_c1],
        [ps[2], ground_c1],
    );

    ground_va.push(
        [pz, ground_c0],
        [ps[2], ground_c1],
        [ps[0], ground_c1],
    );

    ground_va.push(
        [ps[0], ground_template[0].col],
        [ps[1], ground_template[1].col],
        [ps[2], ground_template[2].col],
    );

    const Z = M4.rm(M, M4.MovZ(2));
    for (let i = 0; i < 25; ++i) {
        star_va.push([
            M4.rm(Z, M4.Transport(3*Rand.Sign(), 3*Rand.Sign(), Rand.Sign())).Cw,
            V4.of(0.5+0.5*Rand.Unit(),0.5+0.5*Rand.Unit(),0.5+0.5*Rand.Unit(),1).scXYZ(0.5),
        ]);
    }

    if (Rand.Unit() < 0.5) {
        const R = dAB*Calc.Min(1)(Rand.Gauss(0.75)(0.5)());
        const F = M4.rm(
            M,
            M4.RotI(Rand.Unit()*π/Q), M4.MovX(R), M4.RotI(Rand.Unit()*π),
            M4.MovZ(-Rand.Unit()*stem_h/2),
        );

        for (let i=0; i<2; ++i) {
            const S = M4.rm(F, M4.RotI(i*π/2));
            for (let v of stem_va) {
                flower_va.push([S.ra(v.pos), v.col]);
            }
        }

        F.rm(M4.MovZ(stem_h));
        for (let i=0; i<petal_M; ++i) {
            const P = M4.rm(F, M4.RotI(2*π*i/petal_M));
            for (let v of petal_va) {
                flower_va.push([P.ra(v.pos), v.col]);
            }
        }
    }
};

onAdd(ground_wt.root);
ground_wt.orbit("", "bc", 14, onAdd);

for (let i = 0; i <3; ++i) {
    for (let ch of ground_wt.frontier()) {
        ground_wt.orbit(ch.word, "ac", 14, onAdd);
    }
    for (let ch of ground_wt.frontier()) {
        ground_wt.orbit(ch.word, "bc", 14, onAdd);
    }
}

const geom_ground = new Geometry("Ground", ground_va).rm(
    M4.MovZ(-1/4)
).attach(
    new Geometry("Flower", flower_va)
);

new Geometry("Stars", star_va).attachTo(geom_ground)
.setMode(0).setBlend(1);

const zs = [
    2, 2, 1.7, 1.5, 1.2,
][size];

for (let i = -3; i <=+3; ++i) {

    const geom_ground_alt = new Geometry(
        "GroundAlt", ground_va
    ).attachTo(geom_ground).rm(
        M4.Transport(i*0.5),
        M4.MovY(Rand.Choice(-2,+2)()),
        M4.MovZ(zs*stem_h+0.5),
        M4.ReflI(),
        M4.RotI(π*Rand.Sign()),
        M4.Transport(Rand.Sign(), Rand.Sign(), 0, 1),
    ).attach(
        new Geometry("FlowerAlt", flower_va),
    );

    new Geometry("StarsAlt", star_va).attachTo(geom_ground_alt)
    .setMode(0).setBlend(1);
}

Scene.Manager.add(geom_ground).useIndex(0);