// adc :: default.js

import { Scene } from "../node/scene.js";
import { Geometry } from "../node/scene/geometry.js";
import { VertexArray } from "../gpubuffer.js";
import * as Calc from "../math/calc.js";
import { V4, M4 } from "../math/vector.js";

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

Scene.Manager.add(DefaultDemo).useIndex(0);