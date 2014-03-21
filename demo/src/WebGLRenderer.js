
var Class = require('klasse');
var WebGLContext = require('kami').WebGLContext;

var MeshRenderer = require('kami-mesh').MeshRenderer;

var ShaderProgram = require('kami').ShaderProgram;
var SpriteBatch = require('kami').SpriteBatch;
var FrameBuffer = require('kami').FrameBuffer;
var Texture = require('kami').Texture;

var Matrix4 = require('vecmath').Matrix4;
var OrthographicCamera = require('cam3d').OrthographicCamera;
var PerspectiveCamera = require('cam3d').PerspectiveCamera;

var Vector3 = require('vecmath').Vector3;
var Matrix3 = require('vecmath').Matrix3;

var rot = new Matrix3();
var tmpVec = new Vector3();
var tmpVec2 = new Vector3();
var tmpVec3 = new Vector3();

var AA_SIZE = 2048;

var WebGLRenderer = new Class({

    initialize: function(canvas, vert, frag, useAA) {
        this.context = new WebGLContext(canvas.width, canvas.height, canvas);

        this.mesh = null;

        this.useAA = useAA;

        this.shader = new ShaderProgram(this.context, vert, frag);
        if (this.shader.log)
            console.warn(this.shader.log);


        if (this.useAA) {
            // SpriteBatch.DEFAULT_FRAG_SHADER = fxaaFrag;
            this.batch = new SpriteBatch(this.context);
            // this.batch.shader.bind();
            // this.batch.shader.setUniformf("texcoordOffset", 1.0/AA_SIZE, 1.0/AA_SIZE);

            this.aaBuffer = new FrameBuffer(this.context, AA_SIZE, AA_SIZE);
            this.aaBuffer.texture.setFilter(Texture.Filter.LINEAR);
        }
    },

    resize: function(width, height) {
        this.context.width = width;
        this.context.height = height;        
    },

    setup: function(particles) {
        //TODO: fix!!
        // if (this.mesh)
        //     this.mesh.destroy();

        this.mesh = new MeshRenderer(this.context, {
            hasColors: true,
            maxVertices: particles.length * 2 * 4, //4 floats per vertex
            hasNormals: false,
            numTexCoords: 0
        });
    },

    destroy: function() {
        if (this.aaBuffer) 
            this.aaBuffer.destroy();
        if (this.batch)
            this.batch.destroy();
        this.shader.destroy();
        if (this.mesh)
            this.mesh.destroy();
    },

    _renderNormal: function(particles, camera, color, lines) {
        var gl = this.context.gl;
        var renderer = this.mesh;
        var shader = this.shader;

        renderer.shader = shader;
        renderer.begin(camera.combined, lines ? gl.LINES : gl.TRIANGLES);
        
        var r = color.r,
            g = color.g,
            b = color.b,
            a = color.a;

        if (lines) {
            for (var i=0; i<particles.length; i+=3) {
                var p1 = particles[i];
                var p2 = particles[i+1];
                var p3 = particles[i+2];
                var p4 = (i+3)<particles.length ? particles[i+3] : null;
                

                renderer.color(r, g, b, a);
                renderer.vertex( p1.position.x, p1.position.y, p1.position.z );

                renderer.color(r, g, b, a);
                renderer.vertex( p2.position.x, p2.position.y, p2.position.z );

                renderer.color(r, g, b, a);
                renderer.vertex( p3.position.x, p3.position.y, p3.position.z );
                
                renderer.color(r, g, b, a);
                renderer.vertex( p1.position.x, p1.position.y, p1.position.z );

                if (p4 !== null) {
                    renderer.color(0, 0, 0, 0);
                    renderer.vertex( p1.position.x, p1.position.y, p1.position.z );
                    renderer.color(0, 0, 0, 0);
                    renderer.vertex( p4.position.x, p4.position.y, p4.position.z );
                }
                    
                // renderer.color(0, 0, 0, 0);
                // renderer.vertex( p2.position.x, p2.position.y, p2.position.z );
                // renderer.color(0, 0, 0, 0);
                // renderer.vertex( p3.position.x, p3.position.y, p3.position.z );

            }
        } else {
            for (var i=0; i<particles.length; i++) {
                var p = particles[i];
                var pos = p.position;

                renderer.color(r, g, b, a);
                renderer.vertex( pos.x, pos.y, pos.z );
            }
        }
            

        renderer.end();
    },

    render: function(width, height, particles, camera, color, lines) {
        var useAA = this.useAA;
        var gl = this.context.gl;

        width *= 1/camera.zoom;
        height *= 1/camera.zoom;

        if (camera.viewportWidth > AA_SIZE || camera.viewportHeight > AA_SIZE ||
            width > AA_SIZE/2 || height > AA_SIZE/2) {
            useAA = false;
        }

        //ensure our states are set nicely
        gl.blendEquation(gl.FUNC_ADD);
        gl.activeTexture(gl.TEXTURE0);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.colorMask(true, true, true, true);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);

        if (useAA) {
            var fbo = this.aaBuffer;
            var fboCam = this.fboCamera;

            var w = camera.viewportWidth,
                h = camera.viewportHeight;
                
            camera.viewportWidth = fbo.width/2;
            camera.viewportHeight = -fbo.height/2;
            camera.update();

            fbo.begin();

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this._renderNormal(particles, camera, color, lines);
            fbo.end();

            var out = AA_SIZE/2;

            this.batch.resize(w, h);
            this.batch.begin();
            this.batch.draw(fbo.texture, (w-out)/2, (h-out)/2, out, out);
            this.batch.end();
            
            camera.viewportWidth = w;
            camera.viewportHeight = h;
            camera.update();
        } else {
            this._renderNormal(particles, camera, color, lines);
        }
        
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    },
});


module.exports = WebGLRenderer;