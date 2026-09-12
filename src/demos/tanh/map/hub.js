// adc :: hub.js
// Hyperbolic Tangent - 260912-20 @ MorYork

import { Orveyl } from "/src/orveyl.js";

import * as Calc from "/src/math/calc.js"
import {
    Rand, π, τ,
} from "/src/math/calc.js";
import { SI } from "/src/math/si.js";

import { V4, B4, M4 } from "/src/math/vector.js";

import { IndexArray, VertexArray } from "/src/gpubuffer.js";

import { Ticker } from "/src/node/component/ticker.js";

import { Scene } from "/src/node/scene.js";
import { Geometry } from "/src/node/scene/geometry.js";
import { Light } from "/src/node/scene/light.js";
import { WordTree } from "/src/node/scene/wordtree.js";
import { Text } from "/src/node/scene/text.js";

import { TanhSetup, sys83, sys64, Ribbon, Tube } from "/src/demos/tanh/common.js";
import * as TanhText from "/src/demos/tanh/text.js";

TanhSetup("Hyperbolic Tangent");

Orveyl.SetSky(0,0,0,1);
Orveyl.SetFog(0,0,0,1/75);
Orveyl.SetDrawLitEnabled(true);

const m = SI.m_to_au;

const root = new Scene("HubRoot");
Scene.Manager.use(root);
{
    const L = new Light("AmbientLight").attachTo(root);
    L.mode = Light.Mode.Ambient;
    L.tint = V4.rgb(1/32,1/32,1/8);
    L.write();
}

const wt = new WordTree("HubTree", sys83).attachTo(root);

const DEBUG = 0;
const FLOOR = 1;
const EDGE_WALL = 2;
const EDGE_CLIFF = 3;
const DIAG_WALL = 4;
const NODE = 5;
const PATH = 6;
const LAMP = 7;
const TREE = 8;
const MUSH = 9;
const STRUCT = 10;

const FLOOR_PALETTE_DEBUG = [
    V4.gray(1/8), V4.gray(1/4),
    V4.rgb(1/2,0,0), V4.rgb(1,0,0),
    V4.rgb(0,1/2,0), V4.rgb(0,1,0),
    V4.rgb(0,0,1/2), V4.rgb(0,0,1),
    V4.gray(1/2), V4.gray(1),
    V4.rgb(0,1/2,1/2), V4.rgb(0,1,1),
    V4.rgb(1/2,0,1/2), V4.rgb(1,0,1),
    V4.rgb(1/2,1/2,0), V4.rgb(1,1,0),
];

const FLOOR_PALETTE_3_8 = [
    V4.gray(3/4), V4.gray(1/4),
    V4.gray(1/4), V4.gray(3/4),
    V4.gray(3/4), V4.gray(1/4),
    V4.gray(1/4), V4.gray(3/4),
    V4.gray(3/4), V4.gray(1/4),
    V4.gray(1/4), V4.gray(3/4),
    V4.gray(3/4), V4.gray(1/4),
    V4.gray(1/4), V4.gray(3/4),
];

const FLOOR_PALETTE_GRASS = [
    V4.rgb(1/16,1/2,1/12), V4.rgb(0/16,1/3,1/12),
    V4.rgb(0/16,1/3,1/12), V4.rgb(1/16,1/2,1/12),
    V4.rgb(1/16,1/2,1/12), V4.rgb(0/16,1/3,1/12),
    V4.rgb(0/16,1/3,1/12), V4.rgb(1/16,1/2,1/12),
    V4.rgb(1/16,1/2,1/12), V4.rgb(0/16,1/3,1/12),
    V4.rgb(0/16,1/3,1/12), V4.rgb(1/16,1/2,1/12),
    V4.rgb(1/16,1/2,1/12), V4.rgb(0/16,1/3,1/12),
    V4.rgb(0/16,1/3,1/12), V4.rgb(1/16,1/2,1/12),
];

const FLOOR_PALETTE_WATER = [
    V4.rgb(1/16,1/12,1/2), V4.rgb(0/16,1/12,1/3),
    V4.rgb(0/16,1/12,1/3), V4.rgb(1/16,1/12,1/2),
    V4.rgb(1/16,1/12,1/2), V4.rgb(0/16,1/12,1/3),
    V4.rgb(0/16,1/12,1/3), V4.rgb(1/16,1/12,1/2),
    V4.rgb(1/16,1/12,1/2), V4.rgb(0/16,1/12,1/3),
    V4.rgb(0/16,1/12,1/3), V4.rgb(1/16,1/12,1/2),
    V4.rgb(1/16,1/12,1/2), V4.rgb(0/16,1/12,1/3),
    V4.rgb(0/16,1/12,1/3), V4.rgb(1/16,1/12,1/2),
];

const FLOOR_PALETTE_MUSHROOM = [
    V4.gray(6/6), V4.gray(5/6),
    V4.gray(5/6), V4.gray(6/6),
    V4.gray(6/6), V4.gray(5/6),
    V4.gray(5/6), V4.gray(6/6),
    V4.gray(6/6), V4.gray(5/6),
    V4.gray(5/6), V4.gray(6/6),
    V4.gray(6/6), V4.gray(5/6),
    V4.gray(5/6), V4.gray(6/6),
];

const FLOOR_PALETTE_DEFAULT = FLOOR_PALETTE_3_8;

const template_lamp = (() => {
    const s = [1/2,3,1/8,0,1/2,0,0,0,1/4];
    const r = [1/3,1/8,1/8,1/4,1/8,1/4,1/4,1/4,1/2,0];
    const k = [1/6,1/8,1/32,1/8,1,1,1,1/2,1/8];
    const N = s.length;
    const i = t => Math.floor(N*t);

    let tt = new Tube("Lamp", N, 4,
        t => M4.MovZ(m(s[i(t)])), t => M4.id,
        (t,u) => M4.MovX(m(r[i(t)])), (t,u) => M4.RotI(τ*u),
        t => V4.gray(k[i(t)]),
    );

    return tt;
})();

const make_template_tree = (h) => {
    const s = [  h,   0,   0,   2,   0,   2,   0,   2,  0,   4, 0];
    const r = [0.6, 0.5, 0.4,  2.5, 1.5, 1.9, 1.2, 1.6, 0.9, 1.3, 0, 0];
    const z = [  0,   0,   0, 0.3,   0, 0.3,   0, 0.3,  0, 0.3, 0];
    const k = [  1,   0,   2,   3,   2,   3,   2,   3,  2,   3, 3];
    const c = [
        V4.rgb(1/10, 1/14, 0), V4.rgb(1/4, 1/6, 1/12),
        V4.rgb(0, 1/6, 1/16), V4.rgb(1/16, 1/3, 1/12)
    ];
    const N = s.length;
    const i = t => Math.floor(N*t);

    const tt = new Tube("Tree", N, 8,
        t => M4.MovZ(m(s[i(t)])), t => M4.id,
        (t,u) => M4.Transport(m(r[i(t)]),0,-m(z[i(t)])), (t,u) => M4.RotI(τ*u),
        t => c[k[i(t)]],
    );

    return tt;
};

const template_trees = [
    make_template_tree(3),
    make_template_tree(4),
    make_template_tree(5),
    make_template_tree(5.5),
    make_template_tree(6),
    make_template_tree(6.5),
    make_template_tree(7),
    make_template_tree(7.5),
];

const make_template_mushroom = (sc) => {
    const s = [  4,   0,   0,  1, 1/2, 1/4, 0];
    const r = [  1, 0.75,  1,  3, 2, 1, 0];
    const z = [  0,   0.25,   0.25,  0, 0, 0, 0];
    const k = [  0,   2,   3,   0, 2, 1, 0];
    const c = [
        V4.gray(1/4), V4.gray(2/4),
        V4.gray(3/4), V4.gray(4/4),
    ];
    const N = s.length;
    const i = t => Math.floor(N*t);

    let tt = new Tube("Mush", N, 12,
        t => M4.MovZ(sc*m(s[i(t)])), t => M4.id,
        (t,u) => M4.Transport(m(sc*r[i(t)]),0,-m(sc*z[i(t)])), (t,u) => M4.RotI(τ*u),
        t => c[k[i(t)]],
    );

    return tt;
};

const template_mushrooms = [
    make_template_mushroom(1/2),
    make_template_mushroom(2/3),
    make_template_mushroom(3/3),
    make_template_mushroom(4/3),
    make_template_mushroom(5/3),
    make_template_mushroom(6/3),
    make_template_mushroom(7/3),
    make_template_mushroom(8/3),
    make_template_mushroom(9/3),
];

