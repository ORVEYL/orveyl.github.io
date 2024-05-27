// adc :: default.js

import { Scene } from "../node/scene.js";
import { Geometry } from "../node/scene/geometry.js";
import { VertexArray } from "../gpubuffer.js";
import * as Calc from "../math/calc.js";
import { π, Rand } from "../math/calc.js";
import { V4, M4 } from "../math/vector.js";

import { Text } from "../node/scene/text.js";
import { Gizmo } from "../node/scene/gizmo.js";
import { Ticker } from "../node/component/ticker.js"
import { Sphere } from "../node/scene/shape.js";
import { Controller } from "../node/component/controller.js";

export const DefaultDemo = new Scene("DefaultDemo");

const [
    cw,
    cxp, cyp, czp, cap,
    cxn, cyn, czn, can,
] = [
    V4.of(0.5, 0.5, 0.5, 1),

    V4.of(1, 0.5, 0.5, 1),
    V4.of(0.5, 1, 0.5, 1),
    V4.of(0.5, 0.5, 1, 1),
    V4.of(1, 1, 1, 1),

    V4.of(0, 0.5, 0.5, 1),
    V4.of(0.5, 0, 0.5, 1),
    V4.of(0.5, 0.5, 0, 1),
    V4.of(0, 0, 0, 1),
].map(c => c.sc(1/2));

const va = new VertexArray().push(
    [V4.w, cw], [V4.of(+1,0,0,1), cxp],
    [V4.w, cw], [V4.of(-1,0,0,1), cxn],
    [V4.w, cw], [V4.of(0,+1,0,1), cyp],
    [V4.w, cw], [V4.of(0,-1,0,1), cyn],
    [V4.w, cw], [V4.of(0,0,+1,1), czp],
    [V4.w, cw], [V4.of(0,0,-1,1), czn],
    [V4.w, cw], [V4.of(+1,+1,+1,1).scXYZ(Calc.InvSqrt(3)), cap],
    [V4.w, cw], [V4.of(-1,-1,-1,1).scXYZ(Calc.InvSqrt(3)), can],
);

const [
    ExJ, ExK,
] = [
    M4.Cs(V4.x, V4.z, V4.y, V4.w),
    M4.Cs(V4.z, V4.y, V4.x, V4.w),
];

const ds = Calc.Geom.Hyp.CosInv(Calc.ϕ);
const [
    DXp, DYp, DZp,
    DXn, DYn, DZn,
] = [
    M4.lm(ExK, M4.MovX(+ds)),
    M4.lm(ExJ, M4.MovY(+ds)),
    M4.lm(     M4.MovZ(+ds)),
    M4.lm(ExK, M4.MovX(-ds)),
    M4.lm(ExJ, M4.MovY(-ds)),
    M4.lm(     M4.MovZ(-ds)),
];

const Ms = [
    M4.id, ExJ, ExK,
    DXp, DYp, DZp,
    DXn, DYn, DZn,
];

const [prev, curr] = [V4.new, V4.of(1,0,0,1)];

const N = 512;
for (let i=1; i<=N; ++i) {

    const t = i*(Calc.τ/N);
    const [c,s] = Calc.Geom.Sph.Exp(t);

    prev.copy(curr); curr.setXYZ(c, s, 0);
    
    for (let M of Ms) {
        const cc = M.ra(curr.dup.add([1,1,1,0]).sc(1/8)).setW(1);
        va.push([M.ra(prev), cc], [M.ra(curr), cc]);
    }
}

const geom = new Geometry("Geom", DefaultDemo, va);
geom.mode = 1;
geom.blend = 1;

{
    const txt = new Text("OrveylText", DefaultDemo);
    txt.lm(M4.RotI(-π/2), M4.RotJ(-π/2), M4.MovX(ds));
    txt.setSize(1, 1, 1/4).setOffset(-4.5);
    txt.setText("# ORVEYL #").commit();
}

{
    const txt = new Text("TutorialText", DefaultDemo);
    txt.lm(M4.RotI(-π/2), M4.RotJ(-π/2), M4.MovZ(+ds/3), M4.MovX(ds));
    txt.setSize(1, 1, 1/16).setOffset(-1);
    txt.setText("ADC").commit();
}

{
    const txt = new Text("TutorialText", DefaultDemo);
    txt.lm(M4.RotI(-π/2), M4.RotJ(-π/2), M4.MovZ(-ds/3), M4.MovX(ds));
    txt.setSize(1, 1, 1/32).setOffset(-12).setSpacing(2);
    txt.setText(
        "       WELCOME TO       ",
        " -- HYPERBOLIC SPACE -- ",
        "USE KEYBOARD TO NAVIGATE",
    ).commit();
}

{
    const txt = new Text("DemoListText", DefaultDemo);
    txt.lm(M4.RotI(-π/2), M4.MovZ(-ds));
    txt.setSize(1, 1, 1/16).setOffset(-11).setSpacing(3);
    txt.setText(
        "      -- DEMOS --      ",
        "<TRIGROUP>-@#",
        "  <NEBULA>-@#",
        " <POPPIES>-@#",
        " <FRACTAL>-@#",
    ).commit();

    const branches = txt.getBranches();
    branches[0].dest = "trigroup";
    branches[1].dest = "nebula&dX=0.78&dZ=0.78";
    branches[2].dest = "poppies";
    branches[3].dest = "fractal";

    for (let br of branches) {
        const sphere = new Sphere("Sphere", br, 1/10);
        const portal = new Scene("Portal", br);
        portal.triggered = false;

        const va = new VertexArray();
        for (let i = 0; i < 256; ++i) {
            const [pos, col] = [
                M4.rm(
                    M4.Euler(π*Rand.Sign(), Math.asin(Rand.Sign())),
                    M4.MovX(Rand.Unit()/8)
                ).Cw,
                V4.of(Rand.Unit(), Rand.Unit(), Rand.Unit(), 1),
            ];
            va.push([V4.w, V4.ones]);
            va.push([pos, col]);
        }
        
        const geom = new Geometry("PortalGeom", portal, va);
        geom.mode = 1;
        geom.blend = 1;

        const point = new Geometry("PortalGlow", portal, new VertexArray().push([V4.w, V4.ones]));
        point.mode = 0;
        point.blend = 1;

        const anim = new Ticker("Anim", portal, self => {
            self.parent.matrix.copy(M4.RotI(self.t));

            const pos = Orveyl.DefaultPlayer.world_from_local.Cw;
            if (pos) {
                const overlapped = sphere.test(pos);
                if (overlapped && !portal.triggered) {
                    portal.triggered = true;
                    window.location.assign(`/?demo=${br.dest}`);
                } else {
                    portal.triggered = overlapped;
                }
            }

        }).play();
    }
}

Scene.Manager.add(DefaultDemo).useIndex(0);