// adc :: scene.js

import { Transform } from "./component/transform.js";
import { Manager } from "./system/manager.js";

class SceneManager extends Manager {

    onChanged(prev, curr) {
        curr?.populate();
    }

};

export class Scene extends Transform {

    static Manager = new SceneManager();

    static BreadcrumbRoot = new Scene("BreadcrumbRoot");
    static Breadcrumb = null;

    constructor(name="Scene", parent=null, relativeTf) {
        super(name, parent, relativeTf);
        this.visible = true;

        this.onPopulate = null;
    }

    async populate() {
        if (this.onPopulate) {
            console.log(`Populating lazy scene: ${this.name}`);
            await this.onPopulate(this);
            this.onPopulate = null;
        }
    }

};