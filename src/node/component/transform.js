// adc :: transform.js

import { Component } from "../component.js";
import { M4 } from "../../math/vector.js";

import { NodePath } from "../node.js";

export class Transform extends Component {
    constructor(name=null, parent=null, relativeTf) {
        super(name, parent);

        this.matrix = relativeTf ?? M4.id;
        //this.cached_world_from_local = M4.id;
    }

    static GetMatrix = tf => tf.matrix;
    static GetMatrixTransposed = tf => tf.matrix.dup.T;

    get world_from_local() {
        if (!this.matrix) return this.parent ? this.parent.world_from_local : M4.id;
        return this.parent ?
            this.matrix.dup.lm(this.parent.world_from_local) :
            this.matrix.dup;
    }

    get local_from_world() {
        return this.world_from_local.T;
    }

    setRelative(relativeTf) { this.matrix = relativeTf; return this; }
    lm(...Ls) { this.matrix.lm(...Ls); return this; }
    lmR(...Ls) { this.matrix.lmR(...Ls); return this; }
    lc(...Ls) { this.matrix.lc(...Ls); return this; }
    rm(...Rs) { this.matrix.rm(...Rs); return this; }
    rmR(...Rs) { this.matrix.rmR(...Rs); return this; }
    rc(...Rs) { this.matrix.rc(...Rs); return this; }

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

};