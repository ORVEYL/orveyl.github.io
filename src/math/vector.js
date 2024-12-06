// adc :: vector.js

import * as Calc from "./calc.js";
import {
    Mut, Zip, MutZip, Outer,
    Add, Sub, Mul, Div, LtEq, Sqrt, Root,
    Σ, Exp, Log,
    Wrap, IsIterable,
    Geom,
} from "./calc.js";

////////////////////////////////////////////////////////////////////////////////
// BASE VECTOR :: R^N
export class Vector extends Float64Array {
    constructor(N) { super(N); }
    static new(N) { return new Vector(N); }
    get dup() { return Vector.from(this); }

    get json() { return JSON.stringify(Array.from(this)); }
    set json(src) { this.copy(JSON.parse(src)); }

    copy(src, offset=0) { super.set(src, offset); return this; }
    map(callbackFn, thisArg) {
        return Vector.new(this.length).copy(super.map(callbackFn, thisArg));
    }

    eq(v, ε=1e-12) { return Zip(AbsErr)(this)(v).every(LtEq(ε)); }

    sc(s) { return Mut(Mul(s))(this); }
    get neg() { return this.sc(-1); }

    add(v) { return IsIterable(v) ? MutZip(Add)(this)(v) : Mut(Add(v))(this); }
    sub(v) { return IsIterable(v) ? MutZip(Sub)(this)(v) : Mut(Sub(v))(this); }
    mul(v) { return IsIterable(v) ? MutZip(Mul)(this)(v) : Mut(Mul(v))(this); }
    div(v) { return IsIterable(v) ? MutZip(Div)(this)(v) : Mut(Div(v))(this); }

    sum (...vs) { for (let v of vs) this.add(v); return this; }
    prod(...vs) { for (let v of vs) this.mul(v); return this; }
    Σ(...vs) { return this.sum (...vs); }
    Π(...vs) { return this.prod(...vs); }

    fma(s, v) { return MutZip(Fma(s))(this)(v); }
    mix(v, t) { return this.sc(1-t).fma(t, v); }

    ip(v) { return Σ(Zip(Mul)(this)(v)); }
    op(v) { return Vector.new(this.length * v.length).copy(Outer(Mul)(this)(v).flat()); }
};

////////////////////////////////////////////////////////////////////////////////
// COMPLEX :: R^2
export class Complex extends Vector {
    constructor() { super(2); }
    static get new() { return new Complex(); }
    get dup() { return Complex.from(this); }

    set  (re, im) { this[0] = re; this[1] = im; return this; }
    setRe(re    ) { this[0] = re;               return this; }
    setIm(    im) {               this[1] = im; return this; }

    static of(re, im) { return super.of(re, im); }

    static re(s=1) { return Complex.of(s, 0); }
    static im(s=1) { return Complex.of(0, s); }

    static polar(abs, arg=0) {
        return Complex.of(
            ...Geom.Sph.Exp(arg),
        ).sc(abs);
    }

    static get zero() { return Complex.of(0, 0); }
    static get ones() { return Complex.of(1, 1); }

    get re() { return this[0]; } set re(s) { this[0] = s; }
    get im() { return this[1]; } set im(s) { this[1] = s; }

    static conj(z) { return Complex.of(z.re, -z.im); }
    static quad(z) { return z.re*z.re + z.im*z.im; }
    static abs (z) { return Sqrt(Complex.quad(z)); }
    static arg (z) { return Geom.Sph.TanInv(z.re, z.im); }

    static exp(z) {
        return Complex.of(
            ...Geom.Sph.Exp(z.im),
        ).sc(Exp(z.re));
    }

    static log(z) {
        return Complex.of(
            Log(z.quad) / 2,
            z.arg,
        );
    }

    static sc(z, s) { return Complex.of(z.re*s, z.im*s); }
    static add(L, R) { return Complex.of(L.re + R.re, L.im + R.im); }
    static sub(L, R) { return Complex.of(L.re - R.re, L.im - R.im);}

    static mul(L, R) {
        return Complex.of(
            L.re*R.re - L.im*R.im,
            L.re*R.im + L.im*R.re,
        );
    }

    static div(L, R) {
        return Complex.of(
            L.re*R.re + L.im*R.im,
            L.im*R.re - L.re*R.im,
        ).sc(1/Complex.quad(R));
    }

    static pow(L, R) { return L.log.mul(R).exp; }

    static mobius(A, B, C, D) {
        return z => Complex.div(
            Complex.mul(A, z).add(B),
            Complex.mul(C, z).add(D),
        );
    }

    get conj() { this.im = -this.im; return this; }
    get quad() { return Complex.quad(this); }
    get abs () { return Complex.abs(this); }
    get arg () { return Complex.arg(this); }

    get exp() {
        return this.set(
            ...Geom.Sph.Exp(this.im),
        ).sc(Exp(this.re));
    }

    get log() {
        return this.set(
            Log(this.quad) / 2,
            this.arg,
        );
    }

    sc(s) { this.re *= s; this.im *= s; return this; }
    add(z) { this.re += z.re; this.im += z.im; return this; }
    sub(z) { this.re -= z.re; this.im -= z.im; return this; }
    mul(z) { return this.copy(Complex.mul(this, z)); }
    div(z) { return this.copy(Complex.div(this, z)); }
    pow(z) { return this.copy(Complex.pow(this, z)); }

    get sq() { return this.mul(this); }

    sum (...zs) { for (let z of zs) this.add(z); return this; }
    prod(...zs) { for (let z of zs) this.mul(z); return this; }
    Σ(...zs) { return this.sum (zs); }
    Π(...zs) { return this.prod(zs); }