const template_structure = (() => {
    const N = 6;
    const R = m(6);
    const H = 1;

    const [e, v] = [
        sys83.repr.edges.map(E => E.Cw),
        sys83.repr.verts.map(V => V.Cw),
    ];
    e[8]=e[0]; v[8]=v[0];

    const geom = new Geometry("StructGeom", new VertexArray(), new IndexArray());

    let temp = new Tube("TubeUp", N, 8,
        t => M4.MovZ(+H/N), t => M4.id,
        (t,u) => M4.MovX(R), (t,u) => M4.RotI(π/8 + τ*u),
        t => V4.gray(1/2+(Rand.Sign()/16)), (i,j) => ((i>1)||(j%2==0))
    );

    for (let i = 0; i<3*8; ++i) { temp.ia.pop(); }
    geom.append(temp);

    temp = new Tube("TubeDown", N, 8,
        t => M4.MovZ(-H/N), t => M4.id,
        (t,u) => M4.MovX(R), (t,u) => M4.RotI(π/8 + τ*u),
        t => V4.gray(1/2+(Rand.Sign()/16)), (i,j) => true
    );

    for (let i = 0; i<3*8; ++i) { temp.ia.pop(); }
    geom.append(temp);

    temp = new Tube("TubeFloor", 1, 8,
        t => M4.id, t => M4.id,
        (t,u) => M4.MovX(R*t), (t,u) => M4.RotI(π/8 + τ*u),
        (t,u) => V4.gray(1/4), (i,j) => true
    );

    for (let i = 0; i<3*8; ++i) { temp.ia.pop(); }
    geom.append(temp);

    const c0 = V4.gray(1/6);
    const c1 = V4.gray(1/3);
    const Zh = M4.MovZ(-m(0.1));
    for (let i = 0; i < 8; i+=2) {
        const i1 = Calc.Wrap(8)(i-1);
        const m = e[i];
        const M = M4.Center(m);
        const [a,b] = [V4.lerp(m,v[i])(1/4), V4.lerp(m,v[i1])(1/4)];
        const [c,d] = [M.ra(a), M.ra(b)];
        const [mz, wz, az, bz, cz, dz] = [m,V4.w,a,b,c,d].map(p => Zh.ra(p));
        geom.ia.base = geom.va.length;
        geom.va.push(
            [az, c0], [mz, c1], [wz, c1],
            [wz, c1], [cz, c0], [az, c0],

            [bz, c0], [mz, c1], [wz, c1],
            [wz, c1], [dz, c0], [bz, c0],
        );
        geom.ia.push(
            0,1,2,
            3,4,5,
            6,7,8,
            9,10,11,
        )
    }

    const Mh = M4.MovZ(H);
    const Mx = M4.MovX(R/4);
    const My = M4.MovY(R/4);
    const Mz = M4.MovZ(R/4);
    const Cc = V4.gray(3);
    geom.ia.base = geom.va.length;
    geom.va.push(
        [M4.rm(Mh,Mx).Cw, Cc], [M4.rm(Mh,My).Cw, Cc], [M4.rm(Mh,Mz).Cw, Cc],
        [M4.rm(Mh,Mx.T).Cw, Cc], [M4.rm(Mh,My.T).Cw, Cc]
    );
    geom.ia.push(
        0,1,2, 1,3,2, 3,4,2, 4,0,2,
    );

    return geom;
})();

const make_pillar = (f_col, light_col) => {
    let tt = new Tube("Pillar", 16, 64,
        t => M4.Motor(0,0,0,0,0,m(1)),
        t => M4.id,//M4.MovZ(m(5)),//.rm(M4.RotK(2*t)),
        (t,u) => M4.MovX(m(1/4)*Math.exp(7.5*t)),
        (t,u) => M4.RotI(τ*u),
        f_col ?? ((t,u) => V4.rgb(1,1-t,1)),
        //(i,j) => (i+j)%2==0,
    );

    const l0 = new Light("PillarLight", Light.Mode.Collar, 0, m(20), light_col??V4.rgb(2,1/2,1/16));
    l0.attachTo(tt).rm(M4.RotJ(-π/2));

    return tt;
}

const make_dome = (height, f_col, light_col) => {
    let tt = new Tube("Dome", 16, 64,
        t => M4.id,
        t => M4.MovZ(height-m(10)*(t*t)),
        (t,u) => M4.MovX(m(20)*t),
        (t,u) => M4.RotI(τ*u),
        f_col ?? ((t,u) => V4.rgb(1,1-t,1)),
    );
    tt.setBlend(1);

    if (light_col != undefined) {
        const l0 = new Light("DomeLight", Light.Mode.Collar, 0, m(20), light_col ?? V4.gray(1));
        l0.attachTo(tt).rm(M4.RotJ(-π/2));
    }

    return tt;
}

