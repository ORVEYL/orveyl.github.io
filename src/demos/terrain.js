// adc :: terrain.js

import * as Calc from "../math/calc.js";
import {
    Rand, π,
} from "../math/calc.js";
import { V4, M4, Complex } from "../math/vector.js";
import { SI } from "../math/si.js";

import { Scene } from "../node/scene.js";
import { Geometry } from "../node/scene/geometry.js";
import { Ticker } from "../node/component/ticker.js";

import * as KB from "../math/knuthbendix.js";
import { WordTree } from "../node/scene/wordtree.js";
import { VertexArray, IndexArray } from "../gpubuffer.js";
import { ControllerManager } from "../node/component/controller.js";
import { Orveyl } from "../orveyl.js";

const m = SI.m_to_au;
SI.m_per_au = 256;

const map_size = Calc.Clamp(0,4)(Orveyl.InitParams.get("size") ?? 1);
const map_type = Calc.Clamp(0,4)(Orveyl.InitParams.get("type") ?? 1)
const map_elev = Orveyl.InitParams.get("elev") ?? 0;
const map_pal_offset  = Orveyl.InitParams.get("p") ?? 0;

const treasure_enabled = Orveyl.InitParams.get("n") ?? true;
const treasure_N = treasure_enabled ? [3, 6, 9, 12][map_size] : 0;

Orveyl.Menu.innerHTML = [
    `Size: ${[
        `<select id="size">`,
        `<option value="0" ${map_size == 0 ? "selected" : ""}>XS</option>`,
        `<option value="1" ${map_size == 1 ? "selected" : ""}>S</option>`,
        `<option value="2" ${map_size == 2 ? "selected" : ""}>M</option>`,
        `<option value="3" ${map_size == 3 ? "selected" : ""}>L</option>`,
        `</select>`,
    ].join("")}`,

    `Type: ${[
        `<select id="type">`,
        `<option value="0" ${map_type == 0 ? "selected" : ""}>Gentle</option>`,
        `<option value="1" ${map_type == 1 ? "selected" : ""}>Normal</option>`,
        `<option value="2" ${map_type == 2 ? "selected" : ""}>Rough</option>`,
        `<option value="3" ${map_type == 3 ? "selected" : ""}>Extreme</option>`,
        `</select>`,
    ].join("")}`,

    `Elevation: ${[
        `<input id="elev" type="number" step="1" style="width:4em;" value="${map_elev}">`,
        `</input>m`,
    ].join("")}`,

    `Palette Offset: ${[
        `<input id="pal" type="number" step="1" style="width:4em;" value="${map_pal_offset}">`,
        `</input>m`,
    ].join("")}`,

    `Treasure: ${[
        `<select id="treasure">`,
        `<option value="0" ${treasure_enabled == false ? "selected" : ""}>OFF</option>`,
        `<option value="1" ${treasure_enabled == true  ? "selected" : ""}>ON</option>`,
        `</select>`,
    ].join("")}`,

    `:: <input type="button" id="generate" value="Generate"> ::`,
].join("<br>");

document.getElementById("generate").onclick = () => {
    const new_size = document.getElementById("size").value;
    const ok = (new_size < 3) || confirm(
        [
            `Large maps require exponentially more resources to generate.`,
            `This may cause your browser to become unresponsive or crash!`,
            ``,
            `Proceed anyway?`,
        ].join("\n")
    );

    if (ok) {
        window.location.assign(
            [
                `/?demo=terrain`,
                `size=${new_size}`,
                `type=${document.getElementById("type").value}`,
                `elev=${document.getElementById("elev").value}`,
                `p=${document.getElementById("pal").value}`,
                `n=${document.getElementById("treasure").value}`,
            ].join("&")
        );
    }
};

const [
    σz_f_type,
    σz_e_type,
    σz_v_type,
] = [
    [25, 75, 150, 300],
    [5, 10, 25, 100],
    [10, 25, 50, 200],
];

const tile_N = 8;
const ground_z = m(map_elev);
const ground_σz_face = m(σz_f_type[map_type]);
const ground_σz_edge = m(σz_e_type[map_type]);
const ground_σz_vert = m(σz_v_type[map_type]);

