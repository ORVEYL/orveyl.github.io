// adc :: tanh/common.js

import { Orveyl } from "/src/orveyl.js";

import * as Calc from "/src/math/calc.js"
import {
    Rand, π, τ,
} from "/src/math/calc.js";
import { SI } from "/src/math/si.js";

import { V4, B4, M4 } from "/src/math/vector.js";
import * as KB from "/src/math/knuthbendix.js";

import { Controller } from "/src/node/component/controller.js";
import { Orveyl3dController } from "/src/node/component/controllers/Orveyl3dController.js";
import { Ticker } from "/src/node/component/ticker.js";

import { Camera } from "/src/node/scene/camera.js";
import { Geometry } from "/src/node/scene/geometry.js";
import { Light } from "/src/node/scene/light.js";
import { IndexArray, VertexArray } from "/src/gpubuffer.js";

import { Sphere } from "/src/node/scene/shape.js";
import { Scene } from "/src/node/scene.js";
import { Chamber, WordTree } from "/src/node/scene/wordtree.js";

export const TanhSetup = (title) => {
    SI.m_per_au = 16;

    Orveyl.SetTitle(title);
    Orveyl.SetMaximized(true);
    Orveyl.SetImmersiveMode(true);

    const controller = 1 ? new WalkingController() : new Orveyl3dController;
    Orveyl.DefaultPlayer.attach(
        controller,
        new Light("PlayerLight", Light.Mode.Point, 0, 1, V4.gray(1/2)).attach(
            new Ticker("PlayerLightTicker", a=>{ a.parent.write(); }).play()
        )
    );
    
    //Camera.Manager.useIndex(1);

    Chamber.UseLabel = false;
};

const dump = here => {
    here.detach();

    if (here instanceof Scene) {
        here.matrix = here.cached_world_from_local = null;
    }

    if (here instanceof Geometry) {
        if (here.va) {
            for (let v of here.va) {
                v.pos = null;
                v.col = null;
                v.tex = null;
            }
        }
        if (here.vb) {
            here.vb.rawbuf = null;
            here.vb.u8buf = null;
            here.vb.gpubuf = null;
        }
        if (here.ib) {
            here.ib.rawbuf = null;
            here.ib.u8buf = null;
            here.ib.gpubuf = null;
        }
        here.va = here.vb = null;
        here.ia = here.ib = null;
        here.ob = null;
    }
    else if (here instanceof Light) {
        here.ob = null;
        here.lb = null;
    }
    else if (here instanceof WordTree) {
        here.root = null;
    }
    else if (here instanceof Chamber) {
        here.adj = null;
    }

    for (let ch of here.children) dump(ch);
}

export const sys83 = new KB.System(
    ["0", "1", "2", "3", "4", "5", "6", "7", "z", "Z"],
    ["0", "1", "2", "3", "4", "5", "6", "7", "z", "Z"],
    KB.Rule.Array(
        ["00"], ["11"], ["22"], ["33"], ["44"], ["55"], ["66"], ["77"], ["zz"], ["ZZ"],
        ["01".repeat(3)],
        ["12".repeat(3)],
        ["23".repeat(3)],
        ["34".repeat(3)],
        ["45".repeat(3)],
        ["56".repeat(3)],
        ["67".repeat(3)],
        ["70".repeat(3)],
    )
).complete();

