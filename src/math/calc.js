// adc :: calc.js
////////////////////////////////////////////////////////////////////////////////
// CONSTANTS
export const π = Math.PI;
export const τ = 2*π;

export const Rt2 = Math.sqrt(2);
export const Rt3 = Math.sqrt(3);
export const Rt5 = Math.sqrt(5);
export const Rt6 = Math.sqrt(6);
export const Rt7 = Math.sqrt(7);

export const δs = 1 + Rt2;

export const ϕ = (1 + Rt5) / 2; export const PHI = ϕ;
export const ψ = 2 / (1 + Rt5); export const PSI = ψ;

export const θm = Math.acos(Rt3/3);

////////////////////////////////////////////////////////////////////////////////
// COMBINATORS
export const Compose = f => g => x => f(g(x));
export const Flip    = f => y => x => f(x)(y);
export const Const   =      y => x => y;
export const Dupe    = f =>      x => f(x)(x);

export const Fork = f => L => R => x => f(L(x))(R(x));

export const Any = f => xs => xs.some(f);
export const All = f => xs => xs.every(f);

export const Map = f => xs =>   Array.prototype.map    .call(xs, x => f(x));
export const For = f => xs => { Array.prototype.forEach.call(xs,      f   ); return xs; }
export const Mut = f => For((x,i,X) => X[i]=f(x));
export const MutIdx = f => For((x,i,X) => X[i]=f(i));

export const FoldL = (f, z=0) => xs =>
    Array.prototype.reduce.call(xs, (acc, x) => f(acc)(x), z);
export const FoldR = (f, z=0) => xs =>
    Array.prototype.reduce.call(xs, (acc, x) => f(x)(acc), z);
export const Fold = FoldR;

export const Scan = (f, z=0) => FoldL(acc => x => [...acc, f(x)(acc?.at(-1)??z)], []);

export const Zip    = f => as => bs =>
    Array.prototype.map    .call(as, (a,i  ) =>      f(a)(bs[i]));
export const MutZip = f => as => bs => {
    Array.prototype.forEach.call(as, (a,i,A) => A[i]=f(a)(bs[i]));
    return as;
}

export const Outer = f => as => bs => Map( a => Map(b => f(a)(b))(bs) )(as);

export const Iota = N => Array.from(Gen.Iota(N));

////////////////////////////////////////////////////////////////////////////////
// STRUCTURE
export const Nil = Object.freeze([]);
export const Cons = a => b => [a,b];

////////////////////////////////////////////////////////////////////////////////
// ARITHMETIC
export const Id  = x => x;
export const Pos = Id;
export const Abs = Math.abs;
export const Neg = x => -x;
export const Sgn = Math.sign;
export const Inv = x => 1/x;

export const Add = lhs => rhs => lhs+rhs;
export const Mul = lhs => rhs => lhs*rhs;
export const Sub = lhs => rhs => lhs-rhs; export const Minus = rhs => lhs => lhs-rhs;
export const Div = lhs => rhs => lhs/rhs; export const DivBy = den => num => num/den;

export const Succ = Add(1);
export const Pred = Minus(1); export const Comp = Sub(1);

export const Lt = x => y => y<x; export const LtEq = x => y => y<=x;
export const Gt = x => y => y>x; export const GtEq = x => y => y>=x;
export const Eq = x => y => x==y;

export const AbsErr = x => y => Abs(x-y);
export const ApproxEq = ε => x => y => (AbsErr(x)(y) < ε);
export const Snap = ε => x => (Abs(x) < ε) ? 0 : x;

export const Floor = Math.floor; export const Ceil = Math.ceil;
export const Trunc = Math.trunc; export const Fract = Math.fract; 
export const Split = x => [Trunc(x), Fract(x)];

export const Min = x => y => Math.min(x,y);
export const Max = x => y => Math.max(x,y);
export const Clamp = (min, max) => (x) => Math.max(min, Math.min(max, x));
export const Sat = Clamp(0,1);

export const Rec = x => 0.5+0.5*x;
export const RecInv = x => 2*x-0.5;

