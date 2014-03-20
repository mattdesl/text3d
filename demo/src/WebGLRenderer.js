
var Class = require('klasse');
var WebGLContext = require('kami').WebGLContext;

var MeshRenderer = require('kami-mesh').MeshRenderer;

var ShaderProgram = require('kami').ShaderProgram;

var Matrix4 = require('vecmath').Matrix4;
var OrthographicCamera = require('cam3d').OrthographicCamera;
var PerspectiveCamera = require('cam3d').PerspectiveCamera;

var Vector3 = require('vecmath').Vector3;
var Matrix3 = require('vecmath').Matrix3;

var rot = new Matrix3();
var tmpVec = new Vector3();
var tmpVec2 = new Vector3();
var tmpVec3 = new Vector3();

var WebGLRenderer = new Class({

    initialize: function(canvas, vert, frag) {
        this.canvas = canvas;
        this.context = new WebGLContext(canvas.width, canvas.height, canvas);

        this.mesh = null;

        this.shader = new ShaderProgram(this.context, vert, frag);
        if (this.shader.log)
            console.warn(this.shader.log);
    },

    setup: function(particles) {
        if (this.mesh)
            this.mesh.destroy();

        this.mesh = new MeshRenderer(this.context, {
            hasColors: true,
            maxVertices: particles.length * 4, //4 floats per vertex
            hasNormals: false,
            numTexCoords: 0
        });
    },

    render: function(particles, camera, color, points) {
        var gl = this.context.gl;
        var renderer = this.mesh;
        var shader = this.shader;

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.colorMask(true, true, true, true);
        gl.disable(gl.CULL_FACE);
        
        renderer.shader = shader;
        renderer.begin(camera.combined, points ? gl.POINTS : gl.TRIANGLES);
        
        var r = color.r,
            g = color.g,
            b = color.b,
            a = color.a;

        for (var i=0; i<particles.length; i++) {
            var p = particles[i];
            var pos = p.position;

            renderer.color(r, g, b, a);
            renderer.vertex( pos.x, pos.y, pos.z );
        }

        renderer.end();
    },
});


module.exports = WebGLRenderer;