{ // setup sys repr with {8,3} domain
    const [α, β, γ] = [π/3, π/8, π/2];
    const [Cα, Sα] = Calc.Geom.Sph.Exp(α);
    const [Cβ, Sβ] = Calc.Geom.Sph.Exp(β);

    const [Ca, Cb] = [Cα/Sβ, Cβ/Sα];
    const Cc = Ca*Cb;

    const [a, b, c] = [Ca, Cb, Cc].map(Calc.Geom.Hyp.CosInv);
    sys83.repr.a = a;
    sys83.repr.b = b;
    sys83.repr.c = c;

    const dα = sys83.repr.dα = M4.RotI(α);
    const dβ = sys83.repr.dβ = M4.RotI(β);
    const dγ = sys83.repr.dγ = M4.RotI(γ);

    const da = sys83.repr.da = M4.MovX(a);
    const db = sys83.repr.db = M4.MovX(b);
    const dc = sys83.repr.dc = M4.MovX(c);

    sys83.repr.di = [];
    sys83.repr.di[0] = M4.id;
    sys83.repr.di[1] = M4.RotI(2*β);
    sys83.repr.di[2] = M4.rm(sys83.repr.di[1], sys83.repr.di[1]);
    sys83.repr.di[3] = M4.rm(sys83.repr.di[1], sys83.repr.di[2]);
    sys83.repr.di[4] = M4.rm(sys83.repr.di[1], sys83.repr.di[3]);
    sys83.repr.di[5] = M4.rm(sys83.repr.di[1], sys83.repr.di[4]);
    sys83.repr.di[6] = M4.rm(sys83.repr.di[1], sys83.repr.di[5]);
    sys83.repr.di[7] = M4.rm(sys83.repr.di[1], sys83.repr.di[6]);

    sys83.repr.edges = [];
    sys83.repr.edges[0] = M4.rm(sys83.repr.di[0], da);
    sys83.repr.edges[1] = M4.rm(sys83.repr.di[1], da);
    sys83.repr.edges[2] = M4.rm(sys83.repr.di[2], da);
    sys83.repr.edges[3] = M4.rm(sys83.repr.di[3], da);
    sys83.repr.edges[4] = M4.rm(sys83.repr.di[4], da);
    sys83.repr.edges[5] = M4.rm(sys83.repr.di[5], da);
    sys83.repr.edges[6] = M4.rm(sys83.repr.di[6], da);
    sys83.repr.edges[7] = M4.rm(sys83.repr.di[7], da);

    sys83.repr.verts = [];
    sys83.repr.verts[0] = M4.rm(sys83.repr.edges[0], dγ, db);
    sys83.repr.verts[1] = M4.rm(sys83.repr.edges[1], dγ, db);
    sys83.repr.verts[2] = M4.rm(sys83.repr.edges[2], dγ, db);
    sys83.repr.verts[3] = M4.rm(sys83.repr.edges[3], dγ, db);
    sys83.repr.verts[4] = M4.rm(sys83.repr.edges[4], dγ, db);
    sys83.repr.verts[5] = M4.rm(sys83.repr.edges[5], dγ, db);
    sys83.repr.verts[6] = M4.rm(sys83.repr.edges[6], dγ, db);
    sys83.repr.verts[7] = M4.rm(sys83.repr.edges[7], dγ, db);

    sys83.repr.m = [];
    sys83.repr["0"] = sys83.repr.m[0] = M4.Refl(sys83.repr.edges[0].dup.T.Rx);
    sys83.repr["1"] = sys83.repr.m[1] = M4.Refl(sys83.repr.edges[1].dup.T.Rx);
    sys83.repr["2"] = sys83.repr.m[2] = M4.Refl(sys83.repr.edges[2].dup.T.Rx);
    sys83.repr["3"] = sys83.repr.m[3] = M4.Refl(sys83.repr.edges[3].dup.T.Rx);
    sys83.repr["4"] = sys83.repr.m[4] = M4.Refl(sys83.repr.edges[4].dup.T.Rx);
    sys83.repr["5"] = sys83.repr.m[5] = M4.Refl(sys83.repr.edges[5].dup.T.Rx);
    sys83.repr["6"] = sys83.repr.m[6] = M4.Refl(sys83.repr.edges[6].dup.T.Rx);
    sys83.repr["7"] = sys83.repr.m[7] = M4.Refl(sys83.repr.edges[7].dup.T.Rx);

    sys83.repr["z"] = M4.Refl(M4.MovZ(+1).T.Rz);
    sys83.repr["Z"] = M4.Refl(M4.MovZ(-1).T.Rz);
}

export const sys64 = new KB.System(
    ["0", "1", "2", "3", "4", "5", "z", "Z"],
    ["0", "1", "2", "3", "4", "5", "z", "Z"],
    KB.Rule.Array(
        ["00"], ["11"], ["22"], ["33"], ["44"], ["55"], ["zz"], ["ZZ"],
        ["01".repeat(2)],
        ["12".repeat(2)],
        ["23".repeat(2)],
        ["34".repeat(2)],
        ["45".repeat(2)],
        ["05".repeat(2)],
    )
).complete();