export const SmoothMinQuad = λ => x => y => {
    const h = Max(λ-Abs(x-y))(0)/λ;
    return Min(x)(y) - h*h*λ/4;
}

export const SmoothMinExp = λ => x => y => {
    return -λ*Log(Exp(-x/λ) + Exp(-y/λ));
}

export const Sq = x => x*x;
export const Sqrt = Math.sqrt;
export const Root = x => Sqrt(Abs(x));
export const InvSq = x => Inv(Sq(x));
export const InvSqrt = x => Inv(Sqrt(x));
export const InvRoot = x => Inv(Root(x));

export const Pow = exp => base => Math.pow(base, exp);

export const Exp = Math.exp;
export const Log = Math.log;

export const Fma = s => lhs => rhs => lhs + s*rhs;

export const CrossRatio   = (A,B) => (C,D) => ((C-A)*(D-B)) / ((C-B)*(D-A));
export const CrossRatioCK = (A,B) => (C,D) => CrossRatio(A,D)(C,B);

////////////////////////////////////////////////////////////////////////////////
// UTILITIES
export const Σ = Fold(Add, 0); export const Sum = Σ;
export const Π = Fold(Mul, 1); export const Prod = Π;

export const Σs = Scan(Add, 0); export const PartialSums = Σs;
export const Πs = Scan(Mul, 1); export const PartialProds = Πs;

export const QuadraticMean  = vs => Sqrt(Σ(vs.map(Sq))/vs.length);
export const ArithmeticMean = vs => Mul(Inv(vs.length))(Σ(vs));
export const GeometricMean  = vs => Pow(Inv(vs.length))(Π(vs));
export const HarmonicMean   = vs => vs.length / Σ(vs.map(Inv));

export const Avg = ArithmeticMean;
export const RMS = QuadraticMean;

export const Var = xs => Avg( Map(Sq)( Map(Minus(Avg(xs)))(xs) ) );
export const StdDev = xs => Sqrt(Var(xs));
export const StdNorm = μ => σ => x => Exp(-Sq(x-μ)/(2*σ*σ)) / (σ*Sqrt(τ));

export const Lerp = (min, max) => x => min*(1-x) + max*x;
export const LerpInv = (min, max) => y => (y-min) / (max-min);
export const Remap = (xmin, xmax) => (ymin, ymax) => x => Lerp(ymin, ymax)(LerpInv(xmin,xmax)(x));

export const Step = edge => x => Lt(edge)(x);
export const SgnStep = edge => x => Step(edge)(x);

export const Wrap = max => x => (x >= 0) ? x%max : (x%max + max)%max;
export const WrapRange = (min, max) => x => min + Wrap(max-min)(x);
export const WrapAngle = x => (a => a + π*Sgn(a))((x+π) % τ);

export const IsIterable = x => Symbol.iterator in Object(x);

export const PackUnorm8x4 = (r,g,b,a) => {
    const buf = new ArrayBuffer(4);
    const u8 = new Uint8ClampedArray(buf);
    const f32 = new Float32Array(buf);
    u8.set([r,g,b,a]);
    if (g == 0xff) console.log(u8);
    return f32[0];
}

export const UnpackUnorm8x4 = (rgba8) => {
    const buf = new ArrayBuffer(4);
    const u8 = new Uint8Array(buf);
    const f32 = new Float32Array(buf);
    f32.set(rgba8);
    return [...u8];
}

export const RGBA8 = (code=0xffffffff) => {
    return PackUnorm8x4(
        (code >>> 0x18),
        (code >>> 0x10) & 0xff,
        (code >>> 0x08) & 0xff,
        (code         ) & 0xff,
    );
}

////////////////////////////////////////////////////////////////////////////////
// GENERATOR FUNCTIONS
export class Gen {

    static Ω = function*() { for(;;) yield; };
    static Do = function*(N) { for (let i = 0; i < N; ++i) yield; }
    static Iota = function*(N) { for (let i = 0; i < N; ++i) yield i; }
    static Pop = f => function*(N) { for (let i = 0; i < N; ++i) yield f();}
    