    static sum (z, ...zs) { return z?.dup.sum (...zs) ?? Complex.zero; } static Σ = Complex.sum;
    static prod(z, ...zs) { return z?.dup.prod(...zs) ?? Complex.re;   } static Π = Complex.prod;

};

////////////////////////////////////////////////////////////////////////////////
// GEOMETRIC POINT / PLANE :: R^4
export class V4 extends Vector {
    constructor() { super(4); }
    static get new() { return new V4(); }
    get dup() { return V4.from(this); }

    set(x, y, z, w) { this[0]=x; this[1]=y; this[2]=z; this[3]=w; return this; }
    setXYZ(x, y, z) { this[0]=x; this[1]=y; this[2]=z;            return this; }
    setW(w)         {                                  this[3]=w; return this; }
    setAt(i, e=1)   { this[Wrap(4)(i)] = e; return this; }

    map(callbackFn, thisArg) {
        return V4.from(super.map(callbackFn, thisArg));
    }

    static of(x, y, z, w) { return super.of(x??0, y??0, z??0, w??0); }
    static rgb(r, g, b, a=1) { return V4.of(r, g, b, a); }

    static E(i, s=1) { return V4.new.setAt(i, s); }
    static Ex(s=1) { return V4.E(0, s); } static get x() { return V4.Ex(); }
    static Ey(s=1) { return V4.E(1, s); } static get y() { return V4.Ey(); }
    static Ez(s=1) { return V4.E(2, s); } static get z() { return V4.Ez(); }
    static Ew(s=1) { return V4.E(3, s); } static get w() { return V4.Ew(); }
    static get zero() { return V4.new; }
    static get ones() { return V4.new.fill(1); }

    get x() { return this[0]; } set x(s) { this[0] = s; }
    get y() { return this[1]; } set y(s) { this[1] = s; }
    get z() { return this[2]; } set z(s) { this[2] = s; }
    get w() { return this[3]; } set w(s) { this[3] = s; }

    sc(s)    { this[0]*=s; this[1]*=s; this[2]*=s; this[3]*=s; return this; }
    scXYZ(s) { this[0]*=s; this[1]*=s; this[2]*=s;             return this; }
    scW(s)   {                                     this[3]*=s; return this; }

    get neg()    { return this.sc(-1); }
    get negXYZ() { return this.scXYZ(-1); }
    get negW()   { return this.scW(-1); }

    normalize() { return this.sc(Calc.InvRoot(this.ip(this))); }
    get norm() { return this.dup.normalize(); }

    get T() { return this.scW(Geom.Sig); }

    add(v) { this[0]+=v[0]; this[1]+=v[1]; this[2]+=v[2]; this[3]+=v[3]; return this; }
    sub(v) { this[0]-=v[0]; this[1]-=v[1]; this[2]-=v[2]; this[3]-=v[3]; return this; }
    mul(v) { this[0]*=v[0]; this[1]*=v[1]; this[2]*=v[2]; this[3]*=v[3]; return this; }
    div(v) { this[0]/=v[0]; this[1]/=v[1]; this[2]/=v[2]; this[3]/=v[3]; return this; }

    sum (...vs) { for (let v of vs) this.add(v); return this; }
    prod(...vs) { for (let v of vs) this.mul(v); return this; }
    Σ(...vs) { return this.sum (...vs); }
    Π(...vs) { return this.prod(...vs); }
    static sum  = (v, ...vs) => v?.dup.sum (...vs) ?? V4.zero; static Σ = V4.sum; 
    static prod = (v, ...vs) => v?.dup.prod(...vs) ?? V4.ones; static Π = V4.prod;
    static avg  = (...vs) => V4.Σ(...vs).sc(1/vs.length);
    static mean = (...vs) => V4.Π(...vs).map(x => Math.pow(x, 1/vs.length));

    fma(s, v) {
        this[0]+=s*v[0];
        this[1]+=s*v[1];
        this[2]+=s*v[2];
        this[3]+=s*v[3];
        return this;
    }
    
    mix(v, t) { return this.sc(1-t).fma(t, v); }
    static mix = (v0, v1) => t => v0.dup.mix(v1, t);

    ip(v) {
        return (
            this[0]*v[0] +
            this[1]*v[1] +
            this[2]*v[2] +
            this[3]*v[3] * Geom.Sig
        );
    }

    op(v) {
        return M4.of(
            // this[0]*v[0]  , this[1]*v[0]  , this[2]*v[0]  , this[3]*v[0]  ,
            // this[0]*v[1]  , this[1]*v[1]  , this[2]*v[1]  , this[3]*v[1]  ,
            // this[0]*v[2]  , this[1]*v[2]  , this[2]*v[2]  , this[3]*v[2]  ,
            // this[0]*v[3]*S, this[1]*v[3]*S, this[2]*v[3]*S, this[3]*v[3]*S,

            this[0]*v[0], this[0]*v[1], this[0]*v[2], this[0]*v[3]*Geom.Sig,
            this[1]*v[0], this[1]*v[1], this[1]*v[2], this[1]*v[3]*Geom.Sig,
            this[2]*v[0], this[2]*v[1], this[2]*v[2], this[2]*v[3]*Geom.Sig,
            this[3]*v[0], this[3]*v[1], this[3]*v[2], this[3]*v[3]*Geom.Sig,
        );
    }

    xp(v) {
        return B4.of(
            this[0]*v[1] - this[1]*v[0], // xy - yx
            this[2]*v[0] - this[0]*v[2], // zx - xz
            this[1]*v[2] - this[2]*v[1], // yz - zy
            this[3]*v[0] - this[0]*v[3], // wx - xw
            this[3]*v[1] - this[1]*v[3], // wy - yw
            this[3]*v[2] - this[2]*v[3], // wz - zw
        ).sc(1/2);
    }

