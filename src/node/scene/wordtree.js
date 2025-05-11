// adc :: wordtree.js

import { Scene } from "../scene.js";
import { Wrap, Rand } from "/src/math/calc.js";
import * as KB from "/src/math/knuthbendix.js";

export class Chamber extends Scene {

    static UseLabel = true;
    label(word) { if (Chamber.UseLabel) { this.name = word; } return this; }

    constructor(prev, fwd, rev, relativeTf) {
        super(null, relativeTf).attachTo(prev);
        this.adj = new Map();

        if (this.parent instanceof Chamber) {
            this.touch(this.parent, fwd, rev);
        }
    }

    touch(other, fwd, rev) {
        other?.adj.set(fwd, this);
        if (other) {
            this.adj.set(rev, other);
        } else {
            this.adj.delete(rev);
        }
        return this;
    }

    get back() {
        for (let [k,v] of this.adj) { if (v == this.parent) return k; }
        return null;
    }

    get from() {
        if (!(this.parent && this.parent instanceof Chamber)) return null;
        for (let [k,v] of this.adj) { if (v == this) return k; }
        return null;
    }

    thru(key) {
        return key.length ?
            this.adj.get(key.charAt(0))?.thru(key.slice(1)) ?? null :
            this;
    }

    prev(   ) {
        return (this.parent instanceof Chamber) ?
            this.parent :
            null;
    }

    next(key) {
        return key.length ?
            (this.children.has(this.adj.get(key.charAt(0)))) ?
                this.adj.get(key.charAt(0)).next(key.slice(1)) :
                null :
            this;
    }

    get neighbors() { return this.adj.values(); }
    get word() { return this.prev()?.word.concat("",this.back) ?? ""; }
}

export class WordTree extends Scene {
    constructor(name, sys, relativeTf=null) {
        super(name, relativeTf);

        this.sys = sys;
        Object.freeze(this.sys);

        this.weights = new Map();

        this.clear();
    }

    clear() {
        this.root?.detach();
        this.root = new Chamber(this, "", "").label("");
        this.count = 1;
    }

    find(word) {
        const w = this.sys.reduce(word);
        let here = this.root;
        for (let g of w) {
            if (here == null) break;
            here = here.next(g);
        }
        return here;
    }

    add(word, onAdd) {
        let added = null;
        const w = this.sys.reduce(word);

        let here = this.root;
        let path = "";
        for (let g of w) {
            path += g;

            const next = here.next(g);
            if (next) {
                here = next;
            } else {
                const [fwd, rev] = this.sys.pair(g);
                const relativeTf = this.sys.repr[g];

                here = new Chamber(here, fwd, rev, relativeTf).label(path);
                ++this.count;

                for (let gg of this.sys.gen) {
                    const adj = this.find(path+gg);
                    if (adj && adj != here) {
                        const [rev, fwd] = this.sys.pair(gg);
                        adj.touch(here, rev, fwd);
                    }
                }

                if (onAdd) onAdd(here);
                added = here;
            }
        }

        return added;
    }

    static Verbose = false;
    static VerboseLog(args) { if (WordTree.Verbose) console.log(args); }

    frontier() {
        const frontier = [];
        const q = [this.root];

        if (WordTree.Verbose) {
            console.time(`${this.name}.frontier`);
        }

        while (q.length) {
            const here = q.shift();
            q.unshift(...here.collect(ch => ch instanceof Chamber));
            if (here.adj.size < this.sys.gen.length) {
                frontier.unshift(here);
            }
        }

        if (WordTree.Verbose) {
            console.timeEnd(`${this.name}.frontier`);
        }

        return frontier;
    }

    frontierWords() {
        const frontier = this.frontier();
        let frontier_words = [];

        if (WordTree.Verbose) {
            console.time(`${this.name}.frontierWords`);
        }

        while (frontier.length) {
            let word = "";
            for (let here = frontier.shift(); here && here.back; here = here.prev()) {
                word = this.sys.invert(here.back) + word;
            }
            frontier_words.push(word);
        }

        if (WordTree.Verbose) {
            console.timeEnd(`${this.name}.frontierWords`);
        }

        return frontier_words;
    }

    expand(iters=1, onAdd=null) {
        let words = this.frontierWords();

        if (WordTree.Verbose) {
            console.groupCollapsed(`${this.name}.expand`);
            console.log(`Expanding to depth ${iters}...`);
            console.time(`${this.name}.expand`);
        }

        for (let i = 0; i < iters; ++i) {
            WordTree.VerboseLog(`${i}: ${words.length} words...`);
            const next_words = [];
            while (words.length) {
                const word = words.pop();
                for (let g of this.sys.gen) {
                    // TODO: PROPER weights lol
                    if (this.weights.has(g) && this.weights.get(g) < Rand.Unit()) continue;
                    if (g == this.sys.invert(word.charAt(word.length-1))) continue;
                    const wg = this.sys.reduce(word+g);
                    if (this.add(wg, onAdd)) {
                        next_words.push(wg);
                    }
                }
            }
            words = next_words;
        }

        if (WordTree.Verbose) {
            console.timeEnd(`${this.name}.expand`);
            console.groupEnd(`${this.name}.expand`);
        }

        return this;
    }

    orbit(word, seq, limit=16, onAdd=null) {
        const wrap = Wrap(seq.length);
        let here = word;
        let step = 0;
        do {
            this.add(here, onAdd);
            here = this.sys.reduce(here + seq.charAt(wrap(step++)));
        } while (here != word && step < limit);

        return this;
    }
}