    static Fill = x => function*(N) { for (let _ of Gen.Do(N)) yield x; }
    static Call = f => (...xs) => function*(N) { for (let _ of Gen.Do(N)) yield f(...xs); }
    static Idx = f => function*(N) { for (let i of Gen.Iota(N)) yield f(i); }
    static Map = f => xs => function*() { for (let x of xs) yield f(x); }

    static Range = function*(min, max, incl=false) { 
        for (let i = min; i < max + incl; ++i) yield i;
    }

    static Stride = step => function*(min, max, incl=false) { 
        for (let i = min; i < max + incl; i+=step) yield i;
    }

    static Cycle = (...xs) => function*(N) {
        for (let i = 0; i < N; ++i) yield xs[Wrap(xs.length)(i)];
    }

};

////////////////////////////////////////////////////////////////////////////////
// RANDOM FUNCTIONS
export class MTRNG { 

    // Mersenne Twister ref: https://gist.github.com/banksean/300494

    static N = 624; static M = 397;
    static A = 0x9908b0df;
    static HI = 0x80000000; static LO = 0x7fffffff;
    static T0 = 0x9d2c5680; static T1 = 0xefc60000;
    static RE0 = 1/(Pow(32)(2)  );
    static RE1 = 1/(Pow(32)(2)-1);

    #seed;

    constructor (seed) {
        this.mt = new Array(MTRNG.N);
        this.i  = MTRNG.N+1;
        this.seed = seed ?? new Date().getTime();
    }

    get seed() { return this.#seed; }
    set seed(seed) {
        this.mt[0] = this.#seed = (seed >>> 0);
        for (this.i = 1; this.i < MTRNG.N; ++this.i) {
            const s = this.mt[this.i-1] ^ (this.mt[this.i-1] >>> 30);
            this.mt[this.i] = (
                ((((s & 0xffff0000) >>> 16) * 1812433253) << 16)
                +  (s & 0x0000ffff) * 1812433253
            ) + this.i;
            this.mt[this.i] >>>= 0;
        }
    }

    i32() {
        const mag01 = [0x0, MTRNG.A];
        let y;
        if (this.i >= MTRNG.N) {
            const it = (j0, j1, j2) => {
                y = (this.mt[j0] & MTRNG.HI) | (this.mt[j1] & MTRNG.LO);
                this.mt[j0] = this.mt[j2+MTRNG.M] ^ (y >>> 1) ^ mag01[y & 0x1];
            }

            let  j;
            for (j = 0; j < MTRNG.N-MTRNG.M; ++j) { it(        j, j,   j        ); }
            for (     ; j < MTRNG.N - 1;     ++j) { it(        j, j+1, j-MTRNG.N); }
                                                  { it(MTRNG.N-1,   0,  -1      ); }
            this.i = 0;
        }
        y = this.mt[this.i++];
        y ^= (y >>> 11);
        y ^= (y  <<  7) & MTRNG.T0;
        y ^= (y  << 15) & MTRNG.T1;
        y ^= (y >>> 18);
        return y >>> 0;
    }

    i31() { return  this.i32() >>> 1;          } // [0, 0x7fffffff]
    re0() { return  this.i32()     *MTRNG.RE0; } // [0, 1]
    re1() { return  this.i32()     *MTRNG.RE1; } // [0, 1)
    re2() { return (this.i32()+0.5)*MTRNG.RE1; } // (0, 1)

    f53() { // [0, 1)
        const [a, b] = [this.i32() >>> 5, this.i32() >>> 6];
        return (a*67108864.0+b)*(1.0/9007199254740992.0); 
    }

    random() { return this.f53(); }

};

export class Rand {

    static DefaultRNG = new MTRNG();

    static Raw = RNG => (RNG??Rand.DefaultRNG).i32();

    static Unit = RNG => (RNG??Rand.DefaultRNG).random();
    static Sign = RNG => 1-2*Rand.Unit(RNG);

    static Range = (min, max) => RNG => Lerp(min, max)(Rand.Unit(RNG));

    static Int = (min, max, incl=false) => RNG => {
        [min, max] = [Math.ceil(min), Math.floor(max)];
        return Math.floor(min + Rand.Unit(RNG) * (max-min + incl));
    }

