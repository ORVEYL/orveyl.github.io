// adc :: nebula.js

import {
    Rand, π
} from "../math/calc.js";
import { V4, M4 } from "../math/vector.js";

import { Scene } from "../node/scene.js";
import { Geometry } from "../node/scene/geometry.js";

import * as KB from "../math/knuthbendix.js";
import { WordTree } from "../node/scene/wordtree.js";
import { VertexArray } from "../gpubuffer.js";
import { Orveyl } from "../orveyl.js";

const [P,Q,R] = [3, 4, 2];
const [dX, dZ] = [
    Orveyl.InitParams.get("dX") ?? 0.78,
    Orveyl.InitParams.get("dZ") ?? 0.78,
];

Orveyl.Menu.innerHTML = [
    `dX: <input id="dX" type="number" step=${0.1} style="width:5em" value="${dX}">`,
    `dZ: <input id="dZ" type="number" step=${0.1} style="width:5em" value="${dZ}">`,
    `:: <input type="button" id="generate" value="Generate"> :: <input type="button" id="randomize" value="Randomize">`,
].join("<br>");

document.getElementById("generate").onclick = () => {
    const newdX = document.getElementById("dX").value;
    const newdZ = document.getElementById("dZ").value;
    window.location.assign(`?demo=nebula&dX=${newdX}&dZ=${newdZ}`);
};

document.getElementById("randomize").onclick = () => {
    const ds = 1.25;
    window.location.assign(`?demo=nebula&dX=${ds*Rand.Sign()}&dZ=${ds*Rand.Sign()}`);
};

const RR = M4.Rot(Rand.Sign(), Rand.Sign(), Rand.Sign(), π);

const va = new VertexArray();
const va_points = new VertexArray();
const template = new VertexArray().push(
    [V4.w], [V4.of(+1,0,0,1)], [V4.of(0,0,+1,1)],
    [V4.w], [V4.of(-1,0,0,1)], [V4.of(0,0,+1,1)],
    [V4.w], [V4.of(+1,0,0,1)], [V4.of(0,0,-1,1)],
    [V4.w], [V4.of(-1,0,0,1)], [V4.of(0,0,-1,1)],
);

const sys = new KB.System(
    ["a", "b", "c", "d"],
    ["a", "b", "c", "d"],
    KB.Rule.Array(
        ["aa"], ["bb"], ["cc"], ["dd"],
        ["ab".repeat(P)], ["bc".repeat(Q)], ["ac".repeat(R)],
        ["ad".repeat(2)], ["bd".repeat(2)], //["cd".repeat(2)],
    )
).complete();

sys.repr["a"] = M4.Refl(V4.Ex());
sys.repr["b"] = M4.Refl(M4.RotI(π/P).Cx);
sys.repr["c"] = M4.Refl(M4.MovX(+dX).Cx);
sys.repr["d"] = M4.Refl(M4.MovZ(-dZ).Cz);

const RG = Rand.Gauss(0)(1/4);
const RCol = () => V4.of(RG(), RG(), RG(), 1);

const depth = Orveyl.InitParams.get("depth") ?? 12;

const wt = new WordTree("Nebula240312", sys);
WordTree.Verbose = true;
wt.onPopulate = async self => {
    self.expand(depth, here => {
        const M = here.world_from_local.rm(
            M4.Rot(Rand.Sign(), Rand.Sign(), Rand.Sign(), 0.25),
            M4.Mov(Rand.Sign(), Rand.Sign(), Rand.Sign(), 0.25),
        ).lm(RR);

        const acc = V4.zero;
        {
            const p0 = M.ra(template[0].pos);
            acc.add(p0.sc(1/p0.w));
        }

        const cc = acc.add(V4.ones).add(RCol()).setW(1);
        const col = [cc.dup.scXYZ(0.125 / depth), V4.w, V4.w];

        let i = 0;
        for (let v of template) {
            va.push([M.ra(v.pos), col[(i++)%3]]);
        }

        va_points.push([M.ra(template[0].pos), cc.scXYZ(0.25)]);
    });

    {
        const sm = new Geometry("TriMesh", self, va);
        sm.mode = 2;
        sm.blend = 1;
    }

    {
        const sm = new Geometry("PtMesh", self, va_points);
        sm.mode = 0;
        sm.blend = 1;
    }
}

Scene.Manager.add(wt).useIndex(0);
Orveyl.DefaultPlayer.rm(M4.MovX(-2));