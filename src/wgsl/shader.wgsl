// adc :: shader.wgsl

struct uMatStruct {
    ClipFromView: mat4x4f,
    ViewFromWorld: mat4x4f,
    WorldFromLocal: mat4x4f,
};

const mExchange = transpose(mat4x4f(
    0,-1, 0, 0,
    0, 0, 1, 0,
    1, 0, 0, 0,
    0, 0, 0, 1,
));

struct uTimeStruct {
    Step: f32,
    T: f32,
};

@group(0) @binding(0) var<uniform> uMat: uMatStruct;
@group(0) @binding(1) var<uniform> uRes: vec2f;
@group(0) @binding(2) var<uniform> uTime: uTimeStruct;
@group(0) @binding(3) var<uniform> uInstMats: array<mat4x4f, 1024>;
@group(0) @binding(4) var<uniform> uSky: array<vec4f, 16>;
@group(0) @binding(5) var<uniform> uTint: vec4f;

@group(0) @binding(6) var uTexSampler : sampler;
@group(0) @binding(7) var uTexView: texture_2d<f32>;

@group(1) @binding(0) var<uniform> objMat: mat4x4f;
@group(1) @binding(1) var<uniform> objTint: vec4f;

@group(2) @binding(0) var gPos: texture_2d<f32>;
@group(2) @binding(1) var gCol: texture_2d<f32>;
@group(2) @binding(2) var gMat: texture_2d<u32>;
@group(2) @binding(3) var gDepth: texture_depth_2d;


// SOMEDAY: f64 polyfill
// https://github.com/clickingbuttons/jeditrader/blob/a921a0e/shaders/src/fp64.wgsl

////////////////////////////////////////////////////////////////////////////////
// UTILITY
const PI : f32 = 3.14159;
const TAU : f32 = 2*PI;
const TpS : f32 = 1/(60*TAU);

fn Mip(a : vec4f, b : vec4f) -> f32 { return dot(a.xyz, b.xyz) - a.w*b.w; }

fn Dist(a : vec4f, b : vec4f) -> f32 {
    let aa = Mip(a,a);
    let ab = Mip(a,b);
    let bb = Mip(b,b);

    let CC = (ab*ab)/(aa*bb);
    return acosh(sqrt(abs(CC)));
}

fn SphDist(a : vec4f, b : vec4f) -> f32 {
    let aa = dot(a,a);
    let ab = dot(a,b);
    let bb = dot(b,b);

    let CC = (ab*ab)/(aa*bb);
    return acos(sqrt(abs(CC)));
}

fn Outer(a : vec4f, b : vec4f) -> mat4x4f {
    return mat4x4f(a*b.x, a*b.y, a*b.z, -a*b.w);
}

fn RotI(di : f32) -> mat4x4f {
    let c = cos(di); let s = sin(di);
    return mat4x4f(
        c,-s, 0, 0,
        s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    );
}

fn RotJ(dj : f32) -> mat4x4f {
    let c = cos(dj); let s = sin(dj);
    return mat4x4f(
        c, 0, s, 0,
        0, 1, 0, 0,
       -s, 0, c, 0,
        0, 0, 0, 1,
    );
}

fn RotK(dk : f32) -> mat4x4f {
    let c = cos(dk); let s = sin(dk);
    return mat4x4f(
        1, 0, 0, 0,
        0, c,-s, 0,
        0, s, c, 0,
        0, 0, 0, 1,
    );
}

fn MovX(dX : f32) -> mat4x4f {
    let c = cosh(dX); let s = sinh(dX);
    return mat4x4f(
        c, 0, 0, s,
        0, 1, 0, 0,
        0, 0, 1, 0,
        s, 0, 0, c,
    );
}

fn MovY(dY : f32) -> mat4x4f {
    let c = cosh(dY); let s = sinh(dY);
    return mat4x4f(
        1, 0, 0, 0,
        0, c, 0, s,
        0, 0, 1, 0,
        0, s, 0, c,
    );
}

fn MovZ(dZ : f32) -> mat4x4f {
    let c = cosh(dZ); let s = sinh(dZ);
    return mat4x4f(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, c, s,
        0, 0, s, c,
    );
}

