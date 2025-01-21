import { Controller } from "../controller.js";

import { Orveyl } from "../../../orveyl.js";
import { Scene } from "../../scene.js";
import { Camera } from "../../scene/camera.js";

// handles system & debug inputs
export class OrveylDefaultController extends Controller {
    update(input, dt) {
    
        if (input.tick("sceneIndex-") == 1) Scene.Manager.usePrev();
        if (input.tick("sceneIndex+") == 1) Scene.Manager.useNext();

        if (input.tick("screenshot") == 1) {
            const link = document.createElement("a");
            link.download = `orveyl_${Date.now()}.png`;
            link.href = Orveyl.Canvas
                .toDataURL("image/png")
                .replace("image/png", "image/octet-stream");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        if (input.curr("alt")) {
            if (input.tick("enter") == 1) Orveyl.ToggleImmersiveMode();
        }

        if (input.curr("shift")) {
            if (input.tick("camReset") == 1) {
                if (Scene.Breadcrumb) {
                    Controller.Manager.active?.parent?.matrix?.copy(
                        Scene.Breadcrumb.world_from_local
                    );
                } else this.resetParentTransform();
            }

            if (input.tick("space") == 1) this.delBreadcrumb();
        } else {
            if (input.tick("camReset") == 1) this.resetParentTransform();
            if (input.tick("camIndex-") == 1) Camera.Manager.usePrev();
            if (input.tick("camIndex+") == 1) Camera.Manager.useNext();
            if (input.tick("space") == 1) this.addBreadcrumb();
        }

        this.parent?.invalidate();
    }

    resetParentTransform() {
        this.parent?.matrix?.id;
        this.parent?.invalidate();
    }

    addBreadcrumb() {
        const prev = Scene.Breadcrumb ?? Scene.BreadcrumbRoot;

        Scene.Breadcrumb = new Scene(
            Rand.HexId(2)(),
            prev.local_from_other(this.parent)
        ).attachTo(prev);

        if (Orveyl.InitBreadcrumb) Orveyl.InitBreadcrumb(Scene.Breadcrumb);
        console.log("Added breadcrumb: ", Scene.Breadcrumb);
    }

    delBreadcrumb() {
        if (!Scene.Breadcrumb) return;

        const old = Scene.Breadcrumb;
        Scene.Breadcrumb = old?.parent;
        old?.detach();
        
        if (Scene.Breadcrumb == Scene.BreadcrumbRoot) {
            Scene.Breadcrumb = null;
        }

        console.log("Selected breadcrumb:", Scene.Breadcrumb);
    }
};