const build = (...features) => here => {

    const thru = [
        here.thru("0"), here.thru("1"), here.thru("2"), here.thru("3"),
        here.thru("4"), here.thru("5"), here.thru("6"), here.thru("7"),
    ];

    const [e, v] = [
        sys83.repr.edges.map(E => E.Cw),
        sys83.repr.verts.map(V => V.Cw),
    ];
    e[8]=e[0]; v[8]=v[0];

    const wrap = Calc.Wrap(8);
    const wrap2 = Calc.Wrap(16);

    const tile = new Geometry("Tile", new VertexArray()).attachTo(here);

    const make_debug = feat => async here => {
        const debug = new Geometry("Debug", new VertexArray()).attachTo(here);
        debug.mode = 1;
        debug.blend = 1;

        const c = [
            V4.rgb(1/4,1/4,1/4),
            V4.rgb(1,0,0),
            V4.rgb(0,1,0),
            V4.rgb(0,0,1),
            V4.rgb(1,1,1),
            V4.rgb(0,1,1),
            V4.rgb(1,0,1),
            V4.rgb(1,1,0),
        ];

        const s = 1/32;
        const h = 1/16;
        debug.va.push(
            [V4.of(0,0,h,1), c[0]], [V4.of(s,0,h,1), c[1]],
            [V4.of(0,0,h,1), c[0]], [V4.of(0,s,h,1), c[2]],
            [V4.of(0,0,h,1), c[0]], [V4.of(0,0,s+h,1), c[3]],
        );

        const ZZ = M4.MovZ(5);
        for (let i = 0; i < 8; ++i) {
            const i1 = wrap(i-1);
            debug.va.push(
                [V4.w, c[i]], [e[i], c[i]],
                [e[i], c[i]], [ZZ.rca(e[i].dup), c[i]],
                [v[i1], c[i]], [v[i], c[i]],
            );
        }

        debug.write();
    };

    const make_floor = feat => async here => {
        const pal = feat.palette ?? FLOOR_PALETTE_DEFAULT;
        const Zh = M4.MovZ(feat.height ?? 0);
        for (let tri of feat.tris ?? Calc.Iota(16)) {
            tri = wrap2(tri);
            const i = wrap(Math.floor((tri  )/2));
            const j = wrap(Math.floor((tri-1)/2));
            tile.va.push(
                [Zh.rca(V4.w), pal[tri]], [Zh.rca(e[i]), pal[tri]], [Zh.rca(v[j]), pal[tri]],
            );
        }
    };

    const make_edge_wall = feat => async here => {
        const cc = feat.color ?? V4.gray(1/2);
        const Zh = M4.MovZ(feat.height ?? m(1));
        const Zi = M4.id;
        const count = feat.count ?? 1;
        for (let j = 0; j < count; ++j) {

            for (let edge of feat.edges ?? Calc.Iota(8)) {
                const i = wrap(edge);
                const i1 = wrap(edge-1);

                const [a,b,c,d] = [v[i], v[i1], Zh.ra(v[i1].dup), Zh.ra(v[i].dup)];
                const [az,bz,cz,dz] = [a,b,c,d].map(p => Zi.ra(p));

                const door_width = (feat.door) ? feat.door(i,j) : 0;
                if (door_width > 0) {
                    const m = V4.lerp(a,b)(0.5);
                    const [p,q] = [V4.lerp(m,a)(door_width/2), V4.lerp(m,b)(door_width/2)];
                    const [r,s] = [Zh.ra(p), Zh.ra(q)];
                    const [pz,qz,rz,sz] = [p,q,r,s].map(p => Zi.ra(p));

                    tile.va.push(
                        [az, cc], [pz, cc], [rz, cc],
                        [rz, cc], [dz, cc], [az, cc],
                        [bz, cc], [qz, cc], [sz, cc],
                        [sz, cc], [cz, cc], [bz, cc],
                    );

                } else {
                    tile.va.push(
                        [az, cc], [bz, cc], [cz, cc],
                        [cz, cc], [dz, cc], [az, cc],
                    );
                }
            }

            Zi.lm(Zh);
        }
    };

    const make_edge_cliff = feat => async here => {
        const cc = feat.color ?? V4.gray(1/2);
        const Zh = M4.MovZ(-(feat.height ?? m(100)));
        for (let edge of feat.edges ?? Calc.Iota(8)) {
            const i = wrap(edge);
            const i1 = wrap(edge-1);

            const [a,b,c,d] = [v[i], v[i1], Zh.rca(v[i1].dup), Zh.rca(v[i].dup)];

            tile.va.push(
                [a, cc], [b, cc], [c, cc],
                [c, cc], [d, cc], [a, cc],
            );
        }
    }

    const make_diag_wall = feat => async here => {
        const cc = feat.color ?? V4.gray(1/2);
        const Zh = M4.MovZ(feat.height ?? m(1));
        const [ei0, ei1] = feat.edges ?? [2,6];
        const [e0, e1] = [e[ei0], e[ei1]];
        const [a,b,c,d] = [e0, e1, Zh.rca(e1.dup), Zh.rca(e0.dup)];
        tile.va.push(
            [a, cc], [b, cc], [c, cc],
            [c, cc], [d, cc], [a, cc],
        );
    };

    const make_node = feat => async here => {
        const c0 = feat.outer_color ?? V4.gray(1/6);
        const c1 = feat.inner_color ?? V4.gray(1/3);
        const w = feat.width ?? 1/2;
        const Zh = M4.MovZ(feat.height ?? m(0.075));

        for (let tri of feat.tris ?? Calc.Iota(16)) {
            tri = wrap2(tri);
            const i = wrap(Math.floor((tri  )/2));
            const j = wrap(Math.floor((tri-1)/2));
            const [a,b] = [V4.lerp(V4.w, e[i])(w), V4.lerp(V4.w, v[j])(w)];
            tile.va.push(
                [Zh.Cw, c1], [Zh.ra(a), c0], [Zh.ra(b), c0],
            );
        }
    };

    const make_path = feat => async here => {
        const c0 = feat.outer_color ?? V4.gray(1/6);
        const c1 = feat.inner_color ?? V4.gray(1/3);
        const w = feat.width ?? 0.25;
        const Zh = M4.MovZ(feat.height ?? m(0.05));

        for (let edge of feat.edges ?? [0,4]) {
            const i = wrap(edge);
            const i1 = wrap(edge-1);
            const m = e[i];
            const M = M4.Center(m);
            const [a,b] = [V4.lerp(m,v[i])(w), V4.lerp(m,v[i1])(w)];
            const [c,d] = [M.ra(a), M.ra(b)];
            const [mz, wz, az, bz, cz, dz] = [m,V4.w,a,b,c,d].map(p => Zh.ra(p));
            tile.va.push(
                [az, c0], [mz, c1], [wz, c1],
                [wz, c1], [cz, c0], [az, c0],

                [bz, c0], [mz, c1], [wz, c1],
                [wz, c1], [dz, c0], [bz, c0],
            );
        }
    };

    const make_lamp = feat => async here => {
        const lamp = new Geometry("LampGeometry", new VertexArray(), new IndexArray()).attachTo(here);
        const make = M => {
            lamp.append(template_lamp, M);
            new Light("LampLight", Light.Mode.Point,
                0, m(10), V4.rgb(1,0.8,0.5)
            ).attachTo(lamp, M.rm(M4.MovZ(m(3.5))));
        }

        if (!feat.edges && !feat.verts) {
            make(M4.id); return;
        }

        const t = feat.radius ?? 1;
        for (let edge of feat.edges ?? []) {
            const p = V4.lerp(V4.w, e[wrap(edge)])(t);
            make(M4.Along(p));
        }

        for (let vert of feat.verts ?? []) {
            const p = V4.lerp(V4.w, v[wrap(vert)])(t);
            make(M4.Along(p));
        }

        lamp.write();
    };

    const make_tree = feat => async here => {
        const Ri = Rand.Int(feat.min ?? 0, feat.max ?? template_trees.length, false);

        const tree = new Geometry("TreeGeometry", new VertexArray(), new IndexArray()).attachTo(here);
        const make = M => tree.append(template_trees[Ri()], M);

        if (feat.count) {
            const ps = [];
            for (let i = 0; i < feat.count; ++i) {
                let M, p;
                do {
                    M = M4.rm(M4.RotI(Rand.Sign()*π), M4.MovX(Rand.Sign()*m(11)));
                    p = M.Cw;
                } while (ps.find(x => V4.dist(x,p) < m(4)));
                ps.push(p);
                make(M.rm(M4.RotI(Rand.Sign()*π), M4.MovZ(Rand.Unit()*m(-2))));
            }
        } else {
            const t = feat.radius ?? 1;
            for (let edge of feat.edges ?? []) {
                const p = V4.lerp(V4.w, e[wrap(edge)])(t);
                make(M4.Along(p));
            }

            for (let vert of feat.verts ?? []) {
                const p = V4.lerp(V4.w, v[wrap(vert)])(t);
                make(M4.Along(p));
            }
        }

        tree.write();
    };

    const make_mushroom = feat => async here => {
        const Ri = Rand.Int(feat.min ?? 0, feat.max ?? template_mushrooms.length, false);
        const colors = [
            V4.rgb(1,1,2/3),
            V4.rgb(1,1/2,1/8),
            V4.rgb(1,3/4,1/4),
            V4.rgb(1/3,1,1/2),
            V4.rgb(1/4,2/3,1),
            V4.rgb(1/2,1,1),
            V4.rgb(3/4,1/2,1),
            V4.rgb(1,2/3,1),
        ];

        const ci = feat.color ?? -1;
        const col = colors[ci] ?? Rand.Choice(...colors)();

        const mush = new Geometry("MushGeometry", new VertexArray(), new IndexArray()).attachTo(here);
        const make = M => mush.append(template_mushrooms[Ri()], M);

        if (feat.count) {
            const ps = [];
            for (let i = 0; i < feat.count; ++i) {
                let M, p;
                do {
                    M = M4.rm(M4.RotI(Rand.Sign()*π), M4.MovX(Rand.Sqrt()*m(11)));
                    p = M.Cw;
                } while (ps.find(x => V4.dist(x,p) < m(3)));
                ps.push(p);
                make(M.rm(M4.RotI(Rand.Sign()*π), M4.MovZ(Rand.Unit()*m(-1))));
            }
        } else {
            if (!feat.edges && !feat.verts) {
                make(M4.id);
            } else {
                const t = feat.radius ?? 1;
                for (let edge of feat.edges ?? []) {
                    const p = V4.lerp(V4.w, e[wrap(edge)])(t);
                    make(M4.Along(p));
                }

                for (let vert of feat.verts ?? []) {
                    const p = V4.lerp(V4.w, v[wrap(vert)])(t);
                    make(M4.Along(p));
                }
            }
        }

        const l = new Light("MushLight", Light.Point, 0, m(25), col);
        l.attachTo(here, M4.MovZ(m(10)));

        mush.write();
    }

    const make_structure = feat => async here => {
        tile.va = template_structure.va;
        tile.ia = template_structure.ia;

        if (feat.light != undefined) {
            const L = new Light("StructLight", feat.light,
                0, m(30), V4.rgb(
                    Rand.Range(1,5)(),
                    Rand.Range(1,3)(),
                    Rand.Range(1,3)(),
                ).scXYZ(1/6)
            );
            L.attachTo(tile, M4.RotJ(π/2));
        }

        const stars = new Geometry("StructStars", new VertexArray());
        stars.setMode(0).setBlend(1);
        for (let i = 0; i < 128; ++i) {
            stars.va.push(
                [
                    M4.rm(
                        M4.RotI(π*Rand.Sign()),
                        M4.MovZ(sys64.repr.b*Rand.Sign()),
                        M4.MovX(m(10)+m(5)*Rand.Unit()+m(10)*Rand.Sq())).Cw,
                    V4.rgb(
                        Rand.Range(0,2)(),
                        Rand.Range(0,2)(),
                        Rand.Range(0,2)(),
                    ).scXYZ(1/3)
                ],
            );
        }
        stars.attachTo(tile);
    };

    const make_feature = feat => {
        switch (feat.type) {
            default:
            case DEBUG: return make_debug(feat);
            case FLOOR: return make_floor(feat);
            case EDGE_WALL: return make_edge_wall(feat);
            case EDGE_CLIFF: return make_edge_cliff(feat);
            case DIAG_WALL: return make_diag_wall(feat);
            case NODE: return make_node(feat);
            case PATH: return make_path(feat);
            case LAMP: return make_lamp(feat);
            case TREE: return make_tree(feat);
            case MUSH: return make_mushroom(feat);
            case STRUCT: return make_structure(feat);
        }
    }

    const promises = [];
    const push = proc => promises.push(
        new Promise(resolve => setTimeout(() => resolve(proc(here)), 1))
    );

    for (let feature of features) {
        push(make_feature(feature));
    }

    Promise.all(promises).then(() => tile.write());
};