    static Bit  = Rand.Int(0,   2); static Bool = RNG => !!Rand.Bit(RNG);
    static Hex  = Rand.Int(0,  16);
    static Byte = Rand.Int(0, 256);

    static Pop = F => N => RNG => Array.from(Gen.Pop(_=>F(RNG))(N));
    static Index = src => Rand.Int(0, src.length);
    static From = src => RNG => src[Rand.Index(src)(RNG)];
    static Choice = (...xs) => Rand.From(xs);

    static HexId = N => RNG => Rand.Pop(Rand.Byte)(N)(RNG).map(
        x => x.toString(16).padStart(2, '0')
    ).join("");

    static Dist = shape => RNG => shape(Rand.Unit(RNG));

    static Const = k => RNG => { Rand.Unit(RNG); return k; }
    static Uniform = Rand.Range(0, 1);
    static Flat = (min, max) => Rand.Range(min, max);

    static Sq = Rand.Dist(Sq);
    static Sqrt = Rand.Dist(Sqrt);
    static Pow = exp => Rand.Dist(Pow(exp));
    static Exp = λ => Rand.Dist(λ ? Id : x => DivBy(Exp(λ))(Exp(λ*x)-1));

    static Circ = Rand.Dist(x => 2*Sqrt(x*(1-x)));

    static Gauss = μ => σ => RNG =>
        μ+((r, θ) => r*Geom.Sph.Cos(θ))(σ*Sqrt(-2*Log(Rand.Unit(RNG))), τ*Rand.Unit(RNG));
    
};

export class SimplexNoise {

    // ref: https://github.com/josephg/noisejs/blob/master/perlin.js

    static grad3 = [
        [+1,+1, 0], [-1,+1, 0], [+1,-1, 0], [-1,-1, 0],
        [+1, 0,+1], [-1, 0,+1], [+1, 0,-1], [-1, 0,-1],
        [ 0,+1,+1], [ 0,-1,+1], [ 0,+1,-1], [ 0,-1,-1],
    ];

    static p = [
        151,160,137, 91, 90, 15,131, 13,201, 95, 96, 53,194,233,  7,225,
        140, 36,103, 30, 69,142,  8, 99, 37,240, 21, 10, 23,190,  6,148,
        247,120,234, 75,  0, 26,197, 62, 94,252,219,203,117, 35, 11, 32,
         57,177, 33, 88,237,149, 56, 87,174, 20,125,136,171,168, 68,175,
         74,165, 71,134,139, 48, 27,166, 77,146,158,231, 83,111,229,122,
         60,211,133,230,220,105, 92, 41, 55, 46,245, 40,244,102,143, 54,
         65, 25, 63,161,  1,216, 80, 73,209, 76,132,187,208, 89, 18,169,
        200,196,135,130,116,188,159, 86,164,100,109,198,173,186,  3, 64,
         52,217,226,250,124,123,  5,202, 38,147,118,126,255, 82, 85,212,
        207,206, 59,227, 47, 16, 58, 17,182,189, 28, 42,223,183,170,213,
        119,248,152,  2, 44,154,163, 70,221,153,101,155,167, 43,172,  9,
        129, 22, 39,253, 19, 98,108,110, 79,113,224,232,178,185,112,104,
        218,246, 97,228,251, 34,242,193,238,210,144, 12,191,179,162,241,
         81, 51,145,235,249, 14,239,107, 49,192,214, 31,181,199,106,157,
        184, 84,204,176,115,121, 50, 45,127,  4,150,254,138,236,205, 93,
        222,114, 67, 29, 24, 72,243,141,128,195, 78, 66,215, 61,156,180,
    ];

    static perm = (() => {
        const result = [];
        for (let i = 0; i < 512; ++i) {
            result.push(SimplexNoise.p[i & 0xFF]);
        }
        return result;
    })();