const ground_z_lim_enabled = false;
const [ground_z_min, ground_z_max] = [m(-100), m(100)];
const [ground_λz_min, ground_λz_max] = [1/16, 1/32]
const ground_z_lim = ground_z_lim_enabled ? 
    Calc.SmoothClampExp(ground_λz_min, ground_λz_max)(ground_z_min, ground_z_max) :
    z => z;
    
const star_N = 500;
const star_z = m(200);
const star_h = m(300)

const road_N = 64;
const road_z = m(0);
const road_h = m(0.25);
const road_w = m(6);
const road_z_lim = Calc.SmoothMaxExp(1/16)(road_z+road_h);

const camera_grounded = true;
Orveyl.DefaultPlayer.setRelative(
    camera_grounded ?
    M4.MovZ(ground_z_lim(ground_z) + road_h + m(1+SI.Ref.length_m.human_height)) : M4.id
);

const camera_human_scale = false;
ControllerManager.FluxScale = camera_human_scale ?
    m(SI.Ref.speed_mps.human_running) : undefined;

const sky_col = V4.rgb(1/16, 0, 1/5);
Orveyl.SetSky(sky_col.x, sky_col.y, sky_col.z);

const ground_col = V4.rgb(1/2, 1/4, 1/9);
const stone_col = V4.rgb(1/8, 1/9, 1/6);
const grass_col = V4.rgb(1/6, 1/3, 1/16);
const forest_col = V4.rgb(1/8, 1/4, 1/12);
const beach_col = V4.rgb(1/12, 1/3, 1/2);
const water_col = V4.rgb(1/12, 1/12, 1/3);
const depths_col = V4.rgb(1/16, 0, 1/4);
const sand_col = V4.rgb(2/3, 1/2, 1/6);
const snow_col = V4.rgb(1/2, 1/2, 4/5);
const ice_col = V4.rgb(3/4, 3/4, 4/5);
const cave_col = V4.rgb(1/4, 1/6, 1/3);

const road_inner_col = V4.rgb(1/8, 1/8, 1/8);
const road_outer_col = V4.rgb(1/32, 1/32, 1/32);

const debug_col = [
    V4.rgb(1,0,0),
    V4.rgb(1,1/2,0),
    V4.rgb(1,1,0),
    V4.rgb(1/2,1,0),
    V4.rgb(0,1,0),
    V4.rgb(0,1,1/2),
    V4.rgb(0,1,1),
    V4.rgb(0,1/2,1),
    V4.rgb(0,0,1),
    V4.rgb(1/2,0,1),
    V4.rgb(1,0,1),
    V4.rgb(1,0,1/2),
];

const star_k = Rand.Gauss(0.8)(0.1);
const star_col = () => V4.rgb(star_k(), star_k(), star_k());
const rand_col = () => V4.rgb(Rand.Unit(), Rand.Unit(), Rand.Unit());

const ground_col_offset = m(map_pal_offset);
const ground_pal = (t) => {
    t += ground_col_offset;
    return ground_col.dup.mul(
        V4.ones.sub(rand_col().sc(1/6))
    ).mix(
        grass_col,
        Calc.Sat(Calc.Remap(-0.25,0.5)(1,0)(t))
    ).mix(
        forest_col,
        Calc.Sat(Calc.Remap(-0.45,0.25)(1,0)(t)),
    ).mix(
        sand_col,
        Calc.Sat(Calc.Remap(-0.49,-0.44)(1,0)(t)),
    ).mix(
        beach_col,
        Calc.Sat(Calc.Remap(-0.6,-0.5)(1,0)(t)),
    ).mix(
        water_col,
        Calc.Sat(Calc.Remap(-0.65,-0.6)(1,0)(t)),
    ).mix(
        depths_col,
        Calc.Sat(Calc.Remap(-1,-0.65)(1,0)(t)),
    ).mix(
        sky_col,
        Calc.Sat(Calc.Remap(-1,-0.8)(1,0)(t)),
    ).mix(
        stone_col.dup.mul(
            V4.ones.sub(rand_col().sc(1/3))
        ),
        Calc.Sat(Calc.Remap(0.5,0.75)(0,1)(t)),
    ).mix(
        snow_col,
        Calc.Sat(Calc.Remap(0.7,0.8)(0,1)(t)),
    ).mix(
        ice_col,
        Calc.Sat(Calc.Remap(0.8,0.85)(0,1)(t)),
    ).add(rand_col().sc(1/32));
}

