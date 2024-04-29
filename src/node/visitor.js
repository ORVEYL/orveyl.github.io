// adc :: visitor.js

export class Visitor {
    constructor(predicate, pre_proc, post_proc) {
        this.predicate = predicate;
        this.pre_proc = pre_proc;
        this.post_proc = post_proc;
    }

    visit(here) {
        if (!here) return this;
        
        if (this.pre_proc) { this.pre_proc(here) }

        const next = this.predicate ?
            here.collect(this.predicate) :
            here.children;
        for (let node of next) { this.visit(node); }

        if (this.post_proc) { this.post_proc(here); }

        return this;
    }
};