    static Noise(xin, yin) {

        const F2 = 0.5 * (Rt3-1);
        const s = F2 * (xin+yin);

        const [i, j] = [
            Floor(xin+s),
            Floor(yin+s),
        ];

        const G2 = (3-Rt3) / 6;
        const t = G2 * (i+j);

        const [X0, Y0] = [   i-t,    j-t];
        const [x0, y0] = [xin-X0, yin-Y0];

        const [i1, j1] = (x0 > y0) ? [1, 0] : [0, 1];

        const [
            x1, y1,
            x2, y2,
        ] = [
            x0 - i1 + G2,  y0 - j1 + G2,
            x0 - 1 + 2*G2, y0 - 1 + 2*G2,
        ];

        // gradient indices for each simplex vert
        const pp = SimplexNoise.perm;
        const L = SimplexNoise.grad3.length;
        const [ii, jj] = [i&0xFF, j&0xFF];
        const [gi0, gi1, gi2] = [
            pp[ii    + pp[jj   ]] % L,
            pp[ii+i1 + pp[jj+j1]] % L,
            pp[ii+1  + pp[jj+1 ]] % L,
        ];

        // interpolant
        const tt = (x,y) => 0.5 - x*x - y*y;
        const [t0, t1, t2] = [
            tt(x0, y0),
            tt(x1, y1),
            tt(x2, y2),
        ];

        const dot = (v, x, y) => v[0]*x + v[1]*y;
        const nn = (t, gi, x, y) => (t < 0) ? 0 : t*t*t*t * dot(SimplexNoise.grad3[gi], x, y);
        const [n0, n1, n2] = [
            nn(t0, gi0, x0, y0),
            nn(t1, gi1, x1, y1),
            nn(t2, gi2, x2, y2),
        ];

        return 70 * (n0 + n1 + n2);
    }