{ // setup sys repr with {6,4} domain
    const [α, β, γ] = [π/4, π/6, π/2];
    const [Cα, Sα] = Calc.Geom.Sph.Exp(α);
    const [Cβ, Sβ] = Calc.Geom.Sph.Exp(β);

    const [Ca, Cb] = [Cα/Sβ, Cβ/Sα];
    const Cc = Ca*Cb;

    const [a, b, c] = [Ca, Cb, Cc].map(Calc.Geom.Hyp.CosInv);
    sys64.repr.a = a;
    sys64.repr.b = b;
    sys64.repr.c = c;

    const dα = sys64.repr.dα = M4.RotI(α);
    const dβ = sys64.repr.dβ = M4.RotI(β);
    const dγ = sys64.repr.dγ = M4.RotI(γ);

    const da = sys64.repr.da = M4.MovX(a);
    const db = sys64.repr.db = M4.MovX(b);
    const dc = sys64.repr.dc = M4.MovX(c);

    sys64.repr.di = [];
    sys64.repr.di[0] = M4.id;
    sys64.repr.di[1] = M4.RotI(2*β);
    sys64.repr.di[2] = M4.rm(sys64.repr.di[1], sys64.repr.di[1]);
    sys64.repr.di[3] = M4.rm(sys64.repr.di[1], sys64.repr.di[2]);
    sys64.repr.di[4] = M4.rm(sys64.repr.di[1], sys64.repr.di[3]);
    sys64.repr.di[5] = M4.rm(sys64.repr.di[1], sys64.repr.di[4]);

    sys64.repr.edges = [];
    sys64.repr.edges[0] = M4.rm(sys64.repr.di[0], da);
    sys64.repr.edges[1] = M4.rm(sys64.repr.di[1], da);
    sys64.repr.edges[2] = M4.rm(sys64.repr.di[2], da);
    sys64.repr.edges[3] = M4.rm(sys64.repr.di[3], da);
    sys64.repr.edges[4] = M4.rm(sys64.repr.di[4], da);
    sys64.repr.edges[5] = M4.rm(sys64.repr.di[5], da);

    sys64.repr.verts = [];
    sys64.repr.verts[0] = M4.rm(sys64.repr.edges[0], dγ, db);
    sys64.repr.verts[1] = M4.rm(sys64.repr.edges[1], dγ, db);
    sys64.repr.verts[2] = M4.rm(sys64.repr.edges[2], dγ, db);
    sys64.repr.verts[3] = M4.rm(sys64.repr.edges[3], dγ, db);
    sys64.repr.verts[4] = M4.rm(sys64.repr.edges[4], dγ, db);
    sys64.repr.verts[5] = M4.rm(sys64.repr.edges[5], dγ, db);

    sys64.repr.m = [];
    sys64.repr["0"] = sys64.repr.m[0] = M4.Refl(sys64.repr.edges[0].dup.T.Rx);
    sys64.repr["1"] = sys64.repr.m[1] = M4.Refl(sys64.repr.edges[1].dup.T.Rx);
    sys64.repr["2"] = sys64.repr.m[2] = M4.Refl(sys64.repr.edges[2].dup.T.Rx);
    sys64.repr["3"] = sys64.repr.m[3] = M4.Refl(sys64.repr.edges[3].dup.T.Rx);
    sys64.repr["4"] = sys64.repr.m[4] = M4.Refl(sys64.repr.edges[4].dup.T.Rx);
    sys64.repr["5"] = sys64.repr.m[5] = M4.Refl(sys64.repr.edges[5].dup.T.Rx);

    sys64.repr["z"] = M4.Refl(M4.MovZ(+sys64.repr.b).T.Rz);
    sys64.repr["Z"] = M4.Refl(M4.MovZ(-sys64.repr.b).T.Rz);
}

export class WalkingController extends Controller {

    constructor () {
        super("WalkingController");
        this.pitch = 0;
        this.sprint = false;

        this.altitude = 0;
        this.height = SI.m_to_au(SI.Ref.length_m.human_height);
    }

    update(input, dt) {
        if (input.tick("buttonBack") == 1) {
            dump(Scene.Manager.active);
            window.location.replace(`/?tanh`);
        }

        const [dx, dy] = [
            input.cmp("x+", "x-") - input.curr("analogLy"),
            input.cmp("y+", "y-") - input.curr("analogLx"),
        ];

        const ds = B4.of(
            input.cmp("i+", "i-") - input.curr("analogRx"), 0, 0,
            dx, dy, 0,
        ).sc(dt/1000);

        if (input.curr("analogLc")) {
            this.sprint = true;
        } else if (dx == 0 && dy == 0){
            this.sprint = false;
        }

        ds.scFlux(4*SI.m_to_au(SI.Ref.speed_mps.human_walking));
        if (this.sprint) ds.scFlux(6.0);

        ds.scFlux(1 / Math.cosh(this.altitude));

        Orveyl.DefaultPlayer.rm(ds.exp());

        const dj = input.cmp("j+", "j-") + input.curr("analogRy");
        this.pitch = Calc.Clamp(-π/2, +π/2)(this.pitch + dj*dt/1000);

        const look = M4.rm(
            M4.MovZ(this.height + this.altitude),
            M4.RotJ(this.pitch),
        );
        Orveyl.DefaultCamera.setRelative(look);
    }
};

