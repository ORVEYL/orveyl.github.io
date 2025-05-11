// adc :: knuthbendix.js

export class Rule {
    constructor(lhs, rhs="") {
        this.lhs = lhs; this.rhs = rhs;
        this.active = true;
    }

    static Array(...pairs) {
        return pairs.map(pair => new Rule(pair[0], pair[1]));
    }

    static Cycle(pair, ord) {
        return new Rule(pair.join("").repeat(ord));
    }

    static Compare(L, R) {
        return L.lhs.length - R.lhs.length;
    }

    compare(other) {
        return Rule.Compare(this, other);
    }

    isReduction() {
        return System.Shortlex(this.lhs, this.rhs);
    }

    isDuplicate(other) {
        return this.lhs === other.lhs && this.rhs === other.rhs;
    }

    apply(input) {
        return input.replaceAll(this.lhs, this.rhs);
    }

    superpose(other) {
        const overlap = (as, bs, cs) => {
            if (!bs) return undefined;
            return (cs.startsWith(bs)) ?
                [as.reverse().join(""), bs, cs.slice(bs.length)] :
                overlap([bs[0], ...as], bs.slice(1), cs);
        }

        return overlap([], this.lhs, other.lhs)?.join("");
    }
};

export class System {
    constructor(generators, inverses, axioms=[]) {
        this.gen = generators;
        this.gen_inv = inverses;
        this.axioms = axioms;
        this.rewrites = this.axioms;
        this.repr = {};
    }

    static Verbose = false;
    static VerboseLog(args) { if (System.Verbose) console.log(args); }

    static Bailout_ms = 5000;

    static ShortLex(lhs, rhs) {
        const [llen, rlen] = [lhs.length, rhs.length];
        return (llen != rlen) ? (llen - rlen > 0) : (lhs > rhs);
    }

    compare(lhs, rhs) {
        return System.ShortLex(this.reduce(lhs), this.reduce(rhs));
    }

    static Normalize(rules, input) {
        let [prev, curr] = [undefined, input];
        do {
            prev = curr;
            for (let rule of rules) {
                if (!rule.active) continue;
                curr = rule.apply(curr);
            }
        } while (curr != prev);
        return curr;
    }

    reduce(word) {
        return System.Normalize(this.rewrites, word);
    }

    invert(gen) {
        return this.gen_inv[this.gen.indexOf(gen)];
    }

    pair(gen) {
        return [gen, this.invert(gen)];
    }

    complete() {
        this.axioms.sort(Rule.Compare);
        const rules = [...this.axioms];

        const start_time = Date.now();
        for (let i = 0; i < rules.length; ++i) {
            for (let j = 0; j < rules.length; ++j) {
                System.Step(rules)(rules[i], rules[j]);
                if (System.Bailout_ms) {
                    const dt = Date.now() - start_time;
                    const bail = (dt >= System.Bailout_ms);

                    console.assert(
                        !bail,
                        `Knuth-Bendix completion is taking a while... (T = ${dt}ms)`,
                        {System: this, Rules: rules}
                    );

                    if (bail) {
                        System.VerboseLog("Rewrites In-Progress:");
                        System.VerboseLog(System.Clean(rules));
                        throw new Error(`Bailing out!`);
                    }
                }
            }
        }

        this.rewrites = System.Clean(rules);
        System.VerboseLog("Completed Rewrites:");
        System.VerboseLog(this.rewrites);

        return this;
    }

    static Clean = (rules) => rules.filter(r => r.active).sort(System.ShortLex);

    static Step = (rules) => (L, R) => {
        if (!(L.active && R.active)) return;

        System.VerboseLog(`Rule count: ${rules.length}`);
        System.VerboseLog(`Step:\n  L: ${L.lhs} -> ${L.rhs}\n  R: ${R.lhs} -> ${R.rhs}`)

        const crit = L.superpose(R);
        if (!crit) {
            System.VerboseLog("  not critical;")
            return;
        }
        System.VerboseLog(`  critical word: ${crit}`);

        const [Ln, Rn] = [
            System.Normalize(rules, L.apply(crit)),
            System.Normalize(rules, R.apply(crit)),
        ];
        System.VerboseLog(`  (L) ${Ln}\n  (R) ${Rn}`);

        if (Ln !== Rn) {
            const new_rule = System.ShortLex(Ln, Rn) ?
                new Rule(Ln, Rn) :
                new Rule(Rn, Ln) ;
            System.VerboseLog(`  Candidate: ${new_rule.lhs} -> ${new_rule.rhs} ;`);

            if (rules.some(rule => rule.active && new_rule.isDuplicate(rule))) {
                System.VerboseLog("  duplicate rule;")
                return;
            }

            for (let rule of rules) {
                if (!rule.active) continue;
                if (new_rule.apply(rule.lhs) != rule.lhs) {
                    rule.active = false;
                    System.VerboseLog(`  subsumed rule: ${rule.lhs} -> ${rule.rhs} ;`);
                }
            }

            rules.push(new_rule);
            System.VerboseLog("  added;");
        } else {
            System.VerboseLog("  not a reduction;")
        }
    }

};