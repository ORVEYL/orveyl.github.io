// adc :: orveyl.js

import * as Calc from "./math/calc.js";
import { π, Geom, Rand } from "./math/calc.js";
import { V4, B4, M4 } from "./math/vector.js";
import { SI } from "./math/si.js";

import {
    F32Buffer, Vertex, VertexBuffer,
} from "./gpubuffer.js"

import { Input } from "./input.js";

import { Scene } from "./node/scene.js";
import { Gizmo } from "./node/scene/gizmo.js";
import { Camera } from "./node/scene/camera.js";
import { Controller } from "./node/component/controller.js";
import { Ticker } from "./node/component/ticker.js";
import { Geometry, GeometryCollector } from "./node/scene/geometry.js";

export class Orveyl {

    static GPU = null;
    static Adapter = null;
    static Device = null;

    static Status = document.getElementById("status");
    static Parameters = document.getElementById("parameters");

    static Canvas;
    static MaxResolution = [1920, 1080];
    static Maximized = false;
    static DefaultResolution = [960, 720];

    static Context;

    static Textures = {};
    static TextureViews = {};

    static GPUBuffers = {};
    static VertexBuffers = {};
    static IndexBuffers = {};

    static InstanceCount = 1024;

    static ShaderModules = {};

    static BindGroupLayouts = {};
    static BindGroups = {};

    static PipelineLayouts = {};
    static Pipelines = {};

    static Step = -1;
    static T0 = 0;//Date.now();
    static TPrev = Orveyl.T0;
    static T = Orveyl.T0;
    static DT = 0;

    static Input = new Input(Orveyl.HandleInput);

    static Root =  null;
    static DefaultPlayer = null;

    static InitBreadcrumb = sc => {
        sc.attach(new Gizmo());
    };

    static InitParams = new URLSearchParams(window.location.search);

    static { Orveyl.StaticInit(); }
    static async StaticInit() {
        window.Orveyl = Orveyl;

        await Orveyl.InitHardware();
        Orveyl.InitCanvas(...Orveyl.DefaultResolution);
        Orveyl.InitContext();

        await Orveyl.InitShaderModules();
        Orveyl.InitRenderTextures();
        await Orveyl.InitTextureAssets();
        Orveyl.InitGPUBuffers();
        Orveyl.InitBindGroups();
        Orveyl.InitPipelines();

        Orveyl.InitSystemDefaults();
        Orveyl.InitInput();

        Orveyl.InitScene();

        requestAnimationFrame(Orveyl.Update);
    }

    static async InitHardware() {
        const err = (msg) => { throw new Error(msg); };
        try {
            Orveyl.GPU = navigator.gpu ??
                err("WebGPU not supported by this browser.");
            Orveyl.Adapter = await Orveyl.GPU.requestAdapter() ??
                err("Requested GPUAdapter not found.");
            Orveyl.Device = await Orveyl.Adapter.requestDevice() ??
                err("Requested GPUDevice not found.");
        } catch (e) {
            Orveyl.Status.innerHTML = [
                `orveyl.js is a 3D Non-Euclidean WebGPU Renderer, and hobby project of adc.`,
                ``,
                `To view non-interactive screenshots and demo descriptions, please visit the <a style="color:#fff" href="/gallery.html">Gallery</a>.`,
                ``,
                `This application requires WebGPU support!`,
                ``,
                `Desktop browsers to try:`,
                `-- Google Chrome`,
                `-- Microsoft Edge`,
                `-- Firefox Nightly`,
                ``,
                `For more info, see <a style="color:#fff" href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status">WebGPU Implementation Status</a>.`,
            ].join("<br>");
            throw e;
        }

    }

    static InitCanvas(width, height) {
        Orveyl.Canvas = document.querySelector("canvas");
        Orveyl.MaxResolution = [window.screen.width, window.screen.height];
        [Orveyl.Canvas.width, Orveyl.Canvas.height] = [width, height]; 
        Orveyl.Canvas.style.width = Orveyl.Canvas.width+"px";
        Orveyl.Canvas.style.height = Orveyl.Canvas.height+"px";
    }

    static ResizeCanvas(width, height) {
        Orveyl.InitCanvas(width, height);
        Orveyl.InitRenderTextures();
        Orveyl.InitBindGroups();
        Orveyl.GPUBuffers.Resolution.set([width, height]).write();
    }

    static SetMaximized(enabled) {
        Orveyl.Maximized = enabled;
        Orveyl.ResizeCanvas(
            ...(Orveyl.Maximized ? Orveyl.MaxResolution : Orveyl.DefaultResolution)
        );
        return Orveyl.Maximized;
    }