const sys = new KB.System(
    ["0", "1", "2", "3", "4", "5"],
    ["0", "1", "2", "3", "4", "5"],
    KB.Rule.Array(
        ["00"], ["11"], ["22"], ["33"], ["44"], ["55"],
        ["01".repeat(2)],
        ["12".repeat(2)],
        ["23".repeat(2)],
        ["34".repeat(2)],
        ["45".repeat(2)],
        ["05".repeat(2)],
    )
).complete();

{ // setup sys repr with ortho-hexagonal domain
    const [α, β, γ] = [π/4, π/6, π/2];
    const [Cα, Sα] = Calc.Geom.Sph.Exp(α);
    const [Cβ, Sβ] = Calc.Geom.Sph.Exp(β);

    const [Ca, Cb] = [Cα/Sβ, Cβ/Sα];
    const Cc = Ca*Cb;

    const [a, b, c] = [Ca, Cb, Cc].map(Calc.Geom.Hyp.CosInv);
    sys.repr.a = a;
    sys.repr.b = b;
    sys.repr.c = c;

    const dα = sys.repr.dα = M4.RotI(α);
    const dβ = sys.repr.dβ = M4.RotI(β);
    const dγ = sys.repr.dγ = M4.RotI(γ);

    const da = sys.repr.da = M4.MovX(a);
    const db = sys.repr.db = M4.MovX(b);
    const dc = sys.repr.dc = M4.MovX(c);

    sys.repr.di = [];
    sys.repr.di[0] = M4.id;
    sys.repr.di[1] = M4.RotI(2*β);
    sys.repr.di[2] = M4.rm(sys.repr.di[1], sys.repr.di[1]);
    sys.repr.di[3] = M4.rm(sys.repr.di[1], sys.repr.di[2]);
    sys.repr.di[4] = M4.rm(sys.repr.di[1], sys.repr.di[3]);
    sys.repr.di[5] = M4.rm(sys.repr.di[1], sys.repr.di[4]);

    sys.repr.edges = [];
    sys.repr.edges[0] = M4.rm(sys.repr.di[0], da);
    sys.repr.edges[1] = M4.rm(sys.repr.di[1], da);
    sys.repr.edges[2] = M4.rm(sys.repr.di[2], da);
    sys.repr.edges[3] = M4.rm(sys.repr.di[3], da);
    sys.repr.edges[4] = M4.rm(sys.repr.di[4], da);
    sys.repr.edges[5] = M4.rm(sys.repr.di[5], da);

    sys.repr.verts = [];
    sys.repr.verts[0] = M4.rm(sys.repr.edges[0], dγ, db);
    sys.repr.verts[1] = M4.rm(sys.repr.edges[1], dγ, db);
    sys.repr.verts[2] = M4.rm(sys.repr.edges[2], dγ, db);
    sys.repr.verts[3] = M4.rm(sys.repr.edges[3], dγ, db);
    sys.repr.verts[4] = M4.rm(sys.repr.edges[4], dγ, db);
    sys.repr.verts[5] = M4.rm(sys.repr.edges[5], dγ, db);

    sys.repr.m = [];
    sys.repr["0"] = sys.repr.m[0] = M4.Refl(sys.repr.edges[0].dup.T.Rx);
    sys.repr["1"] = sys.repr.m[1] = M4.Refl(sys.repr.edges[1].dup.T.Rx);
    sys.repr["2"] = sys.repr.m[2] = M4.Refl(sys.repr.edges[2].dup.T.Rx);
    sys.repr["3"] = sys.repr.m[3] = M4.Refl(sys.repr.edges[3].dup.T.Rx);
    sys.repr["4"] = sys.repr.m[4] = M4.Refl(sys.repr.edges[4].dup.T.Rx);
    sys.repr["5"] = sys.repr.m[5] = M4.Refl(sys.repr.edges[5].dup.T.Rx);
}

const chambers = [];
const wt = new WordTree("Terrain", sys);