const make_intro_logo = () => {
    const sc = new Scene("IntroLogo");
    sc.lm(
        M4.RotJ(π/2), M4.RotK(π/2), M4.RotI(π),
        M4.MovZ(m(4.5)), M4.MovX(m(0.01)), M4.MovY(m(1/6)),
    );

    const adc = new Text("ADCText").attachTo(sc);
    adc.setColor(V4.rgb(1,1/4,1/16)).setBlend(1);
    adc.setSize(1, 2, m(1/10));
    adc.setSpacing(1,1.5).setOffset(-7)
    adc.setText("Anthony D. Chiodo\r\n\b\bMorYork -- Sept. 2026").commit();
    adc.lm(M4.Transport(0, -2.5, -2e-1, m(1)));

    const tanh = new Text("TanhText").attachTo(sc);
    tanh.setColor(V4.rgb(1,1/4,1/16)).setBlend(1);
    tanh.setSize(1, 3, m(1/4));
    tanh.setProc((F) => { F.rm(M4.MovX(m(0.02))); }, 3);
    tanh.setSpacing(1,3/4).setOffset(-4.5);
    tanh.setColCurve(-2,0,0,0,0,0);
    tanh.setRowCurve(0,0,0,-1/4,0,0);
    tanh.glyphTransform = M4.MovZ(-1e-2);
    tanh.setText("Hyperbolic\r\n   Tangent").commit();
    tanh.lm(M4.RotI(π/16))

    const e = new Geometry("IntroEllipse", new VertexArray(), new IndexArray()).attachTo(sc);
    e.setMode(1).setBlend(1);
    e.tint = V4.rgb(1/2,0,1);

    const n = 256;
    for (let i = 0; i < n; ++i) {
        const s = i/n;
        const t = 8*τ*s;
        const [ct, st] = Calc.Geom.Sph.Exp(t);
        e.va.push([V4.of(s*0.32*ct,s*0.16*st,0,1), V4.gray(1-s*s)]);
        e.ia.push(i, i+1);
    }
    e.lm(M4.Transport(1/8, -3/4, -1e-1, m(1)), M4.RotI(π/8));

    new Light("IntroLogoLight", Light.Mode.Point, m(-5), m(20), e.tint.dup.sc(1)).attachTo(e);

    return sc;
};

const make_tower_contents = () => {
    const sc = new Scene("TowerContents");

    const l0 = new Light("TowerLight", Light.Mode.Line, 0, m(20), V4.rgb(1/2,1/8,0));
    l0.attachTo(sc).rm(M4.RotJ(-π/2));

    const l1 = new Light("TowerLight", Light.Mode.Line, 0, m(12), V4.rgb(1/2,1/4,0));
    l1.attachTo(sc).rm(M4.RotJ(-π/2));

    const stars = new Geometry("TowerStars", new VertexArray()).attachTo(sc);
    stars.setMode(0).setBlend(1);

    for (let i = 0; i < 256; ++i) {
        stars.va.push(
            [
                M4.rm(
                    M4.RotI(π*Rand.Sign()),
                    M4.MovZ(m(0.1)+m(40)*Rand.Sq()),
                    M4.MovX(m(2)*Rand.Sign()+m(8)*Rand.Sq())).Cw,
                V4.rgb(1,3/4*Rand.Unit(),1/4*Rand.Unit())
            ],
        );
    }

    stars.attach(
        new Ticker("TowerStarTicker", a=>{ a.parent.setRelative(M4.RotI(a.t)); }).play()
    )

    const rr = new Ribbon("TowerRibbon", 50, 5, true,
        t => M4.Motor(-1/2,0,0,0,0,m(1)),
        t => M4.id,
        t => M4.MovY(Math.pow(t-t*t,0.8)*m(4)),
        (t,u) => V4.rgb(1,0.5-u*u,0).scXYZ(0.25*(1-t)),
    );
    rr.setBlend(1);
    stars.attach(rr);

    //sc.attach(make_portal("structure", V4.rgb(8,1,0)));

    return sc;
}

const make_label = (label, col=V4.ones, rel) => {
    const sc = new Scene("LabelRoot");
    sc.lm(
        M4.RotJ(π/2), M4.RotK(π/2), M4.RotI(π),
        M4.MovZ(m(5)), M4.RotI(-π/2),
        rel ?? M4.id,
    );

    const txt = new Text("LabelText").attachTo(sc);
    txt.setColor(col.dup.scXYZ(1/2)).setBlend(1);
    txt.setSize(1, 2, m(1/5));
    txt.setOffset(1-Math.round(label.length/2));
    txt.setText(label).commit();

    return sc;
}

const make_portal = (dst, col, rel) => {
    const p = new Portal("Portal", dst);
    p.attach(make_label(`<${dst.toUpperCase()}>`, col, rel));

    const geom = new Geometry("PortalGeom", new VertexArray(), new IndexArray());
    geom.setMode(1).setBlend(1);

    geom.va.push([V4.w, col]);
    for (let i = 1; i < 64; ++i) {
        const pos = M4.rm(
            M4.Euler(π*Rand.Sign(), Math.asin(Rand.Sign())),
            M4.MovX(Rand.Unit() * m(2.5))
        ).Cw;
        geom.va.push([pos, V4.gray(0)]);
        geom.ia.push(0, i);
    }

    geom.attachTo(p.spinner, M4.MovZ(m(2.5)))
    return p;
}

const make_night_dome = () => {
    const dome = make_dome(
        m(30),
        (t,u) => V4.rgb((1-t*t)*0.05,0,(1-t*t*t)*0.2),
        V4.rgb(1/16,1/16,1/4)
    );

    const stars = new Geometry("NightDomeStars", new VertexArray).attachTo(dome);
    stars.setMode(0).setBlend(1);

    for (let i = 0; i < 64; ++i) {
        stars.va.push(
            [
                M4.rm(
                    M4.RotI(π*Rand.Sign()),
                    M4.MovX(m(1)*Rand.Sign()+m(5)*Rand.Sqrt()),
                    M4.MovZ(m(30)+m(2)*Rand.Sign()),
                ).Cw,
                V4.gray(0.25+0.75*Rand.Unit())
            ],
        );
    }

    new Light("NightLight", Light.Mode.Collar,0,m(40),V4.rgb(0.1,0.1,0.4)).attachTo(dome, M4.RotJ(π/2))

    return dome;
}