    static SetFullscreen(enabled) {
        if (enabled) {
            if (!document.fullscreenElement) {
                Orveyl.Canvas.requestFullscreen();
            }
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }

        return document.fullscreenElement;
    }

    static InitContext() {
        Orveyl.Context = Orveyl.Canvas.getContext("webgpu");

        Orveyl.CanvasFormat = Orveyl.GPU.getPreferredCanvasFormat();
        Orveyl.Context.configure({
            device: Orveyl.Device,
            format: Orveyl.CanvasFormat,
        });
    }

    static async InitShaderModules() {
        const get_shader = async (fname) => await fetch(fname).then(resp => resp.text());
        const create_shader_module = async (label, fname) => Orveyl.Device.createShaderModule({
            label: `AbsGPU.ShaderModules.${label}`,
            code: await get_shader(fname),
        });

        Orveyl.ShaderModules.Deferred = await create_shader_module(
            "Shader", "src/wgsl/shader.wgsl"
        );
    }

    static InitRenderTextures() {
        Orveyl.Textures.Depth = Orveyl.Device.createTexture({
            size: [Orveyl.Canvas.width, Orveyl.Canvas.height],
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        Orveyl.TextureViews.Depth = Orveyl.Textures.Depth.createView();

        Orveyl.Textures.GBufPosition = Orveyl.Device.createTexture({
            size: [Orveyl.Canvas.width, Orveyl.Canvas.height],
            format: "rgba32float",
            usage:
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.TEXTURE_BINDING,
        });
        Orveyl.TextureViews.GBufPosition = Orveyl.Textures.GBufPosition.createView();

        Orveyl.Textures.GBufColor = Orveyl.Device.createTexture({
            size: [Orveyl.Canvas.width, Orveyl.Canvas.height],
            format: "rgba32float",
            usage:
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.TEXTURE_BINDING,
        });
        Orveyl.TextureViews.GBufColor = Orveyl.Textures.GBufColor.createView();
    }

    static async InitTextureAssets() {
        // TODO: a single 256x256x256 texture with "pages" would be cool
        const img = new Image();
        const imgLoadPromise = new Promise(
            resolve => {
                img.onload = () => resolve();
                img.src = "res/img/circ2.png"
            }
        );
        await Promise.resolve(imgLoadPromise);

        Orveyl.Textures.Assets = [];
        Orveyl.Textures.Views = [];
        Orveyl.Textures.Samplers = [];

        const tex = Orveyl.Device.createTexture({
            size: { width: img.width, height: img.height },
            arrayLayerCount: 1,
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: "2d",
            format: Orveyl.GPU.getPreferredCanvasFormat(),
            usage:
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });

        const imgbmp = await createImageBitmap(img);
        Orveyl.Device.queue.copyExternalImageToTexture(
            { source: imgbmp },
            { texture: tex },
            [img.width, img.height]
        );

        const sampler = Orveyl.Device.createSampler({
            addressModeU: "mirror-repeat",
            addressModeV: "mirror-repeat",
            addressModeW: "mirror-repeat",

            magFilter: "nearest",
            minFilter: "nearest",
            mipMapFilter: "nearest",
        })

        Orveyl.Textures.Assets.push(tex);
        Orveyl.Textures.Views.push(tex.createView());
        Orveyl.Textures.Samplers.push(sampler);
    }

    static InitGPUBuffers() {
        // Uniforms
        Orveyl.GPUBuffers.Matrices = new F32Buffer(
            Orveyl.Device, "Orveyl.GPUBuffers.Matrices",
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            new Float32Array([
                ...M4.id,
                ...M4.id,
                ...M4.id,
            ]),
        ).write();

        Orveyl.GPUBuffers.Resolution = new F32Buffer(
            Orveyl.Device, "Orveyl.GPUBuffers.Resolution",
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            new Float32Array([Orveyl.Canvas.width, Orveyl.Canvas.height]),
        ).write();

        Orveyl.GPUBuffers.Time = new F32Buffer(
            Orveyl.Device, "Orveyl.GPUBuffers.Time",
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            new Float32Array([Orveyl.Step, Orveyl.T]),
        ).write();

        Orveyl.GPUBuffers.Sky = new F32Buffer(
            Orveyl.Device, "Orveyl.GPUBuffers.Sky",
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            new Float32Array([
                0,0,0,0, 0,0,0,0,
                0,0,0,0, 0,0,0,0,
                0,0,0,0, 0,0,0,0,
                0,0,0,0, 0,0,0,0,
                0,0,0,0, 0,0,0,0,
                0,0,0,0, 0,0,0,0,
                0,0,0,0, 0,0,0,0,
                0,0,0,0, 0,0,0,0,
            ]),
        ).write();

        Orveyl.GPUBuffers.Tint = new F32Buffer(
            Orveyl.Device, "Orveyl.GPUBuffers.Tint",
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            new Float32Array([1,1,1,1]),
        ).write();

        Orveyl.GPUBuffers.InstanceMatrices = new F32Buffer(
            Orveyl.Device, "Orveyl.GPUBuffers.InstanceMatrices",
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            new Float32Array(Orveyl.InstanceCount * 16),
        );

        // Orveyl.GPUBuffers.TextureView = new F32Buffer(
        //     Orveyl.Device, "Orveyl.GPUBuffers.TextureView",
        //     GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        //     new Float32Array(256 * 256 * 4),
        // );

        // static vertex buffers
        Orveyl.VertexBuffers.Clear = new VertexBuffer(
            Orveyl.Device, "Orveyl.VertexBuffers.Clear", 0,
            Vertex.Layout.Default,
            GPUBufferUsage.COPY_DST,
            [0,0,0,0, 0,0,0,0, 0,0,0,0],
        ).write();
    }

    static InitBindGroups() {
        Orveyl.BindGroupLayouts.Uniforms = Orveyl.Device.createBindGroupLayout({
            label: "Orveyl.BindGroupLayouts.Uniforms",
            entries: [
                { // uniforms
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" },
                },

                { // resolution
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" },
                },

                { // time
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" },
                },

                { // instance mats
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" },
                },

                { // sky params
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" },
                },

                { // geom tint color params
                    binding: 5,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" },
                },

                { // texture sampler
                    binding: 6,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    sampler: { type: "non-filtering" }
                },

                { // texture view
                    binding: 7,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    texture: { sampleType: "unfilterable-float" }
                },
            ],
        });

        Orveyl.BindGroups.Uniforms = Orveyl.Device.createBindGroup({
            label: "Orveyl.BindGroups.Uniforms",
            layout: Orveyl.BindGroupLayouts.Uniforms,
            entries: [
                { binding: 0, resource: { buffer: Orveyl.GPUBuffers.Matrices.gpubuf } },
                { binding: 1, resource: { buffer: Orveyl.GPUBuffers.Resolution.gpubuf } },
                { binding: 2, resource: { buffer: Orveyl.GPUBuffers.Time.gpubuf } },
                { binding: 3, resource: { buffer: Orveyl.GPUBuffers.InstanceMatrices.gpubuf } },
                { binding: 4, resource: { buffer: Orveyl.GPUBuffers.Sky.gpubuf } },
                { binding: 5, resource: { buffer: Orveyl.GPUBuffers.Tint.gpubuf } },
                { binding: 6, resource: Orveyl.Textures.Samplers[0] },
                { binding: 7, resource: Orveyl.Textures.Views[0] },
            ],
        });

        Orveyl.BindGroupLayouts.GBufTextures = Orveyl.Device.createBindGroupLayout({
            label: "Orveyl.BindGroupLayouts.GBufTextures",
            entries: [
                { // gDepth
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'depth' },
                },
                { // gPos
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'unfilterable-float' },
                },
                { // gCol
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'unfilterable-float'  },
                },
            ],
        });