const populate = async here => {

    chambers.push(here)

    const thru = [
        here.thru("0"), here.thru("1"), here.thru("2"),
        here.thru("3"), here.thru("4"), here.thru("5"),
    ];

    const wrap = Calc.Wrap(6);
    const Rgfz = Rand.Gauss(0)(ground_σz_face);
    const Rgvz = Rand.Gauss(0)(ground_σz_vert);
    const Rgez = Rand.Gauss(0)(ground_σz_edge);

    const Rfz = () => {
        let z = 0;
        const valid_thru = thru.filter(x => x != null);
        if (valid_thru.length) {
            z = Rand.From(valid_thru)().fz + Rgfz();
        }
        return ground_z_lim(z);
    }
    const Rvz = () => here.fz + Rgvz();
    const Rez = (i) => {
        const j = wrap(i-1);
        return (here.vz[i]+here.vz[j])/2 + Rgez();
    }

    here.fz = Rfz();
    here.vz = [...Calc.Gen.Idx(i => thru[i]?.vz[i] ?? thru[wrap(i+1)]?.vz[i] ?? Rvz())(6)];
    here.ez = [...Calc.Gen.Idx(i => thru[i]?.ez[i] ?? Rez(i))(6)];

    here.road = (here.prev() == null) || !!(thru[0]?.road || thru[3]?.road);

    // const [z0, z1] = [
    //     prev?.bez.ps[1] ?? R(),
    //     next?.bez.ps[0] ?? R(),
    // ];
    // const [c0, c1] = [
    //     2*z0 - (prev?.bez.cs[1] ?? R()),
    //     2*z1 - (next?.bez.cs[0] ?? R()),
    // ];
    // here.bez = new Bezier3f(z0, c0, c1, z1);

    // here.fe_bez = [...Calc.Gen.Idx(
    //     i => {
    //         const [z0, z1] = [here.fz, here.ez[i]];
    //         return new Bezier2f(z0, 0.5*Rand.Sign(), z1);
    //     }
    // )(6)];

    const [e, v] = [
        sys.repr.edges.map(E => E.Cw),
        sys.repr.verts.map(V => V.Cw),
    ];
    e[6]=e[0];
    v[6]=v[0];

    const get_ground_pos = k => (s,t) => V4.lerp(
        V4.lerp(V4.w, e[k])(s),
        V4.lerp(e[k+1], v[k])(s),
    )(t);

    const get_ground_z = k => (s,t) => Calc.Lerp(
        Calc.Lerp(here.fz, here.ez[k])(s),
        Calc.Lerp(here.ez[wrap(k+1)], here.vz[k])(s),
        //here.fe_bez[k].eval(s),
        //here.fe_bez[wrap(k+1)].eval(t),
    )(t) + ground_z;

    here.center_z = get_ground_z(0)(0,0);

    const tile = new Geometry("Tile", new VertexArray(), new IndexArray());
    const star = new Geometry("Stars", new VertexArray())
    .setMode(0).setBlend(1);


    const make_tile = async here => {
        for (let k=0; k<6; ++k) {
            const ip = get_ground_pos(k);
            const iz = get_ground_z(k);

            for (let j=0; j<=tile_N; ++j) {
                for (let i=0; i<=tile_N; ++i) {
                    const [s,t] = [i/tile_N, j/tile_N];
                    const [p, z] = [ip(s,t), ground_z_lim(iz(s,t))];
                    const P = M4.Along(p);

                    tile.va.push([M4.MovZ(z).lm(P).Cw, ground_pal(z)]);

                    if (z < ground_z-0.55) {
                        star.va.push([
                            M4.MovZ(ground_z-0.55).lm(M4.Transport(0.05*Rand.Sign(), 0.5*Rand.Sign()), P).Cw,
                            V4.rgb(0, 0.5*Rand.Unit(), 0.5+0.5*Rand.Unit()).sc(0.75),
                        ]);
                    }
                }
            }

            for (let j=0; j<tile_N; ++j) {
                for (let i=0; i<tile_N; ++i) {
                    const [a,b,c,d] = [
                        i, i+1,
                        i+tile_N+1, i+tile_N+2
                    ];
                    tile.ia.push(
                        a, b, c,
                        b, d, c,
                    );   
                }
                tile.ia.base += tile_N+1;
            }
            tile.ia.base += tile_N+1;
        }

        here.attach(tile);
        tile.write();
    }

    const make_road = async here => {
        if (!here.road) return;

        const road = new Geometry("Road", new VertexArray(), new IndexArray())
        .setMode(1);

        for (let i = 0; i <= road_N; ++i) {

            const t = i/road_N;

            for (let sector of [0, 3]) {
                const [p, z] = [
                    get_ground_pos(sector)(t,0),
                    road_z_lim(get_ground_z(sector)(t,0)),
                ];
                road.va.push(
                    [M4.MovZ(z).lm(M4.Along(p)).Cw, V4.rgb(t,1-t,0)],
                );
            }

            road.ia.push(
                2*i, 2*i+2,
                2*i+1, 2*i+3,
            );
        }

        here.attach(road);
        road.write();
    }

    const make_star = async here => {
        for (let i = 0; i < star_N; ++i) {
            star.va.push(
                [
                    M4.rm(
                        M4.RotI(π*Rand.Sign()),
                        M4.MovX(sys.repr.c*Rand.Sqrt()),
                        M4.MovZ(ground_z + 0.5*here.fz + star_z + star_h*Rand.Sq()),
                    ).Cw, star_col()
                ],
            );
        }

        here.attach(star);
        star.write();
    }

    Promise.all([
        new Promise(resolve => setTimeout(() => resolve(make_tile(here)), 1)),
        new Promise(resolve => setTimeout(() => resolve(make_star(here)), 1)),
        //new Promise(resolve => setTimeout(() => resolve(make_road(here)), 1)),
    ]);
};