const make_plaza_ring = () => {
    const dome = new Tube("PlazaDome", 32, 64,
        t => M4.id,
        t => M4.MovZ(m(25) - m(10)*t*t*t*t),
        (t,u) => M4.MovX(m(2)*Math.sinh(4*t)),
        (t,u) => M4.RotI(τ*u),
        (t,u) => V4.gray(1-t*t),
    );

    const N = 64;
    const S = M4.RotI(τ/N);
    const Z = M4.MovZ(m(15));
    const O = M4.rm(Z, M4.MovX(m(12)));
    const R = Rand.Gauss(0.5)(0.125);
    const ring = new Tube("PlazaRing", N, 16,
        t => S, t => O,
        t => M4.MovX(m(1+3*Calc.Sq(Math.sin(3*τ*t)))), (t,u) => M4.RotJ(τ*u),
        (t,u) => V4.rgb(R(),R(),R()).scXYZ(0.5+Calc.Sq(Math.sin(3*τ*t))),
    );

    ring.attachTo(dome);

    for (let i = 0; i<6; ++i) {
        const θ = i*τ/6;

        const sc = new Scene("SubRingParent");
        sc.attachTo(ring, M4.rm(M4.RotI(θ),O));

        const col = V4.rgb(1+Math.cos(θ), 1+Math.cos(θ+τ/3), 1+Math.cos(θ-τ/3));

        const rr = new Tube("SubRing", 32, 16,
            t => M4.RotJ(τ/32),
            t => M4.MovZ(m(6)),
            t => M4.MovY(m(0.125+2*Calc.Sq(Math.sin(π*t)))), (t,u) => M4.RotK(τ*u),
            (t,u) => col,
        );

        rr.attachTo(sc);
        rr.attach(
        new Ticker("SubRingTicker",
            a=>{ a.parent.setRelative(M4.RotJ(θ+a.t/3)); }).play()
        );

        const ll = new Light(
            "SubRingLight", Light.Mode.Point, 0, m(20),
            col.scXYZ(1/4)
        );
        ll.attachTo(rr, M4.MovZ(-m(9)));
    }

    ring.attach(
        new Ticker("PlazaRingTicker",
            a=>{ a.parent.setRelative(M4.RotI(a.t/5)); }).play()
    );

    const l = new Light("RingLight", Light.Mode.Point, 0, m(8), V4.gray(2));
    l.attach(new Ticker("RingLightTicker",
        a=>{ a.parent.setRelative(M4.lm(O,M4.RotI(-a.t*3))); }).play());
    l.attachTo(ring)

    return dome;
}

const make_pillar_text = (tanhtext, rel) => {
    const sc = new Scene("PillarTextRoot");
    sc.lm(
        M4.RotJ(π/2), M4.RotK(π/2), M4.RotI(π),
        M4.MovZ(m(10.5)), M4.MovX(sys83.repr.a - m(0.01)),
        rel ?? M4.id
    );

    const txt = new Text("PillarText").attachTo(sc);
    txt.setColor(V4.gray(8));
    txt.setSize(1, 3, m(1/16));
    txt.setSpacing(1,1.5).setOffset(-30);
    txt.setText(...tanhtext).commit();

    const l = new Light("PillarTextLight", Light.Mode.Line, 0, m(6), V4.gray(1/2));
    l.attachTo(sc, M4.RotI(π/2));

    return sc;
}

const make_horosphere = () => {
    const sc = new Scene("HoroRoot");
    const sc2 = new Scene("HoroPivot").attachTo(sc);
    
    const l1 = new Light("HoroLight", Light.Mode.Collar, 0, m(12), V4.gray(1));
    l1.attachTo(sc, M4.RotJ(-π/2));
    
    const R = Rand.Gauss(0)(1/32);
    const scale = m(1);

    const Fsp = t => M4.Motor(0,-1,0,+1,0,0, 1,1,+2*scale);
    const Fsn = t => M4.Motor(0,-1,0,+1,0,0, 1,1,-2*scale);
    const Fo0 = t => M4.MovZ(m(8));
    const Fo1 = t => M4.MovZ(m(16));
    const Fr = t => M4.Motor(0,0,+1,0,+1,0, 1,1,+scale);
    const Fc0 = (t,u) => V4.rgb(0.5+0.5*t+R(),0.5+0.5*u+R(),0.5+R());
    const Fc1 = (t,u) => V4.gray(1);
    const Fm0 = (i,j) => i%2 == 0;
    const Fm1 = (i,j) => i%2 == 1;

    const horo0 = new Ribbon("Horosphere0", 50, 25, true, Fsp, Fo0, Fr, Fc0, Fm0);
    const horo1 = new Ribbon("Horosphere1", 50, 25, true, Fsn, Fo0, Fr, Fc0, Fm1);
    const horo2 = new Ribbon("Horosphere0", 50, 25, true, Fsp, Fo1, Fr, Fc1);
    const horo3 = new Ribbon("Horosphere1", 50, 25, true, Fsn, Fo1, Fr, Fc1);

    sc.attach(horo2, horo3);
    sc2.attach(horo0, horo1);
    sc2.attach(
        new Ticker("HoroTicker", a => {
            const [t,u] = [a.t/16, a.t/21];
            const [c,s] = Calc.Geom.Sph.Exp(t);
            const [cz, sz] = Calc.Geom.Sph.Exp(u);
            a.parent.setRelative(M4.Motor(sz,-c,s, c,s,0, 1,1,m(25)));
        }).reset(Rand.Range(-10000, +10000)()).play()
    );
    return sc;
}

const make_row = (N, S, f) => {
    const M = M4.id;
    const objs = [];
    for (let i = 0; i < N; ++i) {
        const o = f();
        o.setRelative(M);
        objs.push(o);
        M.lm(S);
    }
    return objs;
}

////////////////////////////////////////////////////////////////////////////////
build(
    //{type:DEBUG},
    {type:FLOOR},
    {type:NODE}, {type:PATH, edges:[0,2,4,6]},
    {type:LAMP, verts:Calc.Iota(8), radius:0.5},
)(wt.root);

wt.root.attach(
    make_dome(m(35), (t,u) => V4.rgb((1-t*t)*0.9,(1-t)*0.3,1-t*t*t))
);

const template_great_pillar = [
    {type:EDGE_CLIFF, height:-m(250)},
    {type:EDGE_CLIFF, height:+m(250)},
];

const template_forest = [
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:TREE, count:12, min:0, max:2},
];

const template_deep_forest = [
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:TREE, count:16, min:1},
];

const template_water = [{type:FLOOR, palette:FLOOR_PALETTE_WATER, height:-m(3)}];
const template_well = [
    {type:FLOOR, palette:FLOOR_PALETTE_WATER, height:-m(10)},
    {type:EDGE_WALL, height:-m(1), count: 10},
];

const make_well_light = () => {
    return new Light("WellLight", Light.Mode.Collar, 0, m(25),
        V4.rgb(0.4*Rand.Unit(), 0.4*Rand.Unit(), 0.3+0.7*Rand.Unit()).scXYZ(3/4)
    ).rm(M4.RotJ(π/2));
}

const make_forest_island = (prefix) => {
    wt.add(`${prefix}z`, build(
        {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
        {type:TREE, edges:[0,1,2,3,4,5,6,7], radius:2/3, max:2},
        {type:NODE}, {type:LAMP},
    ));
    wt.add(`${prefix}z0`, build(...template_forest));
    wt.add(`${prefix}z1`, build(...template_forest));
    wt.add(`${prefix}z2`, build(...template_forest));
    wt.add(`${prefix}z3`, build(...template_forest));
    wt.add(`${prefix}z4`, build(...template_forest));
    wt.add(`${prefix}z5`, build(...template_forest));
    wt.add(`${prefix}z6`, build(...template_forest));
    wt.add(`${prefix}z7`, build(...template_forest));
};

const template_great_wall = [
    {type:FLOOR, tris:[-3,-2,-1,0,1,2,3,4]},
    {type:DIAG_WALL, edges:[2,6], height:m(10)},
];

const template_great_wall_flip = [
    {type:FLOOR, tris:[5,6,7,8,9,10,11,12]},
    {type:DIAG_WALL, edges:[2,6], height:+m(10)},
    {type:DIAG_WALL, edges:[2,6], height:-m(10)},
];

// intro tower
wt.add("0", build(
    {type:NODE},
    {type:PATH, edges:[0,2,4,6]},
    {type:EDGE_WALL, height:+m(2), count: 24,
        door:(edge,iter)=>(iter%3!=2),
    },
    {type:EDGE_WALL, height:-m(2), count: 24,
        door:(edge,iter)=>(iter%3!=0),
    },
)).attach(make_intro_logo());

// front left pillar
wt.add("1", build({type:FLOOR})).attach(make_pillar());

// road to tranquility
wt.add("2", build(
    {type:FLOOR},{type:PATH, edges:[2,6]},
    {type:LAMP, edges:[0,4], radius:1/2},
));

// back left pillar
wt.add("3", build({type:FLOOR})).attach(make_pillar());

// museum tower
wt.add("4", build(
    {type:PATH, edges:[0,4]},
    {type:EDGE_WALL, height:+m(2), count: 24,
        door:(edge,iter)=>(iter%3!=2),
    },
    {type:EDGE_WALL, height:-m(2), count: 24,
        door:(edge,iter)=>(iter%3!=0),
    },
));

// back right pillar
wt.add("5", build({type:FLOOR})).attach(make_pillar());

// road to mycelium
wt.add("6", build(
    {type:FLOOR},{type:PATH, edges:[2,6]},
    {type:EDGE_WALL, edges:[0,1,3,4]},
    {type:EDGE_WALL, edges:[2], door:()=>1/2},
    {type:LAMP, edges:[0,4], radius:1/2},
));

// front right pillar
wt.add("7", build({type:FLOOR})).attach(make_pillar());

// road to structure
wt.add("02", build(
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:NODE},{type:PATH, edges:[2,4,6]},
    {type:EDGE_CLIFF, edges:[4,5,6,7]},
    {type:TREE, edges:[0,1,3,5,7], radius:2/3, max:2},
    {type:LAMP, verts:[5,6], radius:0.45},
));

