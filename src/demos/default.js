// adc :: default.js

import { Scene } from "../node/scene.js";
import { Geometry } from "../node/scene/geometry.js";
import { VertexArray } from "../gpubuffer.js";
import * as Calc from "../math/calc.js";
import { π, Rand } from "../math/calc.js";
import { V4, M4, Complex } from "../math/vector.js";

import * as KB from "../math/knuthbendix.js";
import { WordTree } from "../node/scene/wordtree.js";

import { Text } from "../node/scene/text.js";
import { Ticker } from "../node/component/ticker.js"
import { Sphere } from "../node/scene/shape.js";

Orveyl.Menu.innerHTML = [
`<q>Out of nothing, I have created a strange new universe.</q> -- János Bolyai`,
``,
`orveyl.js is a 3D Non-Euclidean WebGPU Renderer,`,
`and work-in-progress hobby project of adc.`,
``,

`<details>
    <summary>:: Controls ::</summary>
    <ul>
        <table>
            <tr>
                <th>Action
                <th>Keyboard
                <th>Gamepad
            <tr style="color:#f88">
                <td>Move Forward / Backward
                <td>W / S
                <td>Left Analog Stick
            <tr style="color:#8f8">
                <td>Move Left / Right
                <td>A / D
                <td>Left Analog Stick
            <tr style="color:#88f">
                <td>Move Up / Down
                <td>R / F
                <td>Left / Right Trigger
            <tr style="color:#ff8">
                <td>Rotate Left / Right
                <td>← / →
                <td>Right Analog Stick
            <tr style="color:#f8f">
                <td>Rotate Up / Down
                <td>↑ / ↓
                <td>Right Analog Stick
            <tr style="color:#8ff">
                <td>Roll CCW / CW
                <td>Q / E
                <td>L / R Shoulder
            <tr>
                <td>Place Marker
                <td>Space
            <tr>
                <td>Remove Marker
                <td>Shift + Space
            <tr>
                <td>Teleport to<br>Scene Origin
                <td>Home
            <tr>
                <td>Teleport to<br>Last Marker
                <td>Shift + Home
            <tr>
                <td>Download Canvas as PNG
                <td>Backslash \\
            <tr>
                <td>Toggle "Immersive Mode"
                <td>Alt + Enter
        </table>
    </ul>
</details>`,
].join("<br>");

export const DefaultDemo = new Scene("DefaultDemo");

const ds = Calc.Geom.Hyp.CosInv(Calc.ϕ);

function PentaNet() {
    const sys = new KB.System(
        ["0", "1", "2", "3", "4"],
        ["0", "1", "2", "3", "4"],
        KB.Rule.Array(
            ["00"], ["11"], ["22"], ["33"], ["44"],
            ["01".repeat(2)],
            ["12".repeat(2)],
            ["23".repeat(2)],
            ["34".repeat(2)],
            ["04".repeat(2)],
        )
    ).complete();

    const dX = M4.MovX(ds);
    const di = M4.RotI(π/2);
    const T = M4.lm(di, dX).T;
    sys.repr["0"] = M4.Refl(M4.lm().Rx);
    sys.repr["1"] = M4.Refl(M4.lm(T).Rx);
    sys.repr["2"] = M4.Refl(M4.lm(T,T).Rx);
    sys.repr["3"] = M4.Refl(M4.lm(T,T,T).Rx);
    sys.repr["4"] = M4.Refl(M4.lm(T,T,T,T).Rx);
    
    const eps = 1e-2;
    const P = M4.Transport(eps, eps, 0);
    const Z = M4.MovZ(-16);
    const cc = V4.ones.scXYZ(1/6);
    const va = new VertexArray();
    const template = new VertexArray().push(
        [P.Cw, cc], [P.dup.rm(Z).Cw, V4.w], [P.Cw, cc], [P.lm(T).Cw, cc],
        [P.Cw, cc], [P.dup.rm(Z).Cw, V4.w], [P.Cw, cc], [P.lm(T).Cw, cc],
        [P.Cw, cc], [P.dup.rm(Z).Cw, V4.w], [P.Cw, cc], [P.lm(T).Cw, cc],
        [P.Cw, cc], [P.dup.rm(Z).Cw, V4.w], [P.Cw, cc], [P.lm(T).Cw, cc],
        [P.Cw, cc], [P.dup.rm(Z).Cw, V4.w], [P.Cw, cc], [P.lm(T).Cw, cc],
    );

    const wt = new WordTree("WordTree240314", sys).attachTo(DefaultDemo);
    WordTree.Verbose = true;
    wt.onPopulate = async self => {
        const onAdd = here => {
            const M = here.world_from_local;

            let i = 0;
            for (let v of template) {
                va.push([M.ra(v.pos), v.col]);
            }
        };

        onAdd(wt.root);
        wt.expand(6, onAdd);

        new Geometry("Mesh", va).attachTo(wt)
        .setMode(1).setBlend(1)
        .lm(M4.RotJ(-π/2), M4.MovX(ds));
    }

    return wt;
}
const wt = PentaNet().populate();