    static Noise3D(xin, yin, zin) {

        const F3 = 1/3;
        const s = F3*(xin + yin + zin);

        const [i,j,k] = [
            Floor(xin+s),
            Floor(yin+s),
            Floor(zin+s),
        ];

        const G3 = 1/6;
        const t = G3*(i+j+k);
        const [X0, Y0, Z0] = [i-t, j-t, k-t];
        const [x0, y0, z0] = [xin-X0, yin-Y0, zin-Z0];

        let i1, j1, k1;
        let i2, j2, k2;
        if(x0>=y0) {
            if (y0>=z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // XYZ
            else if (x0>=z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // XZY
            else             { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; } // ZXY
        } else { // x0<y0
            if (y0<z0)       { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // ZYX
            else if (x0<z0)  { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // YZX
            else             { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // YXZ
        }

        const [
            x1, y1, z1,
            x2, y2, z2,
            x3, y3, z3,
        ] = [
            x0 - i1 + G3,
            y0 - j1 + G3,
            z0 - k1 + G3,

            x0 - i2 + 2*G3,
            y0 - j2 + 2*G3,
            z0 - k2 + 2*G3,

            x0 - 1 + 3*G3,
            y0 - 1 + 3*G3,
            z0 - 1 + 3*G3,
        ];

        const pp = SimplexNoise.perm;
        const L = SimplexNoise.grad3.length;
        const [ii, jj, kk] = [i&0xFF, j&0xFF, k&0xFF];
        const [gi0, gi1, gi2, gi3] = [
            pp[ii    + pp[jj    + pp[kk   ]]] % L,
            pp[ii+i1 + pp[jj+j1 + pp[kk+k1]]] % L,
            pp[ii+i2 + pp[jj+j2 + pp[kk+k2]]] % L,
            pp[ii+1  + pp[jj+1  + pp[kk+1 ]]] % L,
        ];

        const tt = (x,y,z) => 0.6 - x*x - y*y - z*z;
        const [t0, t1, t2, t3] = [
            tt(x0, y0, z0),
            tt(x1, y1, z1),
            tt(x2, y2, z2),
            tt(x3, y3, z3),
        ];

        const dot = (v, x, y, z) => v[0]*x + v[1]*y + v[2]*z;
        const nn = (t, gi, x, y, z) => (t < 0) ? 0 : t*t*t*t * dot(SimplexNoise.grad3[gi], x, y, z);
        const [n0, n1, n2, n3] = [
            nn(t0, gi0, x0, y0, z0),
            nn(t1, gi1, x1, y1, z1),
            nn(t2, gi2, x2, y2, z2),
            nn(t3, gi3, x3, y3, z3),
        ];

        return 32 * (n0 + n1 + n2 + n3);
    }

};

////////////////////////////////////////////////////////////////////////////////
// GEOMETRY INFO
class GeomInfo {
    constructor(
        Str, Sig,
        Cos, CosInv,
        Sin, SinInv,
        Tan, TanInv,
    ) {
        this.Str = Str; this.Sig = Sig;
        this.Cos = Cos; this.CosInv = CosInv;
        this.Sin = Sin; this.SinInv = SinInv;
        this.Tan = Tan; this.TanInv = TanInv;

        this.Exp = x => [this.Cos(x), this.Sin(x)];
        this.Osc = (A, ω, φ=0) => t => [A*this.Cos(ω*t+φ), A*this.Sin(ω*t+φ)];
    }

    Eval(...procs) {
        Geom.Push(this);
        for (let proc of procs) { proc() };
        Geom.Pop();
        return this;
    }

    Case(sph, hyp, par, err) {
        return Geom.Switch(this.Sig)(sph, hyp, par, err);
    }
}

////////////////////////////////////////////////////////////////////////////////
// GEOMETRY STATE
export const Geom = new class {

    #Stack;

    constructor() {
        this.#Stack = [];
        [this.Sph, this.Hyp, this.Par] = [
            Object.freeze(new GeomInfo(
                "Sph", +1,
                Math.cos,  Math.acos,
                Math.sin,  Math.asin,
                Math.tan,  (x,y) => (y === undefined) ? Math.atan(x) : Math.atan2(y,x),
            )),
            Object.freeze(new GeomInfo(
                "Hyp", -1,
                Math.cosh, Math.acosh,
                Math.sinh, Math.asinh,
                Math.tanh, Math.atanh,
            )),
            Object.freeze(new GeomInfo(
                "Par",  0,
                Const(1),  Const(undefined),
                Id, Id,
                Id, Const(undefined),
            )),
        ];
    }

    get Type() { return this.#Stack.at(-1); }

    Eval(...procs) { this.Type?.Eval(...procs); return this; }

    Switch(sig) {
        return (sph, hyp, par, err) => {
            switch (Sgn(sig)) {
                case this.Sph.Sig: return sph;
                case this.Hyp.Sig: return hyp;
                case this.Par.Sig: return par;
                default:      return err;
            }
        }
    }

    Case(sph, hyp, par, err) {
        return this.Switch(this.Sig)(sph, hyp, par, err);
    }

    Match(sig) {
        return this.Switch(sig)(this.Sph, this.Hyp, this.Par, undefined);
    }

    Push(G)   { this.#Stack.push(G); return this.Type; }
    PushSph() { return this.Push(this.Sph); }
    PushHyp() { return this.Push(this.Hyp); }
    Pop()     { return this.#Stack.pop();  }

    get Str() { return this.Type?.Str; } get Sig()    { return this.Type?.Sig;     }
    get Cos() { return this.Type?.Cos; } get CosInv() { return this.Type?.CosInv;  }
    get Sin() { return this.Type?.Sin; } get SinInv() { return this.Type?.SinInv;  }
    get Tan() { return this.Type?.Tan; } get TanInv() { return this.Type?.TanInv;  }

    get Exp() { return this.Type?.Exp; }
    get Osc() { return this.Type?.Osc; }
};

////////////////////////////////////////////////////////////////////////////////
// GEOMETRIC FUNCTIONS
export const Di = n => π/n;
export const Gudermannian = x => Geom.Sph.TanInv(Geom.Hyp.Sin(x));
export const Lambertian   = x => Geom.Hyp.SinInv(Geom.Sph.Tan(x));
export const AngleOfParallelism = h => π/2 - Gudermannian(h);
export const AltitudeOfParallelism = t => Lambertian(π/2 - t);

export const Excess = (a,b,c) => Snap(1e-12)((a+b+c) - π);
export const Defect = (a,b,c) => Snap(1e-12)(π - (a+b+c));

export const Osc = (A, ω, φ=0) => t => A*Geom.Sph.Cos(ω*t+φ);