    lm(v) {
        // return Q4.Es(
        //     this.ip(v),
        //     -this[0]*v[1] +this[1]*v[0],
        //     -this[2]*v[0] +this[0]*v[2],
        //     -this[1]*v[2] +this[2]*v[1],
        //     -this[3]*v[0] +this[0]*v[3],
        //     -this[3]*v[1] +this[1]*v[3],
        //     -this[3]*v[2] +this[2]*v[3],
        // );
    }

    rm(v) {
        // return Q4.Es(
        //     this.ip(v),
        //     this[0]*v[1] -this[1]*v[0],
        //     this[2]*v[0] -this[0]*v[2],
        //     this[1]*v[2] -this[2]*v[1],
        //     this[3]*v[0] -this[0]*v[3],
        //     this[3]*v[1] -this[1]*v[3],
        //     this[3]*v[2] -this[2]*v[3],
        // );
    }

    la(M) { return this.copy(M.ra(this)); }
    ra(M) { return this.copy(M.la(this)); }

    ips (...vs) { return vs.map(this.ip, this); }
    ops (...vs) { return vs.map(this.op, this); }
    xps (...vs) { return vs.map(this.xp, this); }

    static Tri = a => b => c => a.xp(b).xp(c);

    static quad(a, b=V4.w) {
        const [aa, ab, bb] = [a.ip(a), a.ip(b), b.ip(b)];
        return (ab*ab) / (aa*bb);
    }
    quad(v=V4.w) { return V4.quad(this, v); }

    static dist(a, b=V4.w) { return Geom.CosInv(Calc.Root(V4.quad(a,b))); }
    dist(v=V4.w) { return V4.dist(this, v); }

    static lerp = (v0, v1) => t => {
        return v0.dup.lerp(v1, t);
    }

    lerp(v, t) {
        const d = this.dist(v);
        const [s0, s1] = [
            Geom.Sin((1-t)*d),
            Geom.Sin(   t *d),
        ];
        return this.sc(s0).fma(s1, v).sc(1/Geom.Sin(d));
    }

    static bary = (A,B,C) => (wA, wB, wC) => {
        return V4.Σ(
            A.dup.sc(wA),
            B.dup.sc(wB),
            C.dup.sc(wC),
        ).normalize();
    }
};

////////////////////////////////////////////////////////////////////////////////
// GEOMETRIC LINE :: R^6
export class B4 extends Vector {
    constructor() { super(6); }
    static get new() { return new B4(); }
    get dup() { return B4.from(this); }

    set(i, j, k, X, Y, Z) {
        this[0]=i; this[1]=j; this[2]=k;
        this[3]=X; this[4]=Y; this[5]=Z;
        return this;
    }
    setSpin(i, j, k) { this[0]=i; this[1]=j; this[2]=k; return this; }
    setFlux(X, Y, Z) { this[3]=X; this[4]=Y; this[5]=Z; return this; }
    setAt(i, e=1)    { this[Wrap(6)(i)] = e; return this; }

    static of(i, j, k, X, Y, Z) { return super.of(i??0, j??0, k??0, X??0, Y??0, Z??0); }
    static Spin(i, j, k) { return B4.of(i, j, k, 0, 0, 0); }
    static Flux(X, Y, Z) { return B4.of(0, 0, 0, X, Y, Z); }

    static E(i, s=1) { return B4.new.setAt(i, s); }
    static Ei(s=1) { return B4.Spin(s, 0, 0); } static get i() { return B4.Ei(); }
    static Ej(s=1) { return B4.Spin(0, s, 0); } static get j() { return B4.Ej(); }
    static Ek(s=1) { return B4.Spin(0, 0, s); } static get k() { return B4.Ek(); }
    static EX(s=1) { return B4.Flux(s, 0, 0); } static get X() { return B4.EX(); }
    static EY(s=1) { return B4.Flux(0, s, 0); } static get Y() { return B4.EY(); }
    static EZ(s=1) { return B4.Flux(0, 0, s); } static get Z() { return B4.EZ(); }
    static get zero() { return B4.new; }
    static get ones() { return B4.new.fill(1); }

    get i() { return this[0]; } set i(s) { this[0] = s; }
    get j() { return this[1]; } set j(s) { this[1] = s; }
    get k() { return this[2]; } set k(s) { this[2] = s; }

    get X() { return this[3]; } set X(s) { this[3] = s; }
    get Y() { return this[4]; } set Y(s) { this[4] = s; }
    get Z() { return this[5]; } set Z(s) { this[5] = s; }

    get spin()    { return [this[0], this[1], this[2]];       }
    set spin(ijk) {        [this[0], this[1], this[2]] = ijk; }
    get flux()    { return [this[3], this[4], this[5]];       }
    set flux(XYZ) {        [this[3], this[4], this[5]] = XYZ; }

    sc(s) {
        this[0]*=s; this[1]*=s; this[2]*=s;
        this[3]*=s; this[4]*=s; this[5]*=s;
        return this;
    }
    scSpin(s) { this[0]*=s; this[1]*=s; this[2]*=s; return this; }
    scFlux(s) { this[3]*=s; this[4]*=s; this[5]*=s; return this; }

    get neg()     { return this.sc(-1); }
    get negSpin() { return this.scSpin(-1); }
    get negFlux() { return this.scFlux(-1); }

    get π()     { return this.sc    (π); }; get τ()     { return this.sc    (τ); }
    get πSpin() { return this.scSpin(π); }; get τSpin() { return this.scSpin(τ); }
    get πFlux() { return this.scFlux(π); }; get τFlux() { return this.scFlux(τ); }