// structure plaza
wt.add("026", build(
    {type:NODE},
    {type:PATH, edges:[0,2,4,6]},
    {type:LAMP, verts:Calc.Iota(8), radius:0.45},
)).attach(
    make_dome(+m(20), (t,u) => V4.rgb((1-t*t)*0.5,0,0)),
    make_dome(-m(5), (t,u) => V4.rgb((1-t*t)*0.9,(1-t)*0.1,0), V4.rgb(1,0,0)),
    make_dome(-m(10), (t,u) => V4.rgb((1-t*t)*0.9,(1-t)*0.5,0)),
);

const make_structure_ring = (prefix) => {
    const b = build({type:STRUCT});
    wt.add(`${prefix}0`, b);
    wt.add(`${prefix}2`, b);
    wt.add(`${prefix}4`, b);
    wt.add(`${prefix}6`, b);
    // wt.add(`${prefix}0z`, b);
    // wt.add(`${prefix}2z`, b);
    // wt.add(`${prefix}4z`, b);
    // wt.add(`${prefix}6z`, b);
    // wt.add(`${prefix}0Z`, b);
    // wt.add(`${prefix}2Z`, b);
    // wt.add(`${prefix}4Z`, b);
    // wt.add(`${prefix}6Z`, b);
};

wt.add("024", build({type:STRUCT, light:Light.Mode.Collar},{type:EDGE_CLIFF, edges:[2,3]}));
wt.add("024z", build({type:STRUCT})); make_structure_ring("024z");
wt.add("024Z", build({type:STRUCT})); make_structure_ring("024Z");

wt.add("0240", build({type:STRUCT}));
wt.add("0246", build({type:STRUCT, light:Light.Mode.Collar}));
wt.add("0246z", build({type:STRUCT})); make_structure_ring("0246z");
wt.add("0246Z", build({type:STRUCT})); make_structure_ring("0246Z");

wt.add("02402", build(...template_great_pillar));
wt.add("02404", build(...template_great_pillar));
wt.add("02406", build(...template_great_pillar));

wt.add("02460", build({type:STRUCT}));
wt.add("024602", build(...template_great_pillar));
wt.add("024604", build(...template_great_pillar));
wt.add("024606", build(...template_great_pillar));

wt.add("02462", build({type:STRUCT}));
wt.add("02464", build({type:STRUCT, light:Light.Mode.Collar}));
wt.add("02464z", build({type:STRUCT})); make_structure_ring("02464z");
wt.add("02464Z", build({type:STRUCT})); make_structure_ring("02464Z");

wt.add("024620", build(...template_great_pillar));
wt.add("024624", build(...template_great_pillar));
wt.add("024626", build(...template_great_pillar));

wt.add("024640", build(...template_great_pillar));
wt.add("024642", build(...template_great_pillar));
wt.add("024646", build({type:STRUCT, light:Light.Mode.Collar}));
wt.add("024646z", build({type:STRUCT})); make_structure_ring("024646z");
wt.add("024646Z", build({type:STRUCT})); make_structure_ring("024646Z");

wt.add("0246460", build(...template_great_pillar));
wt.add("0246462", build(...template_great_pillar));
wt.add("0246464", build({type:STRUCT, light:Light.Mode.Collar}));
wt.add("0246464z", build({type:STRUCT})); make_structure_ring("0246464z");
wt.add("0246464Z", build({type:STRUCT})); make_structure_ring("0246464Z");

wt.add("02464640", build(...template_great_pillar));
wt.add("02464642", build(...template_great_pillar));

const template_structure_tower = [
    {type:EDGE_WALL, height:+m(2), count: 50, door:(edge,iter)=>(1/2)*(iter%4<2) },
    {type:EDGE_WALL, height:-m(2), count: 50},
];

// structure towers
wt.add("0260", build({type:NODE},{type:PATH, edges:[0]},...template_structure_tower));
wt.add("0262", build(
    {type:FLOOR},{type:NODE},{type:PATH, edges:[2]},...template_structure_tower
)).attach(make_tower_contents());
wt.add("0264", build({type:NODE},{type:PATH, edges:[4,6]},...template_structure_tower,));

// intro plaza
wt.add("04", build(
    {type:FLOOR},{type:NODE},{type:PATH, edges:[0,4]},
)).attach(make_plaza_ring(), make_pillar_text(TanhText.Hub.Plaza));

// intro plaza walls
wt.add("040", build(...template_great_wall, {type:EDGE_CLIFF, height:-m(250)}));
wt.add("0402", build(...template_great_wall));
wt.add("0406", build(...template_great_wall));

// intro plaza decorations
wt.add("041", build({type:FLOOR},{type:LAMP}));
wt.add("0415", build({type:FLOOR})).attach(
    make_pillar(
        (t,u) => V4.rgb(1+Math.cos(3*τ*u),1+Math.sin(3*τ*u),1+Math.cos(π*t)).scXYZ(1/2),
        V4.gray(1),
    ),
);
wt.add("042", build({type:FLOOR},{type:LAMP}));
wt.add("0426", build({type:FLOOR})).attach(
    make_pillar(
        (t,u) => V4.rgb(1+Math.cos(3*τ*u),1+Math.sin(3*τ*u),1+Math.cos(π*t)).scXYZ(1/2),
        V4.gray(1),
    ),
);
wt.add("043", build({type:FLOOR},{type:LAMP}));
wt.add("0437", build({type:FLOOR})).attach(
    make_pillar(
        (t,u) => V4.rgb(1+Math.cos(3*τ*u),1+Math.sin(3*τ*u),1+Math.cos(π*t)).scXYZ(1/2),
        V4.gray(1),
    ),
);
wt.add("045", build({type:FLOOR},{type:LAMP}));
wt.add("0451", build({type:FLOOR})).attach(
    make_pillar(
        (t,u) => V4.rgb(1+Math.cos(3*τ*u),1+Math.sin(3*τ*u),1+Math.cos(π*t)).scXYZ(1/2),
        V4.gray(1),
    ),
);
wt.add("046", build({type:FLOOR},{type:LAMP}));
wt.add("0462", build({type:FLOOR})).attach(
    make_pillar(
        (t,u) => V4.rgb(1+Math.cos(3*τ*u),1+Math.sin(3*τ*u),1+Math.cos(π*t)).scXYZ(1/2),
        V4.gray(1),
    ),
);
wt.add("047", build({type:FLOOR},{type:LAMP}));
wt.add("0473", build({type:FLOOR})).attach(
    make_pillar(
        (t,u) => V4.rgb(1+Math.cos(3*τ*u),1+Math.sin(3*τ*u),1+Math.cos(π*t)).scXYZ(1/2),
        V4.gray(1),
    ),
);

// road to cistern
wt.add("06", build(
    {type:FLOOR},
    {type:PATH, edges:[2,6]},
    {type:LAMP, verts:[5,6], radius:0.45},
));
wt.add("060", build(
    ...template_water,
    {type:EDGE_CLIFF, edges:[0,7,6]},
));
wt.add("062", build(
    {type:FLOOR, palette:FLOOR_PALETTE_WATER, height:-m(25)},
    //{type:NODE},
    //{type:PATH, edges:[2]},
    //{type:LAMP, verts:Calc.Iota(8), radius:0.45},
    {type:EDGE_CLIFF, edges:[2], height:+m(250)}
)).attach(
    make_dome(+m(25), (t,u) => V4.rgb(0,0,(1-t*t)*0.5)),
    make_dome(-m(5), (t,u) => V4.rgb(0,(1-t)*0.1,(1-t*t)*0.9), V4.rgb(0,0,1)),
    make_dome(-m(10), (t,u) => V4.rgb(0,(1-t)*0.5,(1-t*t)*0.9)),
    //make_portal("cistern", V4.rgb(0,1,8), M4.ReflK()),
);
wt.add("064", build(
    ...template_water,
    {type:EDGE_CLIFF, edges:[4,5,6]},
));