export class Ribbon extends Geometry {
    constructor (name="Ribbon", Nsteps, Rsteps=1, symm=true,
        Fs=(t) => M4.MovX(SI.au_per_m),
        Fo=(t) => M4.id,
        Fr=(t) => M4.MovY(SI.au_per_m),
        Fc=(t,u) => V4.rgb(t-u,+u,-u),
        Fm=(i,j) => true,
    ) {
        super(name, new VertexArray(), new IndexArray());
        this.setMode(2);

        const push_side = (i, t, Mo, Mr) => {
            const Mm = M4.rm(M, Mo);
            const k = 2*Rsteps;
            for (let j = 0; j < Rsteps; ++j) {
                this.va.push(
                    [M4.rm(Mm).Cw, Fc(t,j/Rsteps)],
                    [M4.rm(Mm,Mr).Cw, Fc(t,(j+1)/Rsteps)],
                );
                
                if (Fm(i,j)) {
                    this.ia.push(0, 1, k);
                    if (i != Nsteps) this.ia.push(k, k+1, 1); 
                }
                this.ia.base += 2;
                Mm.rm(Mr);
            }
        }

        const push_symm = (i, t, Mo, Mr) => {
            const MrT = Mr.dup.T;
            const Mp = M4.rm(M, Mo);
            const Mn = Mp.dup;
            const k = 4*Rsteps;
            for (let j = 0; j < Rsteps; ++j) {
                this.va.push(
                    [M4.rm(Mp).Cw, Fc(t,j/Rsteps)],
                    [M4.rm(Mp,Mr).Cw, Fc(t,(j+1)/Rsteps)],
                    [M4.rm(Mn).Cw, Fc(t,-j/Rsteps)],
                    [M4.rm(Mn,MrT).Cw, Fc(t,-(j+1)/Rsteps)],
                );

                if (Fm(i,j)) {
                    this.ia.push(0, 1, k, 2, 3, k+2);
                    if (i != Nsteps) this.ia.push(k, k+1, 1, k+2, k+3, 3); 
                }
                this.ia.base += 4;
                Mp.rm(Mr);
                Mn.rm(MrT);
            }
        }

        const push = symm ? push_symm : push_side;
        const M = M4.id;
        for (let i = 0; i <= Nsteps; ++i) {
            const t = i / Nsteps;
            push(i, t, Fo(t), Fr(t));
            M.lm(Fs(t));
        }

        this.write();
    }
};

export class Tube extends Geometry {
    constructor (name="Tube", Nsteps, Ncount,
        Fs=(t) => M4.MovX(SI.au_per_m),
        Fo=(t) => M4.id,
        Fr=(t,u) => M4.MovY(SI.au_per_m),
        Ft=(t,u) => M4.RotK(τ*u),
        Fc=(t,u) => V4.rgb(t,u,0.5),
        Fm=(i,j) => true,
    ) {
        super(name, new VertexArray(), new IndexArray());
        this.setMode(2);

        const k = 2*Ncount;
        const push = (i,t) => {
            const Mm = M4.rm(M, Fo(t));
            for (let j = 0; j < Ncount; ++j) {
                const u0 = j/Ncount;
                const u1 = (j+1)/Ncount;
                
                const Mn0 = M4.rm(Mm, Ft(t,u0), Fr(t,u0));
                const Mn1 = M4.rm(Mm, Ft(t,u1), Fr(t,u1));
                
                this.va.push(
                    [Mn0.Cw, Fc(t,u0)],
                    [Mn1.Cw, Fc(t,u1)],
                );
                
                if (Fm(i,j)) {
                    this.ia.push(0, 1, k);
                    if (i != Nsteps) this.ia.push(k, k+1, 1); 
                }
                this.ia.base += 2;
            }
        }

        const M = M4.id;
        for (let i = 0; i <= Nsteps; ++i) {
            const t = i / Nsteps;
            push(i,t);
            M.lm(Fs(t));
        }

        this.write();
    }
};

export class Portal extends Sphere {
    constructor(name="Portal", dst, radius=SI.m_to_au(2.5)) {
        super(name, radius);

        this.spinner = new Scene("PortalSpinner").attachTo(this);
        this.dst = dst;
        this.triggered = false;

        this.attach(
            new Ticker("PortalTicker", anim => {
                this.test(Orveyl.DefaultPlayer.world_from_local.Cw);
                this.spinner.setRelative(M4.RotI(anim.t));
            }).play()
        )
    }

    test(pos) {
        if (!pos) return false;

        const overlapped = super.test(pos);
        if (overlapped && !this.triggered) {
            this.triggered = true;
            dump(Scene.Manager.active);
            window.location.replace(`/?tanh&w=${this.dst}`);
        } else {
            this.triggered = overlapped;
        }

        return overlapped;
    }
}