    add(b) {
        this[0]+=b[0]; this[1]+=b[1]; this[2]+=b[2];
        this[3]+=b[3]; this[4]+=b[4]; this[5]+=b[5];
        return this;
    }

    sub(b) {
        this[0]-=b[0]; this[1]-=b[1]; this[2]-=b[2];
        this[3]-=b[3]; this[4]-=b[4]; this[5]-=b[5];
        return this;
    }

    mul(b) {
        this[0]*=b[0]; this[1]*=b[1]; this[2]*=b[2];
        this[3]*=b[3]; this[4]*=b[4]; this[5]*=b[5];
        return this;
    }

    div(b) {
        this[0]/=b[0]; this[1]/=b[1]; this[2]/=b[2];
        this[3]/=b[3]; this[4]/=b[4]; this[5]/=b[5];
        return this;
    }

    sum (...bs) { for (let b of bs) this.add(b); return this; }
    prod(...bs) { for (let b of bs) this.mul(b); return this; };
    Σ(...bs) { return this.sum (...bs); }
    Π(...bs) { return this.prod(...bs); }
    static sum (b, ...bs) { return b?.dup.sum (...bs) ?? B4.zero; } static Σ = B4.sum;
    static prod(b, ...bs) { return b?.dup.prod(...bs) ?? B4.ones; } static Π = B4.prod;
    static avg (...bs) { return B4.Σ(...bs).sc(1/bs.length); }

    fma(s, b) {
        this[0]+=s*b[0]; this[1]+=s*b[1]; this[2]+=s*b[2];
        this[3]+=s*b[3]; this[4]+=s*b[4]; this[5]+=s*b[5];
        return this;
    }

    mix(b, t) { return this.sc(1-t).fma(t, b); }
    static mix = (b0, b1) => t => b0.dup.mix(b1, t);

    xp(v) {
        return V4.of(
            this[2]*v[3] + this[4]*v[2] - this[5]*v[1], // kw + Yz - Zy
            this[1]*v[3] + this[5]*v[0] - this[3]*v[2], // jw + Zx - Xz
            this[0]*v[3] + this[3]*v[1] - this[4]*v[0], // iw + Xy - Yx
            this[0]*v[2] + this[1]*v[1] + this[2]*v[0], // iz + jy + kx
        );
    }

    exp(N=24) {
        // TODO: B4 exp can be optimized in terms of symm / skew parts only
        return M4.Line(...this).exp(N);
    }

};

////////////////////////////////////////////////////////////////////////////////
// LINEAR TRANSFORMATION :: R^4x4
export class M4 extends Vector {
    constructor() { super(16); }
    static get new() { return new M4(); }
    get dup() { return M4.from(this); }

    static VecIdx = (ri, ci) => Wrap(16)( ri + 4*ci );
    static RowIdx =    vi    => Wrap( 4)(      vi   );
    static ColIdx =    vi    => Wrap( 4)(Trunc(vi/4));
    static RowCol =    vi    => [M4.RowIdx(vi), M4.ColIdx(vi)];

    R(ri) {
        ri = Wrap(4)(ri);
        return V4.of(this[ri+0x0], this[ri+0x4], this[ri+0x8], this[ri+0xC]);
    }

    C(ci) {
        ci = 4*Wrap(4)(ci);
        return V4.of(this[0x0+ci], this[0x1+ci], this[0x2+ci], this[0x3+ci]);
    }

    setR(ri, v) {
        ri = Wrap(4)(ri);
        this[ri+0x0] = v[0];
        this[ri+0x4] = v[1];
        this[ri+0x8] = v[2];
        this[ri+0xC] = v[3];
        return this;
    }

    setC(ci, v) { ci = 4*Wrap(4)(ci); return this.copy(v, ci); }

    setRs(Rx, Ry, Rz, Rw) {
        return this.setR(0, Rx).setR(1, Ry).setR(2, Rz).setR(3, Rw);
    }

    setCs(Cx, Cy, Cz, Cw) {
        return this.setC(0, Cx).setC(1, Cy).setC(2, Cz).setC(3, Cw);
    }

    swapR(ri, rj) {
        const [Ri, Rj] = [this.R(ri), this.R(rj)];
        return this.setR(ri, Ri).setR(rj, Rj);
    }

    swapC(ci, cj) {
        const [Ci, Cj] = [this.C(ci), this.C(cj)];
        return this.setC(ci, Ci).setC(cj, Cj);
    }

    get Rx() { return this.R(0); } set Rx(v) { this.setR(0, v); }
    get Ry() { return this.R(1); } set Ry(v) { this.setR(1, v); }
    get Rz() { return this.R(2); } set Rz(v) { this.setR(2, v); }
    get Rw() { return this.R(3); } set Rw(v) { this.setR(3, v); }
    get Rs() { return [this.Rx, this.Ry, this.Rz, this.Rw]; }
    set Rs(Rs) { this.setRs(...Rs); }

    get Cx() { return this.C(0); } set Cx(v) { this.setC(0, v); }
    get Cy() { return this.C(1); } set Cy(v) { this.setC(1, v); }
    get Cz() { return this.C(2); } set Cz(v) { this.setC(2, v); }
    get Cw() { return this.C(3); } set Cw(v) { this.setC(3, v); }
    get Cs() { return [this.Cx, this.Cy, this.Cz, this.Cw]; }
    set Cs(Cs) { this.setCs(...Cs); }