populate(wt.root);

if (map_size == 0) {
    wt.expand(1, populate);
    //for (let w of seqs) { wt.add(w, populate); }
}

const seqs = ["01", "12", "23", "34", "45", "05"];
for (let i=0; i < map_size; ++i) {
    for (let w of wt.frontierWords()) {
        for (let seq of seqs) {
            wt.orbit(w, seq, 4, populate);
        }
    }
}

const treasure_r = m(8);
const treasure_hint_interval = 300;
let treasure_count = 0;

const treasure_va = new VertexArray().push(
    [V4.w, V4.rgb(0,0,0)],
    [M4.MovX(+treasure_r).Cw, V4.rgb(1,0,0,0.6)],
    [M4.MovY(+treasure_r).Cw, V4.rgb(0,1,0,0.6)],
    [M4.MovZ(+treasure_r).Cw, V4.rgb(0,0,1,0.6)],
    [M4.MovX(-treasure_r).Cw, V4.rgb(0,1,1,0.6)],
    [M4.MovY(-treasure_r).Cw, V4.rgb(1,0,1,0.6)],
    [M4.MovZ(-treasure_r).Cw, V4.rgb(1,1,0,0.6)],
);

const treasure_ia = new IndexArray();
treasure_ia.push(
    1,2,3, 3,2,4, 4,5,3, 3,5,1,
    4,5,6, 6,5,1, 1,2,6, 6,2,4,
);

const treasures = new Set();
for (let i = 0; i < treasure_N; ++i) {
    let here; do {
        here = Rand.From(chambers)();
    } while (here.treasure || here == wt.root);

    const Mz = M4.MovZ(here.center_z);
    here.treasure = new Geometry("Treasure", treasure_va, treasure_ia)
    .attachTo(here, Mz)
    .setBlend(1);
    treasures.add(here.treasure);

    here.treasure.init_Mz = Mz.dup;

    console.log(here.treasure);
}