// cistern walls
wt.add("0620", build(...template_great_pillar));
wt.add("0621", build(...template_great_pillar));
wt.add("0623", build(...template_great_pillar));
wt.add("0624", build(...template_great_pillar));
wt.add("0625", build(...template_great_pillar));
wt.add("0626", build(...template_great_pillar));
wt.add("0627", build(...template_great_pillar));

wt.add("0603", build(...template_great_pillar))
wt.add("06030", build(...template_water));
wt.add("06031", build(...template_water));
wt.add("06032", build(...template_water));
wt.add("06034", build(...template_water));
wt.add("06035", build(...template_water));
wt.add("06036", build(...template_water));
wt.add("06037", build(...template_water));

wt.add("0641", build(...template_great_pillar))
wt.add("06410", build(...template_water));
wt.add("06412", build(...template_water));
wt.add("06413", build(...template_water));
wt.add("06414", build(...template_water));
wt.add("06415", build(...template_water));
wt.add("06416", build(...template_water));
wt.add("06417", build(...template_water));

// forest strip
wt.add("13",  build(...template_forest));
wt.add("130", build(
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:TREE, edges:[0,1,2,3,4,5,6,7], radius:2/3, max:2},
    {type:NODE}, {type:LAMP},
)).attach(new Light("ForestLight", Light.Mode.Collar,0,m(50),V4.rgb(0.4,0.3,0.0)).rm(M4.RotJ(π/2)));
make_forest_island("130");

wt.add("1302", build(...template_forest));
wt.add("1303", build(...template_forest));
wt.add("1304", build(...template_forest));
wt.add("1305", build(...template_forest));
wt.add("1306", build(...template_forest));

wt.add("137", build(...template_forest));
wt.add("136", build(...template_forest));

wt.add("14",  build(...template_forest));
wt.add("142", build(...template_forest));
wt.add("141", build(
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:TREE, edges:[0,1,2,3,4,5,6,7], radius:2/3, max:2},
    {type:NODE},
)).attach(make_night_dome());
wt.add("140", build(...template_forest));
wt.add("147", build(...template_forest));
wt.add("146", build(...template_forest));

wt.add("1413", build(...template_forest));
wt.add("1414", build(...template_forest));
wt.add("1415", build(...template_forest));
wt.add("1416", build(...template_forest));
wt.add("1417", build(...template_forest));

wt.add("15",  build( ...template_forest));
wt.add("152", build(...template_forest));
wt.add("151", build(...template_forest));
wt.add("150", build(...template_forest));

wt.add("16",   build(...template_forest, {type:EDGE_CLIFF, edges:[0]}));
wt.add("164",  build(...template_forest));
wt.add("163",  build(...template_forest));
wt.add("162",  build(...template_forest));
wt.add("161",  build(...template_forest, {type:EDGE_CLIFF, edges:[0]}));
wt.add("1614", build(...template_forest));
wt.add("1615", build(...template_forest));
wt.add("1616", build(
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:NODE},
    {type:PATH, edges:[7]},
)).attach(
    make_pillar((t,u) => V4.rgb(1-t,1,1), V4.rgb(1/2,3/4,1/4)),
);
wt.add("1617", build(
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:EDGE_CLIFF, edges:[0,1,2,3,4,5]},
    {type:TREE, edges:[0,1,2,3,4,5,7], radius:2/3, max:2},
    {type:NODE},
    {type:PATH, edges:[6]},
)).attach(
    make_night_dome(),
    //make_portal("cycles", V4.rgb(0,3,1), M4.ReflK())
);

// tranquility plaza
wt.add("26", build(
    {type:FLOOR},{type:PATH, edges:[2,6, 0,4]},{type:NODE},
    //{type:LAMP, verts:Calc.Iota(8)},
)).attach(
    make_dome(m(20), (t,u) => V4.rgb((1-t)*0.8,(1-t*t)*0.9,1-t*t*t), V4.gray(3/4)),
    //make_portal("tranquility", V4.rgb(0.7, 0.8, 2), M4.ReflK()),
);
wt.add("262", build(
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:PATH, edges:[2]},{type:NODE},
    {type:LAMP, edges:[0,4,6], radius:2/3},
    {type:TREE, verts:Calc.Iota(8), radius:2/3, max:2},
));

wt.add("260", build(
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:PATH, edges:[0]},{type:NODE},
    {type:LAMP, edges:[2,4,6], radius:2/3},
    {type:TREE, verts:Calc.Iota(8), radius:2/3, max:2},
));
wt.add("261", build(
    ...template_forest,
));
wt.add("262", build(
    ...template_forest,
));
wt.add("263", build(
    ...template_forest,
));
wt.add("264", build(
    {type:FLOOR, palette:FLOOR_PALETTE_GRASS},
    {type:PATH, edges:[4]},{type:NODE},
    {type:LAMP, edges:[0,2,6], radius:2/3},
    {type:TREE, verts:Calc.Iota(8), radius:2/3, max:2},
));
wt.add("265", build(
    ...template_forest,
));
wt.add("267", build(
    ...template_forest,
));

// museum entrance
wt.add("40", build(
    {type:FLOOR},{type:PATH, edges:[0, 1,3,5,7]},{type:NODE},
)).attach(
    make_horosphere(),
    make_pillar_text(TanhText.Hub.Euclid, M4.RotI(-π/2)),
    make_pillar_text(TanhText.Hub.NonEuclid, M4.RotI(π)),
    make_pillar_text(TanhText.Hub.Hyperbolic, M4.RotI(+π/2)),
);

// museum periphery
wt.add("42", build(...template_forest));
wt.add("426", build({type:FLOOR, palette:FLOOR_PALETTE_GRASS})).attach(
    make_pillar((t,u) => V4.rgb(1-t,1,1), V4.rgb(1/2,3/4,1/4)),
);
wt.add("4260", build(...template_forest));
wt.add("4261", build(...template_forest));
wt.add("4262", build(...template_forest));
wt.add("4263", build(...template_forest));
wt.add("4264", build(...template_forest));
wt.add("4265", build(...template_forest));
wt.add("4267", build(...template_forest));

wt.add("46", build(...template_forest));
wt.add("462", build({type:FLOOR, palette:FLOOR_PALETTE_GRASS})).attach(
    make_pillar((t,u) => V4.rgb(1-t,1,1), V4.rgb(1/2,3/4,1/4)),
);
wt.add("4620", build(...template_forest));
wt.add("4621", build(...template_forest));
wt.add("4623", build(...template_forest));
wt.add("4624", build(...template_forest));
wt.add("4625", build(...template_forest));
wt.add("4626", build(...template_forest));
wt.add("4627", build(...template_forest));

// museum hallways
wt.add("404", build(...template_great_pillar));

wt.add("4042", build(...template_great_wall_flip));
wt.add("40424", build(...template_great_wall_flip));
wt.add("404242", build(...template_great_wall_flip));
wt.add("4042424", build(...template_great_wall_flip));
wt.add("40424242", build(...template_great_wall_flip));
wt.add("404242424", build(...template_great_pillar));

wt.add("4046", build(...template_great_wall_flip));
wt.add("40464", build(...template_great_wall_flip));
wt.add("404646", build(...template_great_wall_flip));
wt.add("4046464", build(...template_great_wall_flip));
wt.add("40464646", build(...template_great_wall_flip));
wt.add("404646464", build(...template_great_pillar));

wt.add("403", build({type:FLOOR},{type:PATH, edges:[3]},{type:NODE},{type:LAMP})).attach(
    make_pillar_text(TanhText.Hub.Erlangen, M4.ReflK()),
    make_pillar_text(TanhText.Hub.CayleyKlein, M4.rm(M4.RotI(-π/2), M4.ReflK())),
);
wt.add("405", build({type:FLOOR},{type:PATH, edges:[5]},{type:NODE},{type:LAMP})).attach(
    make_pillar_text(TanhText.Hub.EuclidAxioms, M4.rm(M4.RotI(+π/2), M4.ReflK())),
    make_pillar_text(TanhText.Hub.Euclids5th, M4.ReflK()),
);

wt.add("401", build({type:FLOOR},{type:PATH, edges:[1]},{type:NODE},{type:LAMP}))
wt.add("4015", build(...template_great_pillar));
wt.add("4013", build(...template_great_wall_flip));
wt.add("40136", build(...template_great_wall_flip));
wt.add("40134", build(...template_great_wall_flip));
wt.add("401346", build(...template_great_wall_flip));
wt.add("40135", build(...template_great_pillar));