fn Mov(dF : vec3f) -> mat4x4f {
    let dF2 = dot(dF, dF);
    if (dF2 < 1.0e-16) {
        return mat4x4f(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
    }

    let d = sqrt(dF2);
    let c = (cosh(d) - 1) / dF2;
    let s = sinh(d) / d;

    let k = vec4f(c * dF.xyz, s);

    return mat4x4f(
        k * dF.x + vec4f(1,0,0,0),
        k * dF.y + vec4f(0,1,0,0),
        k * dF.z + vec4f(0,0,1,0),
        vec4f(s*dF.xyz,  c*dF2+1),

        // 1 + c*dF.x*dF.x,     c*dX*dY,     c*dX*dZ,      s*dX,
        //     c*dF.y*dF.x, 1 + c*dY*dY,     c*dY*dZ,      s*dY,
        //     c*dF.z*dF.x,     c*dZ*dY, 1 + c*dZ*dZ,      s*dZ,
        //          s*dF.x,        s*dY,        s*dZ, 1 + c*dF2
    );
}

fn Translate(a : vec4f, b : vec4f) -> mat4x4f {
    let s = a + b;
    let S = Outer(s,s) * (1/(1-Mip(a,b)));
    let BA = 2 * Outer(b,a);
    return mat4x4f(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ) + S + BA;
}

fn Along(v : vec4f) -> mat4x4f { return Translate(vec4f(0,0,0,1), v); }

// Cheap Blue Noise by Fabrice Neyret https://www.shadertoy.com/view/tllcR2
fn WhiteNoise(p : vec2f) -> f32 {
    return fract(sin(dot(p, vec2(11.9898, 78.233))) * 43758.5453);
}

fn BlueNoise(p : vec2f) -> f32 {
    var v = 0.0;
    for (var k : i32 = 0; k<9; k+=1) {
        v += WhiteNoise(p + vec2f(f32(k%3 - 1), f32(k/3 - 1)));
    }
    return 0.5 + 0.9 *(1.125*WhiteNoise(p)- v/8);
}

////////////////////////////////////////////////////////////////////////////////
// HCL Colorspace: https://www.shadertoy.com/view/ls2yzy
fn lab_xyz(t : f32) -> f32 {
    let t0 = 4.0 / 29.0;
    let t1 = 6.0 / 29.0;
    let t2 = 3 * t1 * t1;
    let t3 = t1 * t1 * t1;
    return select(
        t2 * (t - t0),
        t * t * t,
        t > t1
    );
}

fn xyz_rgb(x : f32) -> f32 {
    return select(
        1.055 * pow(x, 1/2.4) - 0.055,
        12.92 * x,
        x <= 0.0032308
    );
}

fn lab2rgb(lab : vec3f) -> vec3f {
    let M = mat3x3f(
         3.2404542, -0.9692660,  0.0556434,
        -1.5371385,  1.8760108, -0.2040259,
        -0.4985314,  0.0415560,  1.0572252
    );

    let y = (lab.x + 16) / 116;
    let xyz = M * vec3f(
        0.950470 * lab_xyz(y + lab.y / 500),
                   lab_xyz(y),
        1.088830 * lab_xyz(y - lab.z / 200)
    );

    return vec3f(
        xyz_rgb(xyz.x),
        xyz_rgb(xyz.y),
        xyz_rgb(xyz.z)
    );
}

fn hcl2lab(hcl : vec3f) -> vec3f {
    let h = radians(hcl.x);
    return vec3f(
        hcl.z,
        cos(h) * hcl.y,
        sin(h) * hcl.y
    );
}

fn hcl2rgb(hcl : vec3f) -> vec3f { return lab2rgb(hcl2lab(hcl)); }

fn hcl(h : f32, c : f32, l : f32) -> vec3f {
    return hcl2rgb(vec3f(
        h * 360,
        c * 128,
        l * 100
    ));
}

////////////////////////////////////////////////////////////////////////////////
// Complex Plane : z == (re, im)
fn Ccon(z : vec2f) -> vec2f { return vec2f(z.x, -z.y); }
fn Csqr(z : vec2f) -> f32 { return dot(z,z); }
fn Cmul(a : vec2f, b : vec2f) -> vec2f { return vec2f(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
fn Cdiv(a : vec2f, b : vec2f) -> vec2f { return Cmul(a, Ccon(b)) / Csqr(b); }
fn Cabs(z : vec2f) -> f32 { return length(z); }
fn Carg(z : vec2f) -> f32 { return atan2(z.y, z.x); }
fn Ccis(t : f32) -> vec2f { return vec2f(cos(t), sin(t)); }
fn Cexp(z : vec2f) -> vec2f { return exp(z.x) * Ccis(z.y); }
fn Clog(z : vec2f) -> vec2f { return vec2f(log(Csqr(z))/2, Carg(z)); }
fn Cpow(b : vec2f, e : vec2f) -> vec2f { return Cexp(Cmul(Clog(b), e)); }
fn Cmob(
    z : vec2f,
    a : vec2f, b : vec2f,
    c : vec2f, d : vec2f
) -> vec2f {
    return Cdiv(Cmul(z,a) + b, Cmul(z,c) + d);
}

fn Crgb(z : vec2f) -> vec3f {
    let r = Cabs(z);
    let lr = log(r);
    let t = Carg(z) / TAU;

    let cr = mix(
        0.33, 0.5,
        (
            fract(lr) +
            fract(2*lr)/2 +
            fract(4*lr)/4 +
            fract(8*lr)/8
        ) / 1.875
    );
    let rr = select(0.5, 1.0, r<=1);

    let ct = mix(
        0.9, 1,
        (
            fract(4*t) +
            fract(8*t)/2 +
            fract(16*t)/4 +
            fract(32*t)/8
        ) / 1.875
    );

    return hcl(t, 0.5, cr*ct);
}

////////////////////////////////////////////////////////////////////////////////
// Quaternionic : q == (k,j,i, 1)
fn Qcon(q : vec4f) -> vec4f { return vec4f(-q.x, -q.y, -q.z, q.w); }
fn Qsqr(q : vec4f) -> f32 { return dot(q,q); }
fn Qinv(q : vec4f) -> vec4f { return Qcon(q) / Qsqr(q); }
fn Qmul(a : vec4f, b : vec4f) -> vec4f {
    return vec4f(
        a.x*b.w + a.w*b.x - a.y*b.z + a.z*b.y,
        a.y*b.w + a.w*b.y - a.z*b.x + a.x*b.z ,
        a.z*b.w + a.w*b.z - a.x*b.y + a.y*b.x,
        a.w*b.w - dot(a.xyz, b.xyz)
    );
}

fn Qapp(a : vec4f, q : vec4f) -> vec4f { return Qmul(a, Qmul(q, Qinv(a))); }

fn Qrgb(q : vec4f) -> vec3f {
    return vec3(fract(0.5*q.xyz+0.5));
    //vec3(pow(abs(cos(PI*q.w)), 6.0))
}

// TODO: reference against
// Complex + Quaternion + Octonion + Sedenion code
// use with attribution (c) Rodol 2018
// https://www.shadertoy.com/view/ldGyR3

////////////////////////////////////////////////////////////////////////////////
// GBUF PASS
struct VertIn {
    @builtin(instance_index) iIdx : u32,

    // vertex attributes
    @location(0) vPos : vec4f,
    @location(1) vCol : vec4f,
    @location(2) vTex : vec4f,
    //@location(3) vMat : vec2u,
};

struct VertOut {
    @builtin(position) pos : vec4f, // projected clip pos

    // interpolated vertex attributes
    @location(0) vPos : vec4f,
    @location(1) vCol : vec4f,
    @location(2) vTex : vec4f,
    //@location(3) @interpolate(flat) vMat : vec2u,

};

struct GBufOut {
    @location(0) gPos : vec4f,
    @location(1) gCol : vec4f,
    //@location(2) gMat : vec2u,
};

@vertex
fn vertGBuf(
    in : VertIn,
) -> VertOut {
    var out : VertOut;

    let worldPos = objMat * /*uInstMats[in.iIdx]*/ in.vPos;
    out.vPos = worldPos / worldPos.w;
    out.vCol = objTint * in.vCol;
    out.vTex = in.vTex;
    //out.vMat = in.vMat;

    out.pos =
        uMat.ViewFromWorld *
        worldPos;

    out.pos =
        uMat.ClipFromView *
        mExchange *
        (out.pos / out.pos.w);

    return out;
}

const SplatQuadPos = array(
    vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1),
    vec2f(-1, -1), vec2f(1, 1), vec2f(1, -1),
);

const SplatQuadUvs = array(
    vec4f(0, 0, 0, 0), vec4f(1, 1, 0, 0), vec4f(1, 0, 0, 0),
    vec4f(0, 0, 0, 0), vec4f(1, 1, 0, 0), vec4f(0, 1, 0, 0),
);

@vertex
fn vertGBufSplat(
    in : VertIn,
    @builtin(vertex_index) vIdx : u32
) -> VertOut {
    var out : VertOut;

    let worldPos = objMat * in.vPos;
    out.vPos = worldPos / worldPos.w;
    out.vCol = in.vCol;

    // {
    //     let eye = vec4f(0,0,0,-1) * objMat;
    //     let a = eye;
    //     let b = worldPos;

    //     let aa = dot(a,a);
    //     let ab = dot(a,b);
    //     let bb = dot(b,b);
    //     let CC = (ab*ab)/(aa*bb);
    //     let dist = asin(sqrt(1-CC));
    //     out.vCol.a *= step(dist, PI/4);//min(1, 1/dist);
    // }

    out.vTex = SplatQuadUvs[vIdx];
    //out.vMat = in.vMat;

    let viewPos = uMat.ViewFromWorld * worldPos;

    let size = 1.0/256.0;//0.0125;//in.vCol.a;
    let splatPos = size * SplatQuadPos[vIdx];

    // let B = Mov(vec3f(0, -splatPos));
    // let T = Along(viewPos);
    // let TBTinv = T * B * transpose(T);
    // out.pos = TBTinv * viewPos;

    out.pos = viewPos;
    out.pos += vec4f(0, splatPos, 0);
    out.pos.w = sqrt(dot(out.pos.xyz, out.pos.xyz) + 1);

    out.pos =
        uMat.ClipFromView *
        mExchange *
        (out.pos / out.pos.w);

    return out;
}

@fragment
fn fragGBuf(
    in : VertOut,
) -> GBufOut {

    let pos = in.vPos;
    if (dot(pos.xyz/pos.w, pos.xyz/pos.w) > 1.0) { discard; }

    let col = in.vCol;
    let texcol = textureSample(uTexView, uTexSampler, in.vTex.xy);
    let alpha = col.a * texcol.a;

    let feather = in.vTex.a;
    let threshold = clamp(feather * BlueNoise(in.pos.xy*fract(in.pos.z)+uTime.Step), 0, 1);
    if (alpha <= 0 || alpha < threshold) {
        discard;
    }

    let outcol = vec4f(
        col.rgb * texcol.rgb,
        1
    );

    let out = GBufOut(
        pos,
        outcol,
        //in.vMat,
    );

    return out;
}

@fragment
fn fragAdditive(
    in : VertOut
) -> @location(0) vec4f {
    let p = 2*in.vTex.xy-1;
    if (dot(p,p) > 1) { discard; } // fragment-level circle cutout

    let col = in.vCol;
    let texcol = textureSample(uTexView, uTexSampler, in.vTex.xy);

    let alpha = col.a * texcol.a;

    let feather = in.vTex.a;
    let threshold = clamp(feather * BlueNoise(in.pos.xy*fract(in.pos.z)+uTime.Step), 0, 1);
    if (alpha <= 0 || alpha < threshold) {
        discard;
    }

    let outcol = col * texcol;

    return vec4f(outcol.rgb * outcol.a, 1);

}

////////////////////////////////////////////////////////////////////////////////
// DEFERRED PASS
const ScreenPos = array(
    vec2(-1.0, 1.0), vec2(3.0, 1.0), vec2(-1.0, -3.0)
);

@vertex
fn vertScreen(
  @builtin(vertex_index) vIdx : u32
) -> @builtin(position) vec4f{
  return vec4f(ScreenPos[vIdx], 0.0, 1.0);
}

const julia_iter : i32 = 32;
fn julia_dist(z0 : vec2f, c : vec2f) -> f32 {

    var z = z0;
    var it : i32;
    for (it = 0; it < julia_iter; it+=1) {
        z = Cmul(z,z) + c;
        if (Csqr(z) > 1024) { break; }
    }

    if (it > (julia_iter-1)) { return f32(julia_iter); }
    return f32(it) - log2(log2(Csqr(z))) + 4;

}

fn fractal(p :vec2f) -> vec3f {
    let T = uTime.T * TpS/8;
    let ct = cos(T);
    let st = sin(T);

    let f0 = uSky[0].xy; let f1 = uSky[0].zw; 
    let f2 = uSky[1].xy; let f3 = uSky[1].zw; 
    let f4 = uSky[2].xy; let f5 = uSky[2].zw;
    let f6 = uSky[3].xy; let f7 = uSky[3].zw; 

    let g0 = uSky[4].xy; let g1 = uSky[4].zw; 
    let g2 = uSky[5].xy; let g3 = uSky[5].zw; 
    let g4 = uSky[6].xy; let g5 = uSky[6].zw; 
    let g6 = uSky[7].xy; let g7 = uSky[7].zw; 

    let A0 = uSky[0xA].xy; let A1 = uSky[0xA].zw;
    let B0 = uSky[0xB].xy; let B1 = uSky[0xB].zw;
    let C0 = uSky[0xC].xy; let C1 = uSky[0xC].zw;

    var z = A0 + Cmul(A1, p);
    var c = C0 + Cmul(C1, p);

    let R = abs(uSky[0xF].x); let SR = sign(uSky[0xF].x);
    let Eabs = abs(uSky[0xE].x); let SEabs = sign(uSky[0xE].x);
    let Earg = abs(uSky[0xE].y); let SEarg = sign(uSky[0xE].y);

    var prev_abs = Cabs(z);
    var prev_arg = Carg(z);

    let N = i32(uSky[0xF].z);
    var it : i32;
    for (it = 0; it < N; it+=1) {
        let z1 = z;
        let z2 = Cmul(z1,z1);
        let z3 = Cmul(z1,z2);
        let z4 = Cmul(z2,z2);
        let z5 = Cmul(z2,z3);
        let z6 = Cmul(z2,z4);
        let z7 = Cmul(z3,z4);

        // lattes
        //let f = Cpow( Cmul(z,z)+vec2f(1,0), vec2f(2,0));
        //let g = Cmul( 4*z, Cmul(z,z)-vec2f(1,0));

        let f = f0+Cmul(f1,z1)+Cmul(f2,z2)+Cmul(f3,z3)+Cmul(f4,z4)+Cmul(f5,z5)+Cmul(f6,z6)+Cmul(f7,z7);
        let g = g0+Cmul(g1,z1)+Cmul(g2,z2)+Cmul(g3,z3)+Cmul(g4,z4)+Cmul(g5,z5)+Cmul(g6,z6)+Cmul(g7,z7);
        z = Cmul(B0, z) + Cmul(B1, Cdiv(f, g)) + c;

        let curr_abs = Cabs(z); let dabs = abs(curr_abs - prev_abs);
        let curr_arg = Carg(z); let darg = abs(curr_arg - prev_arg);

        let bail_r = (
            (SR > 0 && curr_abs > R) || (SR < 0 && curr_abs < R)
        );
        let bail_abs = (
            (SEabs > 0 && dabs < Eabs) || (SEabs < 0 && dabs > Eabs)
        );
        let bail_arg = (
            (SEarg > 0 && darg < Earg) || (SEarg < 0 && darg > Earg)
        );
        
        if (
            bail_r || (bail_abs || bail_arg)
            //((SEabs*SEarg>0) && (bail_abs && bail_arg)) ||
            //((SEabs*SEarg<0) && (bail_abs || bail_arg)) 
        ) { break; }

        prev_abs = curr_abs;
        prev_arg = curr_arg;

    }

    return vec3f(
        z,
        1-(f32(it)/f32(N))
    );
}

fn skyColor(fPos : vec4f) -> vec4f {
    let skyMode = uSky[0xf].w;
    if (skyMode == 0) { return uSky[0x0]; }

    var eye = vec4f(0,0,0,-1) * uMat.ViewFromWorld;
    eye /= sqrt(-Mip(eye, eye));

    let ss = -(2*fPos.xy - uRes) / uRes.y;
    //if (dot(ss,ss) > 0.5) {discard;}

    let ar = uRes.y / uRes.x;

    var dir = vec4f(1.0, ss*ar, 0.0) * uMat.ViewFromWorld;
    dir /= sqrt(Mip(dir, dir));
    let ideal = normalize(eye.xyz + dir.xyz);
    let idealcol = 0.5*ideal+0.5;
    if (skyMode == 1) { return vec4f(idealcol, 1)*uSky[0x0]; }
    if (skyMode == 2) { return vec4f(fract(atanh(ideal)/asinh(1)), 1.0)*uSky[0x0]; }
    if (skyMode == 3) {
        return vec4f(
            vec3(0)
            +0.25*idealcol
            +max(vec3(0), sign(-ideal-0.78615) - sign(ideal-0.78615))
            +0.5*pow(2*abs(fract(atanh(-ideal)/1.0612749196484927) - 0.5), vec3(2))
            +0.3*max(vec3(0), ideal)
            +0.25*(
                pow(max(vec3(0), ideal), vec3(8))
                + pow(1-abs(ideal), vec3(1))
            )
            ,
            1
        )*uSky[0x0];
    }

    if (skyMode == 4) {
        let z = Cmob(
            -ideal.yz / (ideal.x+1),
            uSky[0x8].xy, uSky[0x8].zw,
            uSky[0x9].xy, uSky[0x9].zw,
        );

        let fz = fractal(z);
        let r = Cabs(fz.xy); let lr = log(r);
        let t = -Carg(fz.xy);

        var col = vec3f(0);
        switch (i32(uSky[0xF].y)) {
            default: { // Grid
                col = vec3f(fract(fz.xy), 0.5);
            }

            case 1: { // Esc
                col = fz.zzz;
            }
            case -1: { // RevEsc
                col = 1-fz.zzz;
            }

            case 2: { // IdealEsc
                col = fz.zzz * idealcol;
            }
            case -2: { // IdealRevEsc
                col = (1-fz.zzz) * idealcol;
            }

            case 3: { // Abs
                col = 0.5*vec3f(-tanh(lr))+0.5;
            }
            case -3: { // AbsCos
                col = (0.5*vec3f(-tanh(lr))+0.5) * (0.5*vec3f(cos(PI*lr))+0.5);
            }

            case 4: { // Arg
                col = 0.5*vec3f(cos(t), sin(t), 0)+0.5;
                col = mix(col, vec3f(0,0,1), 0.5*tanh(lr/6-5)+0.5);
                col *= 0.5*-tanh(lr/6-4.7)+0.5;
            }
            case -4: { // ArgCos
                col = 0.5*vec3f(cos(t))+0.5;
                col *= 0.5*-tanh(lr/6-4.7)+0.5;
            }

            case 5: { // AbsArg
                col = 0.5*vec3f(-tanh(lr))+0.5;
                col*= 0.5*vec3f(cos(t), sin(t), 0)+0.5;
            }

            case -5: { // AbsCosArg
                col = 0.5*vec3f(-tanh(lr))+0.5;
                col*= 0.5*vec3f(cos(PI*lr))+0.5;
                col*= 0.5*vec3f(cos(t), sin(t), 0)+0.5;
            }

            case 6: { // Plot
                col = Crgb(fz.xy);
            }

            case -120: { // Home
                col = 0.5*vec3f(-tanh(lr))+0.5;
                col*= 0.5*tanh(lr*0.75)+0.5;
                col*= 0.5*vec3f(cos(PI*(abs(2*lr))))+0.5;
                col*= hcl(t/TAU, 0.6, min(1, 1/(6*r*r)));
                col*= 0.5;
            }

            case -121: { // TERRAIN sky
                col = 0.5*vec3f(-tanh(lr))+0.5;
                col*= 0.5*tanh(lr*0.75)+0.5;
                col*= 0.5*vec3f(cos(PI*(abs(2*lr))))+0.5;
                col*= hcl(t/TAU, 0.6, min(1, 1/(6*r*r)));
                col*= 0.25;
                col+= vec3f(0.0625, 0.05, 0.2)*(1-0.5*ideal.z*ideal.z);
            }
        }

        return vec4f(col, 1);
    }

    return vec4f(0,0,0, 1);
}

@fragment
fn fragDeferred(
    @builtin(position) fPos : vec4f
) -> @location(0) vec4f {
    let ifPos = vec2i(floor(fPos.xy));

    let pos = textureLoad(gPos, ifPos, 0);
    if (pos.a == 0) { return skyColor(fPos); }
    // let posrgb = atan(pos.xyz);
    //return vec4f(0.5*posrgb+0.5, 1);

    //let material = textureLoad(gMat, ifPos, 0);
    //return vec4f(f32(material.x)/255.0, f32(material.y)/255.0, 0, 1);

    // let viewpos = mExchange * uMat.ViewFromWorld * pos;
    // let dist = atanh(length(viewpos.xyz));
    // let sd = sinh(dist);
    // let fog = 1 / (sd*sd+1);

    let col = textureLoad(gCol, ifPos, 0);

    //let depth = textureLoad(gDepth, ifPos, 0);
    //let depthk = (1-depth) * 20.0;
    //return vec4f(depthk, 0, 0, 1);

    return vec4f(col.rgb, 1);
}