if (treasure_N) {
    const start_time = Date.now();

    Orveyl.Status.innerHTML = [
        `Upon each of the many planes of the Orveyl`,
        `laid hills and valleys innumerable.`,
        ``,
        `The Orkind wandered their native realm freely,`,
        `sharing in its inexhaustible abundance together.`,
        ``,
        `But to navigate the outer Veyl is no small feat.`,
        `Just a short distance from even the most`,
        `ancient of trails, unknown frontiers await.`,
        ``,
        `Try to find <span style="color:#fff">${treasure_N}</span> Reverine crystals!`
    ].join("<br>");

    const win_message = end_time => [
        `<span style="color:#fff">:: NICE WORK! ::</span>`,
        `FOUND : ${treasure_count} crystals`,
        `SIZE  : ${wt.count} tiles`,
        `TIME  : ${(end_time - start_time)/1000}s`,
        ``,
        [
            [   `Well, not bad for a practice run at least!`,
                `But this tiny area is far too cramped`,
                `for an Ork to consider impressive...`,
                ``,
                `(Now that you've got your bearings,`,
                `why not try exploring a bigger region?)`,
            ].join("<br>"),

            [   `On level ground or not, be wary,`,
                `for the road ahead inevitably diverges:`,
                `as a great tree fans out branches upon branches,`,
                `so too does each and every forward path.`,
                ``,
                `But in this looming canopy, stars above,`,
                `the fruit of the Reverie grows bountifully.`,
                `Thus Orkind are born into the Veyl, awakened`,
                `only by their brothers who reach out to them.`,
                ``,
                `(Select another size from the menu above,`,
                `or refresh the page to play again on a new map.)`,
            ].join("<br>"),

            [   `The terrain of the Orveyl proved to be`,
                `endless to all Orkind who set out toward`,
                `the outermost peripheries of their home planes,`,
                `every feature displaying such infinities.`,
                ``,
                `Atop each hill, a mountain range,`,
                `within each hole, a cavern;`,
                `Each sea a window over void,`,
                `new skies and stars alike beneath.`,
                ``,
                `(Try a LARGE map for a real test!)`,
            ].join("<br>"),

            [   `It is well-known among Orkind that the`,
                `illumination of the Reverie is focused`,
                `through the alignment of the cardinal stars`,
                `over the pillars of their world: the Nexus.`,
                ``,
                `How enchanting for a stone to catch that light`,
                `so beautifully -- a prism not only of color,`,
                `but of the very thoughts and dreams of Orkind.`,
                `A rhyme echoes in the Cosmolect.`,
            ].join("<br>"),
        ][map_size],
    ].join("<br>");


    new Ticker("TreasureTicker", self => {
        const pos = Orveyl.DefaultPlayer.world_from_local.Cw;
        self.hint_time ??= treasure_hint_interval;

        const T = M4.lm(
            M4.MovZ(treasure_r + m(100)*Calc.Abs(Math.sin(self.t))),
            M4.RotI(self.t),
        );

        let min_dist = Infinity;
        for (let tr of treasures.values()) {
            tr.setRelative(M4.lm(tr.init_Mz, T));

            const dist = V4.dist(tr.world_from_local.Cw, pos);
            min_dist = Calc.Min(min_dist)(dist);

            if (dist < 3*treasure_r) {
                treasures.delete(tr.detach());
                ++treasure_count;
                self.hint_time = 5;
            }
        }

        if (--self.hint_time <= 0) {
            const pct = treasure_count / treasure_N;
            self.hint_time = treasure_hint_interval * (1-pct);

            if (pct) {
                const s = (treasures.size == 1) ? "" : "s";
                const S = (treasures.size != 1) ? "" : "s"

                const dist_m = Calc.Trunc(SI.au_to_m(min_dist));
                if (pct < 1) {
                    Orveyl.Status.innerHTML =
                    `<span style="color:#fff">${treasures.size}</span> crystal${s} remain${S}.<br>`;

                    if (dist_m < 2000 || pct > 0.5) {
                        Orveyl.Status.innerHTML += [
                            ``,
                            `You sense another crystal`,
                            `${dist_m < 500 ?
                                `just <span style="color:#fff">${dist_m}</span> meters away!` :
                                `<span style="color:#fff">${dist_m}</span> meters away...`
                            }`,
                        ].join("<br>");
                    }
                } else {
                    Orveyl.Status.innerHTML = win_message(Date.now());
                    self.stop();
                }
            }
        }
    }).attachTo(Orveyl.Root).play();

}

const f2reφ = π/2*Rand.Sign();
const f2imφ = π/2*Rand.Sign();
const f7absA = 0.2*Rand.Choice(+1, -1)();
const f7argω = Rand.Choice(+1, -1)();
const lz = Calc.Max(0);
const ma_re = Rand.Sign();

new Ticker("SkyAnim", self => {
    Orveyl.SetSkyComplex(
        -121, 6,
        [
            ma_re,0, 0,1,
            0,1, 1,0,
        ],
        null, null, null,
        [
            0,0,
            0,0,
            0.7*Math.sin(self.t/Calc.ϕ + f2reφ), 0.7*Math.sin(self.t/Calc.δs + f2imφ),
            0,0,
            ...Complex.polar(Math.sin(self.t*Calc.Rt3/3), 2*self.t),
            0,0,
            0,0, ...Complex.polar(1+f7absA*Math.sin(self.t/Calc.Rt2), f7argω*self.t)
        ],
        null,
        [
            0.01*lz(Math.sin(self.t+f2reφ)+0.5),
            0.01*lz(Math.sin(self.t-f2imφ)+0.5),
            3+2*Math.cos(self.t/2)
        ],
    );
}).attachTo(Orveyl.Root).play(1/50)

Scene.Manager.add(wt).useIndex(0);