// adc :: transform.js

import { Component } from "../component.js";
import { M4 } from "../../math/vector.js";

import { NodePath } from "../node.js";

export class Transform extends Component {
    constructor(name=null, relativeTf) {
        super(name);
        this.matrix = relativeTf ?? M4.id;
        this.cached_world_from_local = null;
    }

    static GetMatrix = tf => tf.matrix;
    static GetMatrixTransposed = tf => tf.matrix.dup.T;

    get world_from_local() {
        //if (this.cached_world_from_local) return this.cached_world_from_local; // TODO: FIX THIS!!!!

        if (!this.matrix) return this.parent ? this.parent.world_from_local : M4.id;

        this.cached_world_from_local = this.parent ?
            this.matrix.dup.lm(this.parent.world_from_local) :
            this.matrix;

        return this.cached_world_from_local.dup;
    }

    get local_from_world() {
        return this.world_from_local.T;
    }

    invalidate() {
        this.collect(ch => ch instanceof Transform).forEach(ch => ch.invalidate());
        this.cached_world_from_local = null;
        return super.invalidate();
    }

    setRelative(relativeTf) { this.matrix.copy(relativeTf); return this.invalidate(); }
    lm (...Ls) { this.matrix.lm (...Ls); return this.invalidate(); }
    lmR(...Ls) { this.matrix.lmR(...Ls); return this.invalidate(); }
    lc (...Ls) { this.matrix.lc (...Ls); return this.invalidate(); }
    rm (...Rs) { this.matrix.rm (...Rs); return this.invalidate(); }
    rmR(...Rs) { this.matrix.rmR(...Rs); return this.invalidate(); }
    rc (...Rs) { this.matrix.rc (...Rs); return this.invalidate(); }

    other_from_local(other) {
        const path = new NodePath(this, other);
        return M4.lm(
            ...path.ascent.map(Transform.GetMatrix),
            path.lca.matrix,
            ...path.descent.map(Transform.GetMatrixTransposed),
        );
    }

    local_from_other(other) {
        return this.other_from_local(other).T;
    }

    attachTo(parent, relative) {
        if (relative) this.setRelative(relative);
        return super.attachTo(parent);
    }

};