wt.add("407", build({type:FLOOR},{type:PATH, edges:[7]},{type:NODE},{type:LAMP}));
wt.add("4073", build(...template_great_pillar));
wt.add("4075", build(...template_great_wall_flip));
wt.add("40752", build(...template_great_wall_flip));
wt.add("40754", build(...template_great_wall_flip));
wt.add("407542", build(...template_great_wall_flip));
wt.add("40753", build(...template_great_pillar));

const template_mushwoods = (N,c, min=0, max=template_mushrooms.length) => [
    {type:FLOOR, palette:FLOOR_PALETTE_MUSHROOM},
    {type:MUSH, count:N, color:c, min:min, max:max},
];

const template_midmush = [
    {type:FLOOR, palette:FLOOR_PALETTE_MUSHROOM},
    {type:MUSH, color:undefined, min:4, max:5}
];

const template_bigmush = [
    {type:FLOOR, palette:FLOOR_PALETTE_MUSHROOM},
    {type:MUSH, color:undefined, min:7}
];

const make_mushroom_island = (prefix) => {
    const N = 12;
    wt.add(`${prefix}z`, build(...template_mushwoods(N, undefined, 0, 4)));
    wt.add(`${prefix}z0`, build(...template_mushwoods(N, undefined, 0, 6)));
    wt.add(`${prefix}z1`, build(...template_mushwoods(N, undefined, 0, 6)));
    wt.add(`${prefix}z2`, build(...template_mushwoods(N, undefined, 0, 6)));
    wt.add(`${prefix}z3`, build(...template_mushwoods(N, undefined, 0, 6)));
    wt.add(`${prefix}z4`, build(...template_mushwoods(N, undefined, 0, 6)));
    wt.add(`${prefix}z5`, build(...template_mushwoods(N, undefined, 0, 6)));
    wt.add(`${prefix}z6`, build(...template_mushwoods(N, undefined, 0, 6)));
    wt.add(`${prefix}z7`, build(...template_mushwoods(N, undefined, 0, 6)));
}

// mushroom forest
wt.add("60", build(...template_mushwoods(8,1,0,4)));
wt.add("64", build(...template_mushwoods(8,1,0,4)));

wt.add("602", build(...template_mushwoods(8,1,2)));
wt.add("603", build(...template_mushwoods(8,1,2)));
wt.add("604", build(...template_mushwoods(8,1,2)));
wt.add("605", build(...template_mushwoods(8,1,2)));
wt.add("606", build(...template_mushwoods(8,1,0,4)));

wt.add("640", build(...template_mushwoods(8,1,2)));
wt.add("641", build(...template_mushwoods(8,1,2)));
wt.add("642", build(...template_mushwoods(8,1,2)));
wt.add("646", build(...template_mushwoods(8,1,0,4)));
wt.add("647", build(...template_mushwoods(8,1,2)));

wt.add("62", build(
    {type:FLOOR, palette:FLOOR_PALETTE_MUSHROOM},
    {type:PATH, edges:[2,6]},
    {type:MUSH, edges:[0,1,3,4,5,7], radius:0.6},
));
wt.add("620", build(...template_mushwoods(8)));
wt.add("621", build(...template_mushwoods(8)));
wt.add("623", build(...template_mushwoods(8)));
wt.add("624", build(...template_mushwoods(8)));
wt.add("625", build(...template_mushwoods(8)));
wt.add("626", build(
    {type:FLOOR, palette:FLOOR_PALETTE_MUSHROOM},{type:PATH, edges:[6]},{type:NODE},
    {type:MUSH, edges:[0,1,2,3,4,5,7], min:2, radius:3/4},
)).attach(
    //make_portal("mycelium", V4.ones),
);
wt.add("627", build(...template_mushwoods(8)));

wt.add("6260", build(...template_mushwoods(8)));
wt.add("6261", build(...template_mushwoods(8)));
wt.add("6262", build(...template_mushwoods(8)));
wt.add("6263", build(...template_mushwoods(8)));
wt.add("6264", build(...template_mushwoods(8)));

make_mushroom_island("626");

// deep forest
wt.add("36", build(...template_deep_forest));
wt.add("37", build(...template_deep_forest));
wt.add("30", build(...template_deep_forest));
wt.add("31", build(...template_deep_forest));

wt.add("363", build(...template_deep_forest));
wt.add("362", build(...template_deep_forest));
wt.add("361", build(...template_deep_forest));
wt.add("360", build(...template_deep_forest));

wt.add("374", build(...template_deep_forest));
wt.add("373", build(...template_deep_forest));
wt.add("372", build(...template_deep_forest));
wt.add("371", build(...template_deep_forest));

wt.add("305", build(...template_deep_forest));
wt.add("304", build(...template_deep_forest));
wt.add("303", build(...template_deep_forest));
wt.add("302", build(...template_deep_forest));

wt.add("314", build(...template_deep_forest));
wt.add("315", build(...template_deep_forest));
wt.add("316", build(...template_deep_forest));

// giant mushroom habitat
wt.add("51", build({type:FLOOR, palette:FLOOR_PALETTE_MUSHROOM}));
wt.add("52", build(...template_great_pillar));

wt.add("517", build(...template_great_pillar));
wt.add("516", build(...template_midmush)); make_mushroom_island("516");
wt.add("515", build(...template_midmush)); make_mushroom_island("515");
wt.add("514", build(...template_midmush)); make_mushroom_island("514");
wt.add("513", build(...template_midmush)); make_mushroom_island("513");

make_mushroom_island("516z0");
make_mushroom_island("516z2");
make_mushroom_island("516z4");
make_mushroom_island("516z6");

make_mushroom_island("515z0");
make_mushroom_island("515z2");
make_mushroom_island("515z4");
make_mushroom_island("515z6");

make_mushroom_island("514z0");
make_mushroom_island("514z2");
make_mushroom_island("514z4");
make_mushroom_island("514z6");

make_mushroom_island("513z0");
make_mushroom_island("513z2");
make_mushroom_island("513z4");
make_mushroom_island("513z6");

wt.add("5160", build(...template_bigmush));
wt.add("5161", build(...template_bigmush));
wt.add("5162", build(...template_bigmush));
wt.add("5163", build(...template_bigmush));
wt.add("5164", build(...template_bigmush));

wt.add("5150", build(...template_bigmush));
wt.add("5151", build(...template_bigmush));
wt.add("5152", build(...template_bigmush));
wt.add("5153", build(...template_bigmush));

wt.add("5147", build(...template_bigmush));
wt.add("5140", build(...template_bigmush));
wt.add("5141", build(...template_bigmush));
wt.add("5142", build(...template_bigmush));

wt.add("5136", build(...template_bigmush));
wt.add("5137", build(...template_bigmush));
wt.add("5130", build(...template_bigmush));
wt.add("5131", build(...template_bigmush));

// wishing wells
wt.add("73", build({type:FLOOR},{type:LAMP}));
wt.add("731", build(...template_great_pillar));
wt.add("730", build(...template_well)).attach(make_well_light());
wt.add("737", build(...template_well)).attach(make_well_light());
wt.add("736", build(...template_well)).attach(make_well_light());
wt.add("735", build(...template_well)).attach(make_well_light());

wt.add("7302", build(...template_well)).attach(make_well_light());
wt.add("7303", build(...template_well)).attach(make_well_light());
wt.add("7304", build(...template_well)).attach(make_well_light());
wt.add("7305", build(...template_well)).attach(make_well_light());
wt.add("7306", build(...template_well)).attach(make_well_light());

wt.add("7372", build(...template_well)).attach(make_well_light());
wt.add("7373", build(...template_well)).attach(make_well_light());
wt.add("7374", build(...template_well)).attach(make_well_light());
wt.add("7375", build(...template_well)).attach(make_well_light());

wt.add("7361", build(...template_well)).attach(make_well_light());
wt.add("7362", build(...template_well)).attach(make_well_light());
wt.add("7363", build(...template_well)).attach(make_well_light());
wt.add("7364", build(...template_well)).attach(make_well_light());

wt.add("7350", build(...template_well)).attach(make_well_light());
wt.add("7351", build(...template_well)).attach(make_well_light());
wt.add("7352", build(...template_well)).attach(make_well_light());
wt.add("7353", build(...template_well)).attach(make_well_light());