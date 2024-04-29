// adc :: input.js

// TODO: https://gamepad-tester.com/for-developers

class InputAction {
    constructor (name) {
        this.name = name;
        this.prev = 0;
        this.curr = 0;
        this.time = 0;
        this.tick = 0;
    }

    update(dt) {
        this.prev = this.curr;

        if (this.curr) {
            this.time += dt;
            ++this.tick;
        } else {
            this.time = this.tick = 0;
        }
    }
};

export class KeyboardAction extends InputAction {
    constructor (name) {
        super(name);
    }
};

export class GamepadAction extends InputAction {
    constructor (name, axis) {
        super(name);
        this.axis = axis;
    }

    update(dt) {
        this.prev = this.curr;

        for (const gp of Input.Gamepads || []) {
            if (!gp) continue;

            this.curr = this.read(gp);
            if (Math.abs(this.curr) > 0.1) {
                this.time += this.curr * dt;
                ++this.tick;
            } else {
                this.curr = 0;
                this.time = this.tick = 0;
            }

            break;
        }
    }

    read(gp) {
        switch(this.axis) {
            case Input.Gamepad.LX: return gp.axes[0];
            case Input.Gamepad.LY: return gp.axes[1];
            case Input.Gamepad.RX: return gp.axes[2];
            case Input.Gamepad.RY: return gp.axes[3];

            case Input.Gamepad.LZ: return gp.buttons[6].value;
            case Input.Gamepad.RZ: return gp.buttons[7].value;

            case Input.Gamepad.LC: return gp.buttons[10].value;
            case Input.Gamepad.RC: return gp.buttons[11].value;

            case Input.Gamepad.LB: return gp.buttons[4].value;
            case Input.Gamepad.RB: return gp.buttons[5].value;
        }
        return 0;
    }
};

export class Input {
    static Key = Object.freeze({
        CANCEL: 3,
        HELP: 6,
        BACKSPACE: 8,
        TAB: 9,
        CLEAR: 12,
        RETURN: 13,
        ENTER: 14,
        SHIFT: 16,
        CONTROL: 17,
        ALT: 18,
        PAUSE: 19,
        CAPS_LOCK: 20,
        ESCAPE: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        PRINTSCREEN: 44,
        INSERT: 45,
        DELETE: 46,
        NUM0: 48,
        NUM1: 49, NUM2: 50, NUM3: 51,
        NUM4: 52, NUM5: 53, NUM6: 54,
        NUM7: 55, NUM8: 56, NUM9: 57,
        SEMICOLON: 59,
        EQUALS: 61,
        A: 65, B: 66, C: 67, D: 68, E: 69,
        F: 70, G: 71, H: 72, I: 73, J: 74,
        K: 75, L: 76, M: 77, N: 78, O: 79,
        P: 80, Q: 81, R: 82, S: 83, T: 84,
        U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
        CONTEXT_MENU: 93,
        NUMPAD0: 96,
        NUMPAD1: 97,  NUMPAD2: 98,  NUMPAD3: 99,
        NUMPAD4: 100, NUMPAD5: 101, NUMPAD6: 102,
        NUMPAD7: 103, NUMPAD8: 104, NUMPAD9: 105,
        MULTIPLY: 106,
        ADD: 107,
        SEPARATOR: 108,
        SUBTRACT: 109,
        DECIMAL: 110,
        DIVIDE: 111,
         F1: 112,  F2: 113,  F3: 114,  F4: 115,  F5: 116,  F6: 117,
         F7: 118,  F8: 119,  F9: 120, F10: 121, F11: 122, F12: 123,
        F13: 124, F14: 125, F15: 126, F16: 127, F17: 128, F18: 129,
        F19: 130, F20: 131, F21: 132, F22: 133, F23: 134, F24: 135,
        NUM_LOCK: 144,
        SCROLL_LOCK: 145,
        EQUAL: 187,
        COMMA: 188,
        MINUS: 189,
        PERIOD: 190,
        SLASH: 191,
        BACK_QUOTE: 192,
        OPEN_BRACKET: 219,
        BACK_SLASH: 220,
        CLOSE_BRACKET: 221,
        QUOTE: 222,
        META: 224
    });

    static Gamepad = Object.freeze({
        LX: 1000,
        LY: 1001,
        RX: 1002,
        RY: 1003,

        LZ: 2000,
        RZ: 2001,

        LC: 2010,
        RC: 2011,

        LB: 3000,
        RB: 3001,
    });

    static KeyState = new Set();

    static Instances = new Set();

    static OnKeyDown(e) {
        Input.KeyState.add(e.keyCode);

        for (const i of Input.Instances) {
            const action = i.actions_by_key[e.keyCode];
            if (action !== undefined) {
                // TODO: support for binding key chords?
                action.curr = 1;
            }
        }
    }

    static OnKeyUp(e) {
        Input.KeyState.delete(e.keyCode);

        for (const i of Input.Instances) {
            const action = i.actions_by_key[e.keyCode];
            if (action !== undefined) {
                const bindings = i.bindings[action.name];
                if (!bindings.some(x => Input.KeyState.has(x))) {
                    action.curr = 0;
                }
            }
        }
    }

    static Gamepads = null;

    static OnGamepadConnected(e) {
        console.log("A gamepad connected:");
        Input.Gamepads = navigator.getGamepads();
        console.log(Input.Gamepads);
    }

    static OnGamepadDisconnected(e) {
        console.log("A gamepad disconnected:");
        Input.Gamepads = navigator.getGamepads();
        console.log(Input.Gamepads);
    }

    static {
        window.addEventListener("keydown", Input.OnKeyDown, false);
        window.addEventListener("keyup", Input.OnKeyUp, false);

        window.addEventListener("gamepadconnected", Input.OnGamepadConnected);
        window.addEventListener("gamepaddisconnected", Input.OnGamepadDisconnected);
    }

    constructor (handler) {
        this.handler = handler;

        this.actions = [];
        this.actions_by_key = {};

        this.bindings = {};

        Input.Instances.add(this);
    }

    addKeyboardAction(action_name, bindings) {
        const action = new KeyboardAction(action_name);
        this.actions.push(action);

        this.bindings[action_name] = [...bindings];
        for (const key of this.bindings[action_name]) {
            this.actions_by_key[key] = action;
        }
    }

    addGamepadAction(action_name, axis) {
        const action = new GamepadAction(action_name, axis);
        this.actions.push(action);
    }

    get(action_name) {
        return this.actions.find(x => x.name == action_name);
    }

    set(action_name, curr) {
        return (this.actions_by_key[this.bindings[action_name]].curr = curr);
    }

    curr(action_name) {
        const action = this.get(action_name);
        return action ? action.curr : false;
    }

    prev(action_name) {
        const action = this.get(action_name);
        return action ? action.prev : false;
    }

    time(action_name) {
        const action = this.get(action_name);
        return action ? action.time : 0;
    }

    tick(action_name) {
        const action = this.get(action_name);
        return action ? action.tick : 0;
    }

    cmp(action0, action1) {
        const [a, b] = [this.tick(action0), this.tick(action1)];
        return (a==0 && b > 0) ? -1 :
        (b==0 && a > 0) ? +1 :
        (b < a) ? -1 :
        (a < b) ? +1 :
        0;
    }

    update(dt=1) {
        Input.Gamepads = navigator.getGamepads();

        for (const action of this.actions) {
            action.update(dt);
        }

        if (this.handler) {
            this.handler(this, dt);
        }
    }
}