// adc :: node.js

export class Node {

    constructor(name=null, parent=null) {
        if (name) this.name = name;
        this.parent = null;
        this.children = new Set();

        parent?.attach(this);
    }

    attach(...children) {
        for (let ch of children) {
            ch.detach();
            ch.parent = this;
            this.children.add(ch);
        }

        return this;
    }

    detach() {
        this.parent?.children.delete(this);
        this.parent = null;
        return this;
    }

    inject(parent) {
        this.parent?.attach(parent);
        parent.attach(this);
        return this;
    }

    extract() {
        this.parent.attach(...this.children);
        return this;
    }

    collect(pred) {
        return (pred === undefined) ?
            [...this.children] :
            [...this.children].filter(pred);
    }

    reject(pred) {
        const nodes = this.collect(pred);
        for (let ch of nodes) {
            ch.detach();
        }
        return nodes;
    }

    path() { return new NodePath(this); }

    static IntersectPaths = (As, Bs) => As.find(a => Bs.find(b => a===b));

    lca(other) { // lowest common ancestor
        return (new NodePath(this, other)).lca;
    }

    relation(other) {
        return (new NodePath(this, other)).relation;
    }

};

// TODO: check breadcrumb logic -- some NaNs popping up
export class NodePath {

    constructor (src, dst=null) {

        const src_to_root = [];
        let here = src;
        while (here) {
            src_to_root.push(here);
            here = here.parent;
        }

        if (dst) {
            const dst_to_root = [];
            here = dst;
            while (here) {
                dst_to_root.push(here);
                here = here.parent;
            }

            const lca = src_to_root.find(a => dst_to_root.find(b => a===b))
            console.assert(lca != null, `No NodePath between nodes:\n${src}\n${dst}`);

            const src_to_lca = src_to_root.slice(0, src_to_root.indexOf(lca));
            const lca_to_dst = dst_to_root.slice(0, dst_to_root.indexOf(lca)).reverse();

            this.relation = [
                src_to_lca,
                lca,
                lca_to_dst,
            ];
        } else {
            this.relation = [
                src_to_root.slice(0, -1),
                src_to_root[src_to_root.length-1],
                [],
            ];
        }

        Object.freeze(this.relation);
    }

    get ascent() { return this.relation[0]; }
    get lca() { return this.relation[1]; }
    get descent() { return this.relation[2]; }

};