{
    new Text("OrveylText").attachTo(DefaultDemo)
    .setRelative(M4.lm(M4.RotI(-π/2), M4.RotJ(-π/2), M4.MovX(ds)))
    .setSize(1, 1, 1/4).setOffset(-4.5)
    .setText("# ORVEYL #").commit();
    
    new Text("ADC").attachTo(DefaultDemo)
    .setRelative(M4.lm(M4.RotI(-π/2), M4.RotJ(-π/2), M4.MovZ(+ds/3), M4.MovX(ds)))
    .setSize(1, 1, 1/16).setOffset(-1)
    .setText("ADC").commit();
    
    new Text("TutorialText").attachTo(DefaultDemo)
    .setRelative(M4.lm(M4.RotI(-π/2), M4.RotJ(-π/2), M4.MovZ(-ds/3), M4.MovX(ds)))
    .setSize(1, 1, 1/32).setOffset(-12).setSpacing(2)
    .setText(
        "       WELCOME TO       ",
        " -- HYPERBOLIC SPACE -- ",
        "USE KEYBOARD TO NAVIGATE",
    ).commit();

    const list_txt = new Text("DemoListText").attachTo(DefaultDemo)
    .setRelative(M4.lm(M4.RotI(-π/2), M4.RotJ(-π/2), M4.MovZ(-ds), M4.MovX(ds)))
    .setSize(1, 1, 1/16).setOffset(-11).setSpacing(2.83)
    .setText(
        "      -- DEMOS --      ",
        " <TERRAIN>-@#",
        "<TRIGROUP>-@#",
        " <FRACTAL>-@#",
        "  <FLORAL>-@#",
        " <POPPIES>-@#",
        "  <NEBULA>-@#",
    ).commit();

    const branches = list_txt.getBranches();
    branches[0].dest = "terrain";
    branches[1].dest = "trigroup";
    branches[2].dest = "fractal";
    branches[3].dest = "floral";
    branches[4].dest = "poppies";
    branches[5].dest = "nebula";

    for (let br of branches) {
        const sphere = new Sphere("Sphere", 1/10).attachTo(br);
        const portal = new Scene("Portal").attachTo(br);
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

        new Geometry("PortalGlow",
            new VertexArray().push([V4.w, V4.ones])
        ).attachTo(portal)
        .setMode(0).setBlend(1);
        
        new Geometry("PortalGeom", va).attachTo(portal)
        .setMode(1).setBlend(1)
        .attach(
            new Ticker("Anim", self => {
                self.parent.setRelative(M4.RotI(self.t));
    
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
    
            }).play()
        );
    }
}

{
    const Rs = [M4.RotI, M4.RotJ, M4.RotK];
    const C = Rand.Gauss(0.8)(0.1);
    for (let n = 0; n < 3*8; ++n) {
        const star_va = new VertexArray();
        for (let i = 0; i < 256; ++i) {
            const [θ,φ] = [π*Rand.Sign(), Math.asin(Rand.Sign())];
            star_va.push(
                [
                    M4.rm(M4.Euler(θ,φ), M4.MovX(1+4*Rand.Sqrt())).Cw,
                    V4.of(C(), C(), C(), 1),
                ]);
        }

        new Geometry(`Stars${n}`, star_va).attachTo(DefaultDemo)
        .setMode(0).setBlend(1)
        .attach(
            new Ticker("Anim", self => {
                self.parent.setRelative(Rs[n%3](self.t));
            }).play(1/60 * Rand.Sign())
        );
    }

    const f2reφ = π/2*Rand.Sign();
    const f2imφ = π/2*Rand.Sign();
    const f7absA = 0.2*Rand.Choice(+1, -1)();
    const f7argω = Rand.Choice(+1, -1)();
    const lz = Calc.Max(0);

    const sky_anim = new Ticker("SkyAnim", self => {
        Orveyl.SetSkyComplex(
            -120, 6,
            [
                1,0, 0,0,
                //...Complex.polar(1, self.t), 0,0,
                0,0, 1,0,
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
    }).attachTo(DefaultDemo).play(1/10)
}

Scene.Manager.add(DefaultDemo).useIndex(0);