        Orveyl.BindGroups.GBufTextures = Orveyl.Device.createBindGroup({
            label: "Orveyl.BindGroups.GBufTextures",
            layout: Orveyl.BindGroupLayouts.GBufTextures,
            entries: [
                { binding: 2, resource: Orveyl.TextureViews.Depth },
                { binding: 0, resource: Orveyl.TextureViews.GBufPosition },
                { binding: 1, resource: Orveyl.TextureViews.GBufColor },
            ],
        });
    }

    static InitPipelines() {

        Orveyl.PipelineLayouts.GBuf = Orveyl.Device.createPipelineLayout({
            label: "Orveyl.PipelineLayouts.GBuf",
            bindGroupLayouts: [
                Orveyl.BindGroupLayouts.Uniforms,
            ],
        });

        Orveyl.Pipelines.GBufMode = [
            ////////////////////////////////////
            Orveyl.Device.createRenderPipeline({
                label: "Orveyl.Pipelines.GBufMode[0]",
                layout: Orveyl.PipelineLayouts.GBuf,
    
                vertex: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "vertGBufSplat",
                    buffers: [
                        Vertex.Layout.Splat,
                    ],
                },
    
                fragment: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "fragGBuf",
                    targets: [
                        { format: "rgba32float" },
                        { format: "rgba32float" },
                    ],
                },
    
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: true,
                    depthCompare: "less",
                },
    
                primitive: {
                    topology: "triangle-list",
                },
            }),
            ////////////////////////////////////
            Orveyl.Device.createRenderPipeline({
                label: "Orveyl.Pipelines.GBufMode[1]",
                layout: Orveyl.PipelineLayouts.GBuf,
    
                vertex: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "vertGBuf",
                    buffers: [
                        Vertex.Layout.Default,
                    ],
                },
    
                fragment: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "fragGBuf",
                    targets: [
                        { format: "rgba32float" },
                        { format: "rgba32float" },
                    ],
                },
    
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: true,
                    depthCompare: "less",
                },
    
                primitive: {
                    topology: "line-list",
                },
            }),
            ////////////////////////////////////
            Orveyl.Device.createRenderPipeline({
                label: "Orveyl.Pipelines.GBufMode[2]",
                layout: Orveyl.PipelineLayouts.GBuf,
    
                vertex: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "vertGBuf",
                    buffers: [
                        Vertex.Layout.Default,
                    ],
                },
    
                fragment: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "fragGBuf",
                    targets: [
                        { format: "rgba32float" },
                        { format: "rgba32float" },
                    ],
                },
    
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: true,
                    depthCompare: "less",
                },
    
                primitive: {
                    topology: "triangle-list",
                    frontFace: "ccw",
                },
            })

        ];

        Orveyl.PipelineLayouts.Deferred = Orveyl.Device.createPipelineLayout({
            label: "Orveyl.PipelineLayouts.Deferred",
            bindGroupLayouts: [
                Orveyl.BindGroupLayouts.Uniforms,
                Orveyl.BindGroupLayouts.GBufTextures,
            ],
        });

        Orveyl.Pipelines.Deferred = Orveyl.Device.createRenderPipeline({
            label: "Orveyl.Pipelines.Deferred",
            layout: Orveyl.PipelineLayouts.Deferred,

            vertex: {
                module: Orveyl.ShaderModules.Deferred,
                entryPoint: "vertScreen",
            },

            fragment: {
                module: Orveyl.ShaderModules.Deferred,
                entryPoint: "fragDeferred",
                targets: [
                    { format: Orveyl.CanvasFormat },
                ],
            },
        });

        const blendDescs = {
                add: {
                    color: {
                        srcFactor: 'one',
                        dstFactor: 'one',
                        operation: 'add',
                    },
                    alpha: {
                        srcFactor: 'zero',
                        dstFactor: 'one',
                        operation: 'add',
                    },
                },

                sub: {
                    color: {
                        srcFactor: 'one-minus-src',
                        dstFactor: 'one',
                        operation: 'reverse-subtract',
                    },
                    alpha: {
                        srcFactor: 'zero',
                        dstFactor: 'one',
                        operation: 'add',
                    },
                },
                
                overlay: {
                    color: {
                        srcFactor: 'dst',
                        dstFactor: 'one',
                        operation: 'add',
                    },
                    alpha: {
                        srcFactor: 'dst-alpha',
                        dstFactor: 'one',
                        operation: 'add',
                    },
                },

                test: {
                    color: {
                        srcFactor: 'one',
                        dstFactor: 'dst',
                        operation: 'add',
                    },
                    alpha: {
                        srcFactor: 'one',
                        dstFactor: 'dst-alpha',
                        operation: 'add',
                    },
                },

                max: {
                    color: {
                        srcFactor: 'one',
                        dstFactor: 'one',
                        operation: 'max',
                    },
                    alpha: {
                        srcFactor: 'zero',
                        dstFactor: 'one',
                        operation: 'add',
                    },
                },

                min: {
                    color: {
                        srcFactor: 'one',
                        dstFactor: 'one',
                        operation: 'min',
                    },
                    alpha: {
                        srcFactor: 'zero',
                        dstFactor: 'one',
                        operation: 'add',
                    },
                },
        };

        const make_pipeline_modes = (label, blendDesc, depthCompareOp) => [
            ////////////////////////////////////
            Orveyl.Device.createRenderPipeline({
                label: `Orveyl.Pipelines.${label}[0]`,
                layout: Orveyl.PipelineLayouts.GBuf,
    
                vertex: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "vertGBufSplat",
                    buffers: [
                        Vertex.Layout.Splat,
                    ],
                },
    
                fragment: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "fragAdditive",
                    targets: [
                        {
                            format: Orveyl.CanvasFormat,
                            blend: blendDesc,
                        },
                    ],
                },
    
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: false,
                    depthCompare: depthCompareOp,
                },
    
                primitive: {
                    topology: "triangle-list",
                },
            }),
            ////////////////////////////////////
            Orveyl.Device.createRenderPipeline({
                label: `Orveyl.Pipelines.${label}[1]`,
                layout: Orveyl.PipelineLayouts.GBuf,
    
                vertex: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "vertGBuf",
                    buffers: [
                        Vertex.Layout.Default,
                    ],
                },
    
                fragment: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "fragAdditive",
                    targets: [
                        {
                            format: Orveyl.CanvasFormat,
                            blend: blendDesc,
                        },
                    ],
                },
    
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: false,
                    depthCompare: depthCompareOp,
                },
    
                primitive: {
                    topology: "line-list",
                },
            }),
            ////////////////////////////////////
            Orveyl.Device.createRenderPipeline({
                label: `Orveyl.Pipelines.${label}[2]`,
                layout: Orveyl.PipelineLayouts.GBuf,
    
                vertex: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "vertGBuf",
                    buffers: [
                        Vertex.Layout.Default,
                    ],
                },
    
                fragment: {
                    module: Orveyl.ShaderModules.Deferred,
                    entryPoint: "fragAdditive",
                    targets: [
                        {
                            format: Orveyl.CanvasFormat,
                            blend: blendDesc,
                        },
                    ],
                },
    
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: false,
                    depthCompare: depthCompareOp,
                },
    
                primitive: {
                    topology: "triangle-list",
                    frontFace: "ccw",
                },
            }),
        ];

        Orveyl.Pipelines.AdditiveMode = make_pipeline_modes(
            "AdditiveMode", blendDescs.add, "less"
        );
        Orveyl.Pipelines.SubtractiveMode = make_pipeline_modes(
            "SubtractiveMode", blendDescs.sub, "less"
        );
    }

    static InitSystemDefaults() {
        // TODO: Geom.Sph is still not well-supported
        Geom.Push(Geom.Hyp);

        Geometry.Device = Orveyl.Device;

        Orveyl.Root = new Scene("OrveylRoot");
        Orveyl.Root.attach(Scene.BreadcrumbRoot);

        Orveyl.DefaultPlayer = new Scene("DefaultPlayer", Orveyl.Root);

        Controller.Manager.add(
            new Controller("DefaultController", Orveyl.DefaultPlayer)
        ).useIndex(0);

        const OrbitCameraRoot = new Scene("OrbitCameraRoot", Orveyl.DefaultPlayer);
        OrbitCameraRoot.attach(new Ticker("OrbitCamAnim", null, a=>{
            a.parent.matrix.copy(
                M4.Euler(Orveyl.T/3000, π/8)
            );
        }).play());

        const OrbitCameraPivot = new Scene(
            "OrbitCameraPivot", OrbitCameraRoot, M4.MovX(-2)
        );

        Camera.Manager.add(
            new Camera("DefaultCamera", Orveyl.DefaultPlayer),
            new Camera("TopDownCamera", Orveyl.DefaultPlayer,
                M4.rm(
                    M4.MovZ(+3/2), M4.RotJ(π/2)
                )
            ),
            new Camera("SidescrollCamera", Orveyl.DefaultPlayer,
                M4.rm(
                    M4.RotI(π/2), M4.MovX(-1)
                )
            ),
            new Camera("OrbitCamera", OrbitCameraPivot),
            new Camera("XPeekCamera", Orveyl.DefaultPlayer,
                M4.rm(
                    M4.MovX(-0.5)
                )
            ),
            new Camera("ZPeekCamera", Orveyl.DefaultPlayer,
                M4.rm(
                    M4.MovZ(0.01)
                )
            ),
        ).useIndex(Orveyl.InitParams.get("cam") ?? 0);

        Gizmo.InitDefaults();
    }

    static InitInput() {
        Orveyl.Input.addKeyboardAction("enter", [Input.Key.RETURN, Input.Key.ENTER]);

        Orveyl.Input.addKeyboardAction("shift", [Input.Key.SHIFT]);
        Orveyl.Input.addKeyboardAction("ctrl", [Input.Key.CONTROL]);
        Orveyl.Input.addKeyboardAction("alt", [Input.Key.ALT]);
        Orveyl.Input.addKeyboardAction("esc", [Input.Key.ESCAPE]);
        
        Orveyl.Input.addKeyboardAction("space", [Input.Key.SPACE]);

        Orveyl.Input.addKeyboardAction("camReset", [Input.Key.HOME]);
        Orveyl.Input.addKeyboardAction("camIndex-", [Input.Key.PAGE_DOWN]);
        Orveyl.Input.addKeyboardAction("camIndex+", [Input.Key.PAGE_UP]);
        Orveyl.Input.addKeyboardAction("camZoom-", [Input.Key.MINUS]);
        Orveyl.Input.addKeyboardAction("camZoom+", [Input.Key.EQUAL]);
        Orveyl.Input.addKeyboardAction("debugDraw", [Input.Key.END]);
        
        Orveyl.Input.addKeyboardAction("sceneIndex-", [Input.Key.DELETE]);
        Orveyl.Input.addKeyboardAction("sceneIndex+", [Input.Key.INSERT]);

        Orveyl.Input.addKeyboardAction("screenshot", [Input.Key.BACK_SLASH]);

        Orveyl.Input.addKeyboardAction("x+", [Input.Key.W]);
        Orveyl.Input.addKeyboardAction("x-", [Input.Key.S]);
        Orveyl.Input.addKeyboardAction("y+", [Input.Key.A]);
        Orveyl.Input.addKeyboardAction("y-", [Input.Key.D]);
        Orveyl.Input.addKeyboardAction("z+", [Input.Key.R]);
        Orveyl.Input.addKeyboardAction("z-", [Input.Key.F]);

        Orveyl.Input.addKeyboardAction("k+", [Input.Key.E]);
        Orveyl.Input.addKeyboardAction("k-", [Input.Key.Q]);
        Orveyl.Input.addKeyboardAction("j+", [Input.Key.DOWN]);
        Orveyl.Input.addKeyboardAction("j-", [Input.Key.UP]);
        Orveyl.Input.addKeyboardAction("i+", [Input.Key.LEFT]);
        Orveyl.Input.addKeyboardAction("i-", [Input.Key.RIGHT]);

        Orveyl.Input.addGamepadAction("analogLx", Input.Gamepad.LX);
        Orveyl.Input.addGamepadAction("analogLy", Input.Gamepad.LY);
        Orveyl.Input.addGamepadAction("analogLz", Input.Gamepad.LZ);
        Orveyl.Input.addGamepadAction("analogLb", Input.Gamepad.LB);
        Orveyl.Input.addGamepadAction("analogLc", Input.Gamepad.LC);

        Orveyl.Input.addGamepadAction("analogRx", Input.Gamepad.RX);
        Orveyl.Input.addGamepadAction("analogRy", Input.Gamepad.RY);
        Orveyl.Input.addGamepadAction("analogRz", Input.Gamepad.RZ);
        Orveyl.Input.addGamepadAction("analogRb", Input.Gamepad.RB);
        Orveyl.Input.addGamepadAction("analogRc", Input.Gamepad.RC);
    }

    static HandleInput(input, dt) {

        if (input.tick("sceneIndex-") == 1) {
            Scene.Manager.usePrev();
        }
        if (input.tick("sceneIndex+") == 1) {
            Scene.Manager.useNext();
        }

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
            if (input.tick("enter") == 1) {
                Orveyl.SetMaximized(!Orveyl.Maximized);
            }
        }

        if (input.curr("shift")) {
            if (input.tick("camReset") == 1) {
                if (Scene.Breadcrumb) {
                    Controller.Manager.active?.parent?.matrix?.copy(
                        Scene.Breadcrumb.world_from_local
                    );
                } else {
                    Controller.Manager.active?.parent?.matrix?.id;
                }
            }

            if (input.tick("camIndex-") == 1) {
                Controller.Manager.usePrev();
            }
            if (input.tick("camIndex+") == 1) {
                Controller.Manager.useNext();
            }

            // remove selected breadcrumb
            if (input.tick("space") == 1) {
                if (Scene.Breadcrumb) {
                    const old = Scene.Breadcrumb;
                    Scene.Breadcrumb = old?.parent;
                    old?.detach();
                    
                    if (Scene.Breadcrumb == Scene.BreadcrumbRoot) {
                        Scene.Breadcrumb = null;
                    }

                    console.log("Selected breadcrumb:", Scene.Breadcrumb);
                }
            }
        } else {
            if (input.tick("camReset") == 1) {
                Controller.Manager.active?.parent?.matrix?.id;
            }

            if (input.tick("camIndex-") == 1) {
                Camera.Manager.usePrev();
            }
            if (input.tick("camIndex+") == 1) {
                Camera.Manager.useNext();
            }

            // add to selected breadcrumb
            if (input.tick("space") == 1) {
                const relTf = (Scene.Breadcrumb ?? Scene.BreadcrumbRoot).local_from_other(
                    Controller.Manager.active.parent
                );

                Scene.Breadcrumb = new Scene(
                    Rand.HexId(2)(), Scene.Breadcrumb ?? Scene.BreadcrumbRoot, relTf
                );

                if (Orveyl.InitBreadcrumb) Orveyl.InitBreadcrumb(Scene.Breadcrumb);
                console.log("Added breadcrumb: ", Scene.Breadcrumb);
            }
        }

        const ds = B4.of(
            input.cmp("i+", "i-") - input.curr("analogRx"),
            input.cmp("j+", "j-") + input.curr("analogRy"),
            input.cmp("k+", "k-") - input.curr("analogLb") + input.curr("analogRb"),
            input.cmp("x+", "x-") - input.curr("analogLy"),
            input.cmp("y+", "y-") - input.curr("analogLx"),
            input.cmp("z+", "z-") -(input.curr("analogRz") - input.curr("analogLz")),
        ).sc(dt/1000);

        if (input.tick("analogRc")) ds.scSpin(3.0);
        if (input.tick("analogLc")) ds.scFlux(3.0);
        if (Geom.Sig > 0) ds.scFlux(-1);

        //ds.scFlux(SI.m_to_au(SI.Ref.speed_mps.highway));

        Controller.Manager.active?.parent?.matrix?.rm(ds.exp());
    }

    static InitScene() {
        const load_demo = name => {
            const script = document.createElement('script');
            script.type = `module`;
            script.src = `/src/demos/${name}.js`;
            script.onload = function () {
                console.log(`Loaded demo: ${script.src}`);
                if (name != "default") {
                    document.title = `ORVEYL :: ${name.toUpperCase()}`;
                } else {
                    document.title = `:: ORVEYL ::`;
                }
            };

            document.title = `ORVEYL :: Loading...`;
            console.log(`Loading demo... ${script.src}`)
            document.head.appendChild(script);
        };

        load_demo(Orveyl.InitParams.get("demo") ?? "default");
    }

    static SkyMode = {
        Default: 0,
        Ideal: 1, Layers: 2, Planes: 3,
        Complex: 4,
    };

    static SetSky(r,g,b) {
        Orveyl.GPUBuffers.Sky.set([
            r,g,b,1, 0,0,0,0,
            0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0,
        ]).write();
    }

    static SetSkyComplex(Palette, Iters, Ms, As, Bs, Cs, Fs, Gs, Es) {
        Iters = Calc.Clamp(0, 256)(Iters ?? 32);
        Fs ??= [0,0, 0,0, 1,0, 0,0, 0,0, 0,0, 0,0, 0,0];
        Gs ??= [1,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0];
        Ms ??= [1,0, 0,0, 0,0, 1,0];

        As ??= [0,0, 1,0];
        Bs ??= [0,0, 1,0];
        Cs ??= [0,0, 1,0];
        const Ds = [0,0, 0,0];

        Es ??= [0,0, 4];
        
        Orveyl.GPUBuffers.Sky.set([
            ...Fs, ///Fs,
            ///Fs, ///Fs,
            ...Gs, ///Gs,
            ///Gs, ///Gs,
            ...Ms, ///Ms,
            ...As, ...Bs,
            ...Cs, ...Ds,
            Es[0],Es[1],0,0,
            Es[2], Calc.Floor(Palette), Iters, Orveyl.SkyMode.Complex,
        ]).write();
    }

    ////////////////////////////////////////////////////////////////////////////////
    static Update(t_curr) {
        requestAnimationFrame(Orveyl.Update);

        ++Orveyl.Step;
        Orveyl.TPrev = Orveyl.T;
        Orveyl.T = t_curr;
        Orveyl.DT = Orveyl.T - Orveyl.TPrev;

        // update systems
        Orveyl.Input.update(Orveyl.DT);
        Ticker.System.update(Orveyl.DT);

        // update uniforms
        Orveyl.GPUBuffers.Matrices.set([
            ...M4.Perspective(
                π/2, Orveyl.Canvas.width / Orveyl.Canvas.height, 1/128, 1
            ),
            ...Camera.Manager.active?.local_from_world ?? M4.id,
            ...M4.id,
        ]).write();

        Orveyl.GPUBuffers.Time.set([Orveyl.Step, Orveyl.T], 0).write();

        Orveyl.Draw();
    }

    static Draw() {
        const opaque_desc = {
            colorAttachments: [
                {
                    view: Orveyl.TextureViews.GBufPosition,
                    loadOp: 'load',
                    storeOp: 'store',
                },
                {
                    view: Orveyl.TextureViews.GBufColor,
                    loadOp: 'load',
                    storeOp: 'store',
                },
            ],

            depthStencilAttachment: {
                view: Orveyl.TextureViews.Depth,
                depthLoadOp: "load",
                depthStoreOp: "store",
            },
        };

        const blend_desc = {
            colorAttachments: [
                {
                    view: Orveyl.Context.getCurrentTexture().createView(),
                    loadOp: 'load',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: Orveyl.TextureViews.Depth,
                depthLoadOp: "load",
                depthStoreOp: "store",
            },
        };
        
        // TODO: only collect if geom has changed
        const geom_collector = new GeometryCollector();
        if (Scene.Manager.active?.visible) {
            geom_collector.visit(Scene.Manager.active);
        }
        geom_collector.visit(Scene.BreadcrumbRoot);

        Orveyl.ClearGBuf();
        Orveyl.DrawGeom(geom_collector.data[0], opaque_desc, Orveyl.Pipelines.GBufMode);
        Orveyl.DrawDeferred();

        const blend_order = [1, 2];
        for (let i of blend_order) {
            Orveyl.DrawGeom(geom_collector.data[i], blend_desc,
                [   null,
                    Orveyl.Pipelines.AdditiveMode,
                    Orveyl.Pipelines.SubtractiveMode,
                ][i],
            );
        }
    }

    static ClearGBuf() {
        const enc = Orveyl.Device.createCommandEncoder();
        const pass = enc.beginRenderPass({
            colorAttachments: [
                {
                    view: Orveyl.TextureViews.GBufPosition,
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                },
                {
                    view: Orveyl.TextureViews.GBufColor,
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],

            depthStencilAttachment: {
                view: Orveyl.TextureViews.Depth,
                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            },
        });

        pass.setPipeline(Orveyl.Pipelines.GBufMode[2]);
        pass.setBindGroup(0, Orveyl.BindGroups.Uniforms);
        pass.setVertexBuffer(0, Orveyl.VertexBuffers.Clear.gpubuf);
        pass.draw(1);
        pass.end();

        Orveyl.Device.queue.submit([enc.finish()]);
    }

    static DrawGeom(geom_src, passDesc, pipeline_modes) {
        for (let geom of geom_src) {
            const enc = Orveyl.Device.createCommandEncoder();
            const pass = enc.beginRenderPass(passDesc);
            pass.setPipeline(pipeline_modes[geom.mode]);
            pass.setBindGroup(0, Orveyl.BindGroups.Uniforms);

            pass.setVertexBuffer(0, geom.vb.gpubuf);
            if (geom.ib) {
                pass.setIndexBuffer(geom.ib.gpubuf, "uint32");
            }

            Orveyl.GPUBuffers.Matrices.set(geom.world_from_local, 2*16);
            Orveyl.GPUBuffers.Matrices.write();

            Orveyl.GPUBuffers.Tint.set(geom.tint ?? [1,1,1,1]).write();

            if (geom.mode == 0) {
                pass.draw(6, geom.vb.count);
            } else {
                if (geom.ib) {
                    pass.drawIndexed(geom.ib.count);
                } else {
                    pass.draw(geom.vb.count, 1);
                }
            }
            pass.end();

            Orveyl.Device.queue.submit([enc.finish()]);
        }
    }

    static DrawDeferred() {
        const enc = Orveyl.Device.createCommandEncoder()
        const pass = enc.beginRenderPass({
            colorAttachments: [
                {
                    view: Orveyl.Context.getCurrentTexture().createView(),
                    clearValue: [0,0,0, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        });

        pass.setPipeline(Orveyl.Pipelines.Deferred);
        pass.setBindGroup(0, Orveyl.BindGroups.Uniforms);
        pass.setBindGroup(1, Orveyl.BindGroups.GBufTextures);
        pass.draw(3);
        pass.end();

        Orveyl.Device.queue.submit([enc.finish()]);
    }

};