    set(
        RxCx, RyCx, RzCx, RwCx,
        RxCy, RyCy, RzCy, RwCy,
        RxCz, RyCz, RzCz, RwCz,
        RxCw, RyCw, RzCw, RwCw,
    ) {
        this[0x0]=RxCx; this[0x1]=RyCx; this[0x2]=RzCx; this[0x3]=RwCx;
        this[0x4]=RxCy; this[0x5]=RyCy; this[0x6]=RzCy; this[0x7]=RwCy;
        this[0x8]=RxCz; this[0x9]=RyCz; this[0xA]=RzCz; this[0xB]=RwCz;
        this[0xC]=RxCw; this[0xD]=RyCw; this[0xE]=RzCw; this[0xF]=RwCw;
        return this;
    }
    setAt(ri, ci, e=1) { this[M4.VecIdx(ri, ci)] = e; return this; }

    setD(v=1) {
        if (v instanceof Array) {
            if (v[0]) this[0x0] = v[0];
            if (v[1]) this[0x5] = v[1];
            if (v[2]) this[0xA] = v[2];
            if (v[3]) this[0xF] = v[3];
        } else {
            this[0x0] = this[0x5] = this[0xA] = this[0xF] = v;
        }
        return this;
    }

    get D( ) { return V4.of(this[0x0], this[0x5], this[0xA], this[0xF]); }
    set D(v) { this.setD(v); }
    get id() { this.fill(0).setD(1); }
    static get id() { return M4.new.setD(1); }

    static of( // ------> cols
        RxCx, RyCx, RzCx, RwCx,
        RxCy, RyCy, RzCy, RwCy,
        RxCz, RyCz, RzCz, RwCz,
        RxCw, RyCw, RzCw, RwCw,
    ) {
        return super.of(
            RxCx??0, RyCx??0, RzCx??0, RwCx??0,
            RxCy??0, RyCy??0, RzCy??0, RwCy??0,
            RxCz??0, RyCz??0, RzCz??0, RwCz??0,
            RxCw??0, RyCw??0, RzCw??0, RwCw??0,
        );
    }

    static Rs = (Rx, Ry, Rz, Rw) => M4.new.setRs(Rx, Ry, Rz, Rw);
    static Cs = (Cx, Cy, Cz, Cw) => M4.new.setCs(Cx, Cy, Cz, Cw);
    static D = diag => M4.new.setD(diag);
    static G = (S=Geom.Sig) => M4.D(1,1,1,S);

    static get i() {
        return M4.of(
             0,+1, 0, 0,
            -1, 0, 0, 0,
             0, 0, 0, 0,
             0, 0, 0, 0,
        );
    }

    static get j() {
        return M4.of(
             0, 0,-1, 0,
             0, 0, 0, 0,
            +1, 0, 0, 0,
             0, 0, 0, 0,
        );
    }

    static get k() {
        return M4.of(
             0, 0, 0, 0,
             0, 0,+1, 0,
             0,-1, 0, 0,
             0, 0, 0, 0,
        );
    }

    static get X() {
        return M4.of(
             0, 0, 0,+1,
             0, 0, 0, 0,
             0, 0, 0, 0,
            +1, 0, 0, 0,
        );
    }

    static get Y() {
        return M4.of(
             0, 0, 0, 0,
             0, 0, 0,+1,
             0, 0, 0, 0,
             0,+1, 0, 0,
        );
    }

    static get Z() {
        return M4.of(
             0, 0, 0, 0,
             0, 0, 0, 0,
             0, 0, 0,+1,
             0, 0,+1, 0,
        );
    }

    static get zero() { return M4.new; }
    static get ones() { return M4.new.fill(1); }

    get flip() {
        const sw = (i,j) => [this[i], this[j]] = [this[j], this[i]];
        /**********/ sw(0x1,0x4); sw(0x2,0x8); sw(0x3,0xC);
        /**********/ /**********/ sw(0x6,0x9); sw(0x7,0xD);
        /**********/ /**********/ /**********/ sw(0xB,0xE);
        /**********/ /**********/ /**********/ /**********/
        return this;
    }

    get rev() {
        const rev = i => { this[i] *= -1; }
        /*******/ /*******/ /*******/ rev(0x3);
        /*******/ /*******/ /*******/ rev(0x7);
        /*******/ /*******/ /*******/ rev(0xB);
        rev(0xC); rev(0xD); rev(0xE); /*******/
        return this;
    }

    get T() { return Geom.Sig > 0 ? this.flip : this.flip.rev; }

    sc(s) {
        this[0x0]*=s; this[0x1]*=s; this[0x2]*=s; this[0x3]*=s;
        this[0x4]*=s; this[0x5]*=s; this[0x6]*=s; this[0x7]*=s;
        this[0x8]*=s; this[0x9]*=s; this[0xA]*=s; this[0xB]*=s;
        this[0xC]*=s; this[0xD]*=s; this[0xE]*=s; this[0xF]*=s;
        return this;
    }

    scR(ri, s) { this.setR(ri, this.R(ri).sc(s)); }
    scC(ci, s) { this.setC(ci, this.C(ci).sc(s)); }
    scD(    s) { this.setD(    this.D    .sc(s)); }

    get neg()  { return this.sc (    -1); }
    negR(ri)   { return this.scR(ri, -1); }
    negC(ci)   { return this.scC(ci, -1); }
    get negD() { return this.scD(    -1); }

    add(M) {
        this[0x0]+=M[0x0]; this[0x1]+=M[0x1]; this[0x2]+=M[0x2]; this[0x3]+=M[0x3];
        this[0x4]+=M[0x4]; this[0x5]+=M[0x5]; this[0x6]+=M[0x6]; this[0x7]+=M[0x7];
        this[0x8]+=M[0x8]; this[0x9]+=M[0x9]; this[0xA]+=M[0xA]; this[0xB]+=M[0xB];
        this[0xC]+=M[0xC]; this[0xD]+=M[0xD]; this[0xE]+=M[0xE]; this[0xF]+=M[0xF];
        return this;
    }

