import { Controller } from "../controller.js";

import { B4 } from "../../../math/vector.js";
import { Geom } from "../../../math/calc.js";

export class Orveyl3dController extends Controller {
    update(input, dt) {
        //return;

        const ds = B4.of(
            input.cmp("i+", "i-") - input.curr("analogRx"),
            input.cmp("j+", "j-") + input.curr("analogRy"),
            input.cmp("k+", "k-") - input.curr("analogLb") + input.curr("analogRb"),
            input.cmp("x+", "x-") - input.curr("analogLy"),
            input.cmp("y+", "y-") - input.curr("analogLx"),
            input.cmp("z+", "z-") -(input.curr("analogRz") - input.curr("analogLz")),
        ).sc(dt/1000);

        if (input.tick("analogRc")) ds.scSpin(3.0);
        if (input.tick("analogLc")) ds.scFlux(3.0);
        if (Geom.Sig > 0) ds.scFlux(-1);

        if (this.parent?.flux_scale) {
            ds.scFlux(this.parent?.flux_scale);
        }

        this.parent?.rm(ds.exp());
    }
};