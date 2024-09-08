// adc :: gizmo.js

import { Scene } from "../scene.js";
import { Geometry } from "./geometry.js";
import { VertexArray } from "../../gpubuffer.js";
import { V4, M4 } from "../../math/vector.js";
import { SI } from "../../math/si.js";

export class Gizmo extends Scene {

    static DefaultVertexArray = undefined;
    static DefaultIndexArray = undefined;

    static InitDefaults(ds=SI.m_to_au(SI.Ref.length_m.human_height)) {
        const [w, x,y,z] = [V4.w, M4.MovX(ds).Cw, M4.MovY(ds).Cw, M4.MovZ(ds).Cw];

        Gizmo.DefaultVertexArray = new VertexArray().push(
            [w, V4.of(1,0,0,1).scXYZ(0.5)],
            [x, V4.of(1,0,0,1)],
            [w, V4.of(0,1,0,1).scXYZ(0.5)],
            [y, V4.of(0,1,0,1)],
            [w, V4.of(0,0,1,1).scXYZ(0.5)],
            [z, V4.of(0,0,1,1)],
            [x, V4.of(1,0.5,0,1)],
            [y, V4.of(0.5,1,0,1)],
            [y, V4.of(0,1,0.5,1)],
            [z, V4.of(0,0.5,1,1)],
            [z, V4.of(0.5,0,1,1)],
            [x, V4.of(1,0,0.5,1)],
        );
    
        Gizmo.DefaultIndexArray = [
            0,1, 2,3, 4,5,
            6,7, 8,9, 10,11,
        ];
    }
    
    constructor(name="Gizmo", parent=null) {
        super(name, parent);
        const geom = new Geometry(
            "GizmoGeom", this, Gizmo.DefaultVertexArray, Gizmo.DefaultIndexArray
        );
        geom.mode = 1;
    }
};