    addR(ri, v) { this.setR(ri, this.R(ri).add(v)); }
    addC(ci, v) { this.setC(ci, this.C(ci).add(v)); }
    addD(    v) { this.setD(    this.D    .add(v)); }

    sub(M) {
        this[0x0]-=M[0x0]; this[0x1]-=M[0x1]; this[0x2]-=M[0x2]; this[0x3]-=M[0x3];
        this[0x4]-=M[0x4]; this[0x5]-=M[0x5]; this[0x6]-=M[0x6]; this[0x7]-=M[0x7];
        this[0x8]-=M[0x8]; this[0x9]-=M[0x9]; this[0xA]-=M[0xA]; this[0xB]-=M[0xB];
        this[0xC]-=M[0xC]; this[0xD]-=M[0xD]; this[0xE]-=M[0xE]; this[0xF]-=M[0xF];
        return this;
    }

    subR(ri, v) { this.setR(ri, this.R(ri).sub(v)); }
    subC(ci, v) { this.setC(ci, this.C(ci).sub(v)); }
    subD(    v) { this.setD(    this.D    .sub(v)); }

    mul(M) {
        this[0x0]*=M[0x0]; this[0x1]*=M[0x1]; this[0x2]*=M[0x2]; this[0x3]*=M[0x3];
        this[0x4]*=M[0x4]; this[0x5]*=M[0x5]; this[0x6]*=M[0x6]; this[0x7]*=M[0x7];
        this[0x8]*=M[0x8]; this[0x9]*=M[0x9]; this[0xA]*=M[0xA]; this[0xB]*=M[0xB];
        this[0xC]*=M[0xC]; this[0xD]*=M[0xD]; this[0xE]*=M[0xE]; this[0xF]*=M[0xF];
        return this;
    }

    mulR(ri, v) { this.setR(ri, this.R(ri).mul(v)); }
    mulC(ci, v) { this.setC(ci, this.C(ci).mul(v)); }
    mulD(    v) { this.setD(    this.D    .mul(v)); }

    div(M) {
        this[0x0]/=M[0x0]; this[0x1]/=M[0x1]; this[0x2]/=M[0x2]; this[0x3]/=M[0x3];
        this[0x4]/=M[0x4]; this[0x5]/=M[0x5]; this[0x6]/=M[0x6]; this[0x7]/=M[0x7];
        this[0x8]/=M[0x8]; this[0x9]/=M[0x9]; this[0xA]/=M[0xA]; this[0xB]/=M[0xB];
        this[0xC]/=M[0xC]; this[0xD]/=M[0xD]; this[0xE]/=M[0xE]; this[0xF]/=M[0xF];
        return this;
    }

    divR(ri, v) { this.setR(ri, this.R(ri).div(v)); }
    divC(ci, v) { this.setC(ci, this.C(ci).div(v)); }
    divD(    v) { this.setD(    this.D    .div(v)); }

    tr() { return this[0x0] + this[0x5] + this[0xA] + this[0xF]; }

    sum (...Ms) { for (let M of Ms) this.add(M); return this; }
    prod(...Ms) { for (let M of Ms) this.mul(M); return this; };
    Σ(...Ms) { return this.sum (...Ms); }
    Π(...Ms) { return this.prod(...Ms); }
    static sum (M, ...Ms) { return M?.dup.sum (...Ms) ?? M4.zero; } static Σ = M4.sum;
    static prod(M, ...Ms) { return M?.dup.prod(...Ms) ?? M4.ones; } static Π = M4.prod;
    static avg (...Ms) { return M4.Σ(...Ms).sc(1/Ms.length); }

    fma(s, M) {
        this[0x0]+=s*M[0x0]; this[0x1]+=s*M[0x1]; this[0x2]+=s*M[0x2]; this[0x3]+=s*M[0x3];
        this[0x4]+=s*M[0x4]; this[0x5]+=s*M[0x5]; this[0x6]+=s*M[0x6]; this[0x7]+=s*M[0x7];
        this[0x8]+=s*M[0x8]; this[0x9]+=s*M[0x9]; this[0xA]+=s*M[0xA]; this[0xB]+=s*M[0xB];
        this[0xC]+=s*M[0xC]; this[0xD]+=s*M[0xD]; this[0xE]+=s*M[0xE]; this[0xF]+=s*M[0xF];
        return this;
    }

    mix(M, t) { return this.sc(1-t).fma(t, M); }
    static mix = (M0, M1) => t => M0.dup.mix(M1, t);

    static Mul(L, R, Out=M4.new) {
        Out[0x0] = L[0x0]*R[0x0] + L[0x4]*R[0x1] + L[0x8]*R[0x2] + L[0xC]*R[0x3];
        Out[0x1] = L[0x1]*R[0x0] + L[0x5]*R[0x1] + L[0x9]*R[0x2] + L[0xD]*R[0x3];
        Out[0x2] = L[0x2]*R[0x0] + L[0x6]*R[0x1] + L[0xA]*R[0x2] + L[0xE]*R[0x3];
        Out[0x3] = L[0x3]*R[0x0] + L[0x7]*R[0x1] + L[0xB]*R[0x2] + L[0xF]*R[0x3];

        Out[0x4] = L[0x0]*R[0x4] + L[0x4]*R[0x5] + L[0x8]*R[0x6] + L[0xC]*R[0x7];
        Out[0x5] = L[0x1]*R[0x4] + L[0x5]*R[0x5] + L[0x9]*R[0x6] + L[0xD]*R[0x7];
        Out[0x6] = L[0x2]*R[0x4] + L[0x6]*R[0x5] + L[0xA]*R[0x6] + L[0xE]*R[0x7];
        Out[0x7] = L[0x3]*R[0x4] + L[0x7]*R[0x5] + L[0xB]*R[0x6] + L[0xF]*R[0x7];

        Out[0x8] = L[0x0]*R[0x8] + L[0x4]*R[0x9] + L[0x8]*R[0xA] + L[0xC]*R[0xB];
        Out[0x9] = L[0x1]*R[0x8] + L[0x5]*R[0x9] + L[0x9]*R[0xA] + L[0xD]*R[0xB];
        Out[0xA] = L[0x2]*R[0x8] + L[0x6]*R[0x9] + L[0xA]*R[0xA] + L[0xE]*R[0xB];
        Out[0xB] = L[0x3]*R[0x8] + L[0x7]*R[0x9] + L[0xB]*R[0xA] + L[0xF]*R[0xB];

        Out[0xC] = L[0x0]*R[0xC] + L[0x4]*R[0xD] + L[0x8]*R[0xE] + L[0xC]*R[0xF];
        Out[0xD] = L[0x1]*R[0xC] + L[0x5]*R[0xD] + L[0x9]*R[0xE] + L[0xD]*R[0xF];
        Out[0xE] = L[0x2]*R[0xC] + L[0x6]*R[0xD] + L[0xA]*R[0xE] + L[0xE]*R[0xF];
        Out[0xF] = L[0x3]*R[0xC] + L[0x7]*R[0xD] + L[0xB]*R[0xE] + L[0xF]*R[0xF];

        return Out;
    }

    // TODO: unsurprisingly, the per-multiply dup is costly
    lm(...Ls) { for (let L of Ls) { M4.Mul(L, this.dup, this); } return this; }
    rm(...Rs) { for (let R of Rs) { M4.Mul(this.dup, R, this); } return this; }
    static lm(L, ...Ls) { return L?.dup.lm(...Ls) ?? M4.id; }
    static rm(R, ...Rs) { return R?.dup.rm(...Rs) ?? M4.id; }

    lmR(...Ls) { return this.lm(...Ls.reverse()); }
    rmR(...Rs) { return this.rm(...Rs.reverse()); }
    static lmR(...Ls) { return M4.lm(...Ls.reverse()); }
    static rmR(...Rs) { return M4.rm(...Rs.reverse()); }

    lc(...Ls) { for (let L of Ls) { this.lm(L).rm(L.dup.T); } return this; }
    rc(...Rs) { for (let R of Rs) { this.rm(R).lm(R.dup.T); } return this; }

    la(row) { // [:row:i] [i:this:j] = [:out:j]
        return V4.of(
            row[0x0]*this[0x0] + row[0x1]*this[0x1] + row[0x2]*this[0x2] + row[0x3]*this[0x3],
            row[0x0]*this[0x4] + row[0x1]*this[0x5] + row[0x2]*this[0x6] + row[0x3]*this[0x7],
            row[0x0]*this[0x8] + row[0x1]*this[0x9] + row[0x2]*this[0xA] + row[0x3]*this[0xB],
            row[0x0]*this[0xC] + row[0x1]*this[0xD] + row[0x2]*this[0xE] + row[0x3]*this[0xF],
        );
    }

    ra(col) { // [i:this:j] * [j:col:] = [i:out:]
        return V4.of(
            this[0x0]*col[0x0] + this[0x4]*col[0x1] + this[0x8]*col[0x2] + this[0xC]*col[0x3],
            this[0x1]*col[0x0] + this[0x5]*col[0x1] + this[0x9]*col[0x2] + this[0xD]*col[0x3],
            this[0x2]*col[0x0] + this[0x6]*col[0x1] + this[0xA]*col[0x2] + this[0xE]*col[0x3],
            this[0x3]*col[0x0] + this[0x7]*col[0x1] + this[0xB]*col[0x2] + this[0xF]*col[0x3],
        );
    }

    las(...rows) { return rows.map(this.la, this); }
    ras(...cols) { return cols.map(this.ra, this); }

    lca(row) { return this.dup.lc(M4.Center(row)).la(row); }
    rca(col) { return this.dup.rc(M4.Center(col)).ra(col); }

    lcas(...rows) { return rows.map(this.lca, this); }
    rcas(...cols) { return cols.map(this.rca, this); }

    exp(N=24) {
        const [pow, s] = [[M4.id, this.dup], [1,1]];
        for (let i = 1; i < N; ++i) { pow.push(pow[i].dup.lm(this)); s.push(s[i]/(i+1)) }
        this.id;
        for (let i = 1; i < N; ++i) { this.add(pow[i].sc(s[i])); }
        return this;
    }

    xp(v) {
        // TODO: check
        return V4.of(
            // this.k*v[3] + this.Y*v[2] - this.Z*v[1],
            // this.j*v[3] + this.Z*v[0] - this.X*v[2],
            // this.i*v[3] + this.X*v[1] - this.Y*v[0],
            // this.i*v[2] + this.j*v[1] + this.k*v[0],
        );
    }


    static Proj(n) { return M4.id.sub(n.op(n).sc(1/n.ip(n))); }
    static ProjI() { return M4.D([1, 1, 0, 1]); }
    static ProjJ() { return M4.D([1, 0, 1, 1]); }
    static ProjK() { return M4.D([0, 1, 1, 1]); }
    static ProjX() { return M4.D([1, 0, 0, 1]); }
    static ProjY() { return M4.D([0, 1, 0, 1]); }
    static ProjZ() { return M4.D([0, 0, 1, 1]); }

    static Refl(n) { return M4.id.sub(n.op(n).sc(2/n.ip(n))); }
    static ReflI() { return M4.D([+1, +1, -1, +1]); }
    static ReflJ() { return M4.D([+1, -1, +1, +1]); }
    static ReflK() { return M4.D([-1, +1, +1, +1]); }

    static Skew(
        xx, xy, xz, xw,
            yy, yz, yw,
                zz, zw,
                    ww,
    ) {
        return M4.of(
            +xx, +xy, +xz, +xw,
            -xy, +yy, +yz, +yw,
            -xz, -yz, +zz, +zw,
            -xw, -yw, -zw, +ww,
        );
    }

    static Symm(
        xx, xy, xz, xw,
            yy, yz, yw,
                zz, zw,
                    ww,
    ) {
        return M4.of(
            xx, xy, xz, xw,
            xy, yy, yz, yw,
            xz, yz, zz, zw,
            xw, yw, zw, ww,
        );
    }

    static Spin(di, dj, dk, dt=1) {
        return M4.Skew(
            0, +di*dt, -dj*dt, 0,
                    0, +dk*dt, 0,
                            0, 0,
                               0,
        );
    }

    static Flux(dX, dY, dZ, dt=1) {
        return Geom.Case(M4.Skew, M4.Symm)(
            0, 0, 0, dX*dt,
               0, 0, dY*dt,
                  0, dZ*dt,
                      0,
        );
    }

    static Line(di, dj, dk, dX, dY, dZ, dSp=1, dFl=1, dt=1) {
        return M4.Spin(di, dj, dk, dSp*dt).add(M4.Flux(dX, dY, dZ, dFl*dt));
    }

    static Motor(di, dj, dk, dX, dY, dZ, dSp=1, dFl=1, dt=1) {
        return M4.Line(di, dj, dk, dX, dY, dZ, dSp, dFl, dt).exp();
    }

    static Rot(di, dj, dk, dt=1) { return M4.Spin(di, dj, dk, dt).exp(); }
    static RotI(t) {
        const [C,S] = Geom.Sph.Exp(t);
        return M4.Skew(
            +C, +S,  0,  0,
                +C,  0,  0,
                    +1,  0,
                        +1,
        );
    }
    static RotJ(t) {
        const [C,S] = Geom.Sph.Exp(t);
        return M4.Skew(
            +C,  0, -S,  0,
                +1,  0,  0,
                    +C,  0,
                        +1,
        );
    }
    static RotK(t) {
        const [C,S] = Geom.Sph.Exp(t);
        return M4.Skew(
            +1,  0,  0,  0,
                +C, +S,  0,
                    +C,  0,
                        +1,
        );
    }

    static Mov(dX, dY, dZ, dt=1) { return M4.Flux(dX, dY, dZ, dt).exp(); }
    static MovX(t) {
        const [C,S] = Geom.Exp(t);
        return Geom.Case(M4.Skew, M4.Symm)(
            +C,  0,  0, +S,
                +1,  0,  0,
                    +1,  0,
                        +C,
        );
    }
    static MovY(t) {
        const [C,S] = Geom.Exp(t);
        return Geom.Case(M4.Skew, M4.Symm)(
            +1,  0,  0,  0,
                +C,  0, +S,
                    +1,  0,
                        +C,
        );
    }
    static MovZ(t) {
        const [C,S] = Geom.Exp(t);
        return Geom.Case(M4.Skew, M4.Symm)(
            +1,  0,  0, +0,
                +1,  0,  0,
                    +C, +S,
                        +C,
        );
    }

    static EulerOrdDefault = [M4.RotI, M4.RotJ, M4.RotK];
    static EulerOrd = M4.EulerOrdDefault;
    static EulerDir = [+1, +1, +1];
    static Euler(t0=0, t1=0, t2=0, dt=1) {
        return M4.rm(
            M4.EulerOrd[0](t0*M4.EulerDir[0]*dt),
            M4.EulerOrd[1](t1*M4.EulerDir[1]*dt),
            M4.EulerOrd[2](t2*M4.EulerDir[2]*dt),
        );
    }

    static TransportOrdDefault = [M4.MovX, M4.MovY, M4.MovZ];
    static TransportOrd = M4.TransportOrdDefault;
    static TransportDir = [+1, +1, +1];
    static Transport(t0=0, t1=0, t2=0, dt=1) {
        return M4.rm(
            M4.TransportOrd[0](t0*M4.TransportDir[0]*dt),
            M4.TransportOrd[1](t1*M4.TransportDir[1]*dt),
            M4.TransportOrd[2](t2*M4.TransportDir[2]*dt),
        );
    }

    static Translate(src, dst) {
        const c = V4.Σ(src, dst);
        return M4.Σ(
            M4.id,
            c.op(c).sc(1/(1-src.ip(dst))),
            dst.op(src).sc(-2),
        );
    }

    static Along(dst)  { return M4.Translate(V4.w, dst); }
    static Center(src) { return M4.Translate(src, V4.w); }

    static Perspective(fovy, ar, nc, fc) {
        const f = Geom.Sph.Tan(fovy/2);
        const dc = fc-nc;
        return M4.of(
            f,    0,         0, 0,
            0, f*ar,         0, 0,
            0,    0,     fc/dc, 1,
            0,    0, -fc*nc/dc, 0,
        );
    }

};


////////////////////////////////////////////////////////////////////////////////
// TESTS
if (false) {

    Hyp.Eval(
        () => {
            const a = V4.of(1,2,3,4);
            const b = V4.of(10, 20, 30, 40);
            console.log(a, b, a.ip(b), a.op(b));
        }
    );

}