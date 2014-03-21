!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.TextManager=e():"undefined"!=typeof global?global.TextManager=e():"undefined"!=typeof self&&(self.TextManager=e())}(function(){var define,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;

var tmp = new Vector3();

/**
 * Creates a "physical text" object where each point (in triangles)
 * has a velocity, position, mass, etc.
 *
 * This does not hold on to the Text3D object
 */
var Constraint = new Class({

	initialize: function(p1, p2, stiffness, restingDistance) {
		this.p1 = p1;
		this.p2 = p2;

		if (typeof restingDistance !== "number")
			restingDistance = p1.position.distance(p2.position);

        
		this.restingDistance = restingDistance;
		this.originalRestingDistance = this.restingDistance;
        this.stiffness = typeof stiffness === "number" ? stiffness : 0.01;
        

        this.tearDistance = Number.MAX_VALUE;
	},


    solve: function() {
        var p1 = this.p1,
            p2 = this.p2,
            restingDistance = this.restingDistance,
            stiffness = this.stiffness;
        

        var dx = p2.position.x - p1.position.x;
        var dy = p2.position.y - p1.position.y;
        var dz = p2.position.z - p1.position.z;

        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);


        
        //ratio for resting distance
        var restingRatio = d===0 ? restingDistance : (restingDistance - d) / d;
        
        //invert mass quantities
        var im1 = 1.0 / p1.mass;
        var im2 = 1.0 / p2.mass;
        var scalarP1 = (im1 / (im1 + im2)) * stiffness;
        var scalarP2 = stiffness - scalarP1;
        
        var spring = 1;

        //push/pull based on mass
        p1.velocity.x -= dx * scalarP1 * restingRatio * spring;
        p1.velocity.y -= dy * scalarP1 * restingRatio * spring;
        p1.velocity.z -= dz * scalarP1 * restingRatio * spring;

        p2.velocity.x += dx * scalarP2 * restingRatio * spring;
        p2.velocity.y += dy * scalarP2 * restingRatio * spring;
        p2.velocity.z += dz * scalarP2 * restingRatio * spring;

        // var drest = this.originalRestingDistance - restingDistance;
        // drest = Math.sqrt(drest * drest)
        // this.restingDistance += drest * 0.003;


        return d;
    }
});


module.exports = Constraint;
},{"klasse":44,"vecmath":64}],2:[function(require,module,exports){
// var domready = require('domready');
// require('raf.js');

var Vector2 = require('vecmath').Vector2;
var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;

var World = require('./World');
var Constraint = require('./Constraint');
var smoothstep = require('interpolation').smoothstep;
var lerp = require('interpolation').lerp;

var util = require('text3d').util;
var Glyph = require('text3d').Glyph;
var Text3D = require('text3d').Text3D;

var OrthographicCamera = require('cam3d').OrthographicCamera;
var PerspectiveCamera = require('cam3d').PerspectiveCamera;

var Class = require('klasse');

///hook in typeface
var _typeface_js = require('./typeface-stripped');
var uni_sans = require('../vendor/uni_sans_bold_B.typeface');

_typeface_js.loadFace(uni_sans);

var WebGLRenderer = require('./WebGLRenderer');

var tmp = new Vector3();
var tmp2 = new Vector3();
var tmp3 = new Vector3();
var zero = new Vector3();
var force = new Vector3();

var fs = require('fs');
var vert = "attribute vec4 Position;\nattribute vec4 Color;\n// attribute vec2 TexCoord0;\n\nuniform mat4 u_projModelView;\n\nvarying vec4 v_col;\n// varying vec2 v_texCoord0;\n\nvoid main() {\n\tgl_Position = u_projModelView * vec4(Position.xyz, 1.0);\n\tv_col = Color;\n\t// v_texCoord0 = TexCoord0;\n}";
var frag = "#ifdef GL_ES\nprecision mediump float;\n#endif\nvarying vec4 v_col;\n// varying vec2 v_texCoord0;\n// uniform sampler2D u_sampler0;\n\nvoid main() {\n\tgl_FragColor = v_col; //* texture2D(u_sampler0, v_texCoord0);\n}";
var fxaa = "/*#ifdef GL_ES\nprecision mediump float;\n#endif\nvarying vec4 vColor;\nvarying vec2 vTexCoord0;\n\nuniform sampler2D u_texture0;\n\nvoid main() {\n    gl_FragColor = vColor * texture2D(u_texture0, vTexCoord0) * 0.5;\n}*/\n\n// FXAA shader, GLSL code adapted from:\n// http://horde3d.org/wiki/index.php5?title=Shading_Technique_-_FXAA\n// Whitepaper describing the technique:\n// http://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf\n\n\n#ifdef GL_ES\nprecision mediump float;\nprecision mediump int;\n#endif\n\nuniform sampler2D u_texture0;\n\n// The inverse of the texture dimensions along X and Y\nuniform vec2 texcoordOffset;\n\nvarying vec4 vColor;\nvarying vec2 vTexCoord0;\n\nvoid main() {\n    // The parameters are hardcoded for now, but could be\n    // made into uniforms to control fromt he program.\n    float FXAA_OPT = 125.0;\n    float FXAA_SPAN_MAX = FXAA_OPT;\n    float FXAA_REDUCE_MUL = 1.0/FXAA_OPT;\n    float FXAA_REDUCE_MIN = (1.0/10.0);\n\n    vec3 rgbNW = texture2D(u_texture0, vTexCoord0.xy + (vec2(-1.0, -1.0) * texcoordOffset)).xyz;\n    vec3 rgbNE = texture2D(u_texture0, vTexCoord0.xy + (vec2(+1.0, -1.0) * texcoordOffset)).xyz;\n    vec3 rgbSW = texture2D(u_texture0, vTexCoord0.xy + (vec2(-1.0, +1.0) * texcoordOffset)).xyz;\n    vec3 rgbSE = texture2D(u_texture0, vTexCoord0.xy + (vec2(+1.0, +1.0) * texcoordOffset)).xyz;\n    \n    vec4 rgba = texture2D(u_texture0, vTexCoord0.xy);\n    vec3 rgbM = rgba.xyz;\n\n    vec3 luma = vec3(0.299, 0.587, 0.114);\n    float lumaNW = dot(rgbNW, luma);\n    float lumaNE = dot(rgbNE, luma);\n    float lumaSW = dot(rgbSW, luma);\n    float lumaSE = dot(rgbSE, luma);\n    float lumaM  = dot( rgbM, luma);\n\n    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n\n    vec2 dir;\n    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n\n    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n      \n    float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);\n\n    dir = min(vec2(FXAA_SPAN_MAX,  FXAA_SPAN_MAX), \n          max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * texcoordOffset;\n    \t\n    vec3 rgbA = (1.0/2.0) * (\n                texture2D(u_texture0, vTexCoord0.xy + dir * (1.0/3.0 - 0.5)).xyz +\n                texture2D(u_texture0, vTexCoord0.xy + dir * (2.0/3.0 - 0.5)).xyz);\n    vec3 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (\n                texture2D(u_texture0, vTexCoord0.xy + dir * (0.0/3.0 - 0.5)).xyz +\n                texture2D(u_texture0, vTexCoord0.xy + dir * (3.0/3.0 - 0.5)).xyz);\n    float lumaB = dot(rgbB, luma);\n\n    if((lumaB < lumaMin) || (lumaB > lumaMax)){\n      gl_FragColor.xyz=rgbA;\n    } else {\n      gl_FragColor.xyz=rgbB;\n    }\n    gl_FragColor.a = rgba.a;\n      \n    gl_FragColor *= vColor;\n}";

//draws the particles as a triangle list
function drawTriangles(context, particles, camera, fill, noIntersect) {
    context.beginPath();
    for (var j=0; j<particles.length; j+=3) {
        var p1 = particles[j].position,
            p2 = particles[j+1].position,
            p3 = particles[j+2].position;

        if (noIntersect)
            context.beginPath();

        // tmp.set(p1);
        camera.project(p1, tmp);
        var ox = tmp.x,
            oy = tmp.y;
        context.moveTo(tmp.x, tmp.y);

        // tmp.set(p2);
        camera.project(p2, tmp);
        context.lineTo(tmp.x, tmp.y);

        // tmp.set(p3);
        camera.project(p3, tmp);
        context.lineTo(tmp.x, tmp.y);

        if (noIntersect) {
            context.closePath();
            if (fill)
                context.fill();
            else
                context.stroke();
        } else {
            context.lineTo(ox, oy);
        }
    }
    if (!noIntersect) {

        if (fill)
            context.fill();
        else
            context.stroke();
    }
}

//Draws the text as triangles, with some custom deformation...
function drawPoints(context, particles) {
    var sz = 1;

    for (var i=0; i<particles.length; i++) {
        var particle = particles[i];
        var pos = particle.position;
        tmp.set(pos);
        // camera.project(pos, tmp);

        context.fillRect(tmp.x-sz/2, tmp.y-sz/2,sz, sz);
    }
}

function easeOutExpo (t, b, c, d) {
    return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
}

var TextManager = new Class({

    initialize: function(text, options, TweenLite) {
        options = options||{};

        this.face = util.getFace('uni sans bold');
        this.fontSize = options.fontSize || 50;

        this.snap = typeof options.snap === "number" ? options.snap : 0.995;

        var steps = typeof options.steps || 10;
        var simplify;

        if (typeof options.simplify === "number") {
            if (options.simplify === 0)
                simplify = 0;
            else
                simplify = this.fontSize/Math.max(10, options.simplify)
        } else
            simplify = this.fontSize/50;

        
        Glyph.SAVE_CONTOUR = false;

        this.text = text;
        this.textMesh = new Text3D(text, this.face, this.fontSize, steps, simplify);
        
        this.resetting = false,
        this.resetTime = 0,
        this.resetDuration = 10;

        var shockParams = new Vector3(10, 0.7, 0.1);
        this.mouse = new Vector3();
        this.lastMouse = new Vector3();
        var normCoords = new Vector3();

        this.color = { r: 0, g: 0, b: 0, a: 1 };

        this.camera = new OrthographicCamera();
        
        this.world = new World();
        this.world.addText3D(this.textMesh);

        this.webGLRenderer = null;

        this.scale = 1.0;
        this.width = this.textMesh.bounds.maxX-this.textMesh.bounds.minX;
        this.height = this.textMesh.bounds.maxY-this.textMesh.bounds.minY;

        this.position = new Vector3(0, 0, 0);

        this.currentGlyph = -1;
        this.glyphData = [];
        for (var i=0; i<this.textMesh.glyphs.length; i++) {
            this.glyphData[i] = {
                mouseOver: false,
                tween: 0.0,
                resetting: false,
            };
        }

        //no floor
        // world.floor = height;

        //destroy the text object to free up some memory
        this.textMesh.destroy();

        this.style = 0;
        this._finishTweenReset = this.finishTweenReset.bind(this);
        this._startTweenReset = this.startTweenReset.bind(this);

        this._createRandomForces();
    },

    finishTweenReset: function(index) {
        this.glyphData[index].resetting = false;
        this.glyphData[index].tweening = false;
        this.glyphData[index].tween = 0;
    },

    startTweenReset: function(index) {
        this.glyphData[index].resetting = true;
        this._saveGlyph(index);
    },


    update: function(dt) {
        var world = this.world,
            resetDuration = this.resetDuration;

        world.step(dt);

        // if (this.resetting) {
        //     var a = this.resetTime / resetDuration;
        //     a = easeOutExpo(this.resetTime, 0, 1, resetDuration);
            
        //     // if (a > this.snap) {//snap to edge
        //     //     a = 1;
        //     // }

        //     this.resetTime += 0.1;
        //     if (this.resetTime > resetDuration) {
        //         this.resetting = false;
        //         this.resetTime = 0;

        //         var a = 1;
        //         for (var i=0; i<world.particles.length; i++) {
        //             var p = world.particles[i];

        //             p.position.copy(p.lastPosition).lerp(p.original, a);
        //             p.velocity.lerp(zero, a);
        //             p.acceleration.lerp(zero, a);
        //         }

        //     } else {
        //         for (var i=0; i<world.particles.length; i++) {
        //             var p = world.particles[i];

        //             p.position.copy(p.lastPosition).lerp(p.original, a);
        //             p.velocity.lerp(zero, a);
        //             p.acceleration.lerp(zero, a);
        //         }
        //     }
        // } 

        this._resolveTweens();
        this._updateKillTweens();

        if (this.style === 0)
            this._updateMouseInteractions();
        else if (this.style === 1)
            this._updateMouseInteractions2();
        else if (this.style === 2)
            this._updateMouseInteractions3();
    },

    _resolveTweens: function() {
        var world = this.world;
        for (var i=0; i<world.particles.length; i++) {
            var p = world.particles[i];
            var glyphIndex = p.glyphIndex;

            var gd = this.glyphData[glyphIndex];

            if (gd.resetting) {
                var a = gd.tween;
                p.position.copy(p.lastPosition).lerp(p.original, a);
                p.velocity.lerp(zero, a);
                p.acceleration.lerp(zero, a);
            }
        }
    },

    _createRandomForces: function() {
        var world = this.world;

        for (var i=0; i<world.particles.length; i++) {
            

            var scale = 10;
            tmp.random();
            tmp.z = 0;
            tmp.x *= scale;
            tmp.y *= scale;



            world.particles[i].finalPosition.add(tmp);
            // world.particles[i+1].position.add(tmp);
            // world.particles[i+2].position.add(tmp);
            // var p = world.particles[i];

            // p.position.add(tmp);
        }
    },

    _updateKillTweens: function() {
        var mouse = this.mouse;

        for (var i=0; i<this.textMesh.glyphs.length; i++) {
            var gData = this.glyphData[i];

            var g = this.textMesh.glyphs[i];
            var b = g.bounds;

            var withinGlyph = mouse.x > b.minX && mouse.x < b.maxX && mouse.y > b.minY && mouse.y < b.maxY
            

            var dist = mouse.distance(tmp.set( b.minX+ (b.maxX-b.minX)/2, b.minY + (b.maxY-b.minY)/2 ));

            if (dist < 50) {
                if (gData.tweening)
                    TweenLite.killTweensOf( gData );
                gData.mouseOver = true;
                gData.tweening = false;
                gData.resetting = false;

                //The mouse is under this !
            } else if (gData.mouseOver) {
                gData.mouseOver = false;
                // gData.tweening = true;
                // // gData.resetting = true;
                
                // TweenLite.to( gData, 0.5, {
                //     overwrite: 1,
                //     tween: 1.0,
                //     delay: 0.5,
                //     onStart: this._startTweenReset,
                //     onStartParams: [ i ],
                //     onComplete: this._finishTweenReset,
                //     onCompleteParams: [ i ]
                // });
            }
        }
    },

    _updateGlyphHitTest: function() {

        // this.currentGlyph = this.getGlyphUnderMouse();
                
        

        //Any remaining glyphs that aren't tweening, and aren't under mouse, just tween them 
        //after a short delay
        for (var i=0; i<this.textMesh.glyphs.length; i++) {
            var gData = this.glyphData[i];
            if (!gData.mouseOver && !gData.tweening) {
                gData.tweening = true;
                gData.resetting = false;

                TweenLite.to( gData, 0.5, {
                    overwrite: 1,
                    tween: 1.0,
                    delay: 1.5 + (i*.01),
                    onStart: this._startTweenReset,
                    onStartParams: [ i ],
                    onComplete: this._finishTweenReset,
                    onCompleteParams: [ i ]
                });
            }
        }

        this._updateKillTweens();

        // if (oldGlyph !== this.currentGlyph && oldGlyph !== -1) {
        //     console.log("LEAVE", oldGlyph)
        // }
    },

    _updateMouseInteractions: function() {
        var mouse = this.mouse,
            lastMouse = this.lastMouse,
            world = this.world,
            width = this.camera.viewportWidth,
            height = this.camera.viewportHeight;


        var mousePush = 5;
        var mousePushThreshold = 15;

        var explodeThreshold = 50;
        var strength = 3;
        tmp3.copy( mouse );
        tmp3.sub( lastMouse );
        tmp3.normalize();
        tmp3.scale(mousePush);

        var mouseMoved = mouse.distance(lastMouse) > 5;

        var explode = true;
        for (var i=0; i<world.particles.length; i++) {
            var p = world.particles[i];

                
            var pDist = p.position.distance(mouse);
            if ( pDist < mousePushThreshold) {
                if (mouseMoved) {
                    p.velocity.add(tmp3);
                }
            }

            if (pDist < explodeThreshold) {
                force.random();
                // force.z = 0;

                

                var dist = this._normalizedDistanceFromMouse(p);
                if (dist < 0.5) {
                    var power = lerp(strength, 0.0, dist);
                    force.scale( power );

                    force.z = 0;

                    p.velocity.add(force);
                }
                
                    
            } else {
                // var a = 0.1;
                // p.position.lerp(p.original, a);
                // p.velocity.lerp(zero, a);
                // p.acceleration.lerp(zero, a);
            }
        }

        lastMouse.copy(mouse);
    },

    _normalizedDistanceFromMouse: function(p) {
        var distThreshold = 0.1;
        var width = this.camera.viewportWidth,
            height = this.camera.viewportHeight

        //normalized position
        tmp.copy( p.position );
        tmp.x /= width;
        tmp.y /= height;

        tmp2.copy( this.mouse );
        tmp2.x /= width;
        tmp2.y /= height;

        var dist = tmp.distance(tmp2);
        dist = smoothstep(0.0, distThreshold, dist);
        return dist;
    },

    _updateMouseInteractions2: function() {
        var mouse = this.mouse,
            lastMouse = this.lastMouse,
            world = this.world;

        tmp.copy( mouse );
        tmp.sub( lastMouse );
        tmp.normalize();
            
        // tmp2.random();
        // tmp2.scale(10);
        // tmp2.z = 0;
        // tmp.add( tmp2 );

        tmp.scale(5);

        if ( mouse.distance(lastMouse) > 5 ) {
            for (var i=0; i<world.particles.length; i++) {
                var p = world.particles[i];

                if (p.position.distance(mouse) < 50) {
                    p.velocity.add(tmp);
                }

                   
            }
        }

        lastMouse.copy(mouse);
    },

    _updateMouseInteractions3: function() {
        var mouse = this.mouse,
            lastMouse = this.lastMouse,
            world = this.world,
            width = this.camera.viewportWidth,
            height = this.camera.viewportHeight;

        for (var i=0; i<world.particles.length; i++) {
            var p = world.particles[i];

            //normalized position
            tmp.copy( p.position );
            tmp.x /= width;
            tmp.y /= height;

            tmp2.copy( mouse );
            tmp2.x /= width;
            tmp2.y /= height;


            var dist = tmp.distance(tmp2);

            // var power = (1-dist) * 10;
            dist = smoothstep(0.0, 0.10, dist);

            var strength = 1;
            var power = lerp(strength, 0.0, dist);

            tmp.copy(p.original);
            tmp.lerp(p.finalPosition, dist * power);
            p.position.copy(tmp);
        }
    },

    _savePosition: function() {
        var world = this.world;

        for (var i=0; i<world.particles.length; i++) {
            var p = world.particles[i];
            p.lastPosition.copy(p.position);
        }   
    },

    _saveGlyph: function(glyphIndex) {
        var world = this.world;

        for (var i=0; i<world.particles.length; i++) {
            var p = world.particles[i];
            if (p.glyphIndex === glyphIndex)
                p.lastPosition.copy(p.position);
        }   
    },

    initWebGL: function(canvas, antialiasing) {        
        this.webGLRenderer = new WebGLRenderer(canvas, vert, frag, antialiasing, fxaa);
        this.webGLRenderer.setup(this.world.particles);
        
        this.resize(canvas.width, canvas.height);
    },

    //Does NOT resize WebGL/Canvas or glViewport
    resize: function(width, height) {
        var yDown = !!this.webGLRenderer;

        if (this.webGLRenderer) {
            this.webGLRenderer.resize(width, height);
        }

        var zoom = 1/this.scale;
        this.camera.zoom = zoom;
        this.camera.setToOrtho(yDown, width, height);
        this.camera.translate(-this.position.x*zoom, -this.position.y*zoom, this.position.z);
        this.camera.update();
    },

    updateCamera: function() {
        this.resize(this.camera.viewportWidth, this.camera.viewportHeight);
    },

    setPosition: function(x, y, z) {
        this.position.set(x, y, z);
        this.resize(this.camera.viewportWidth, this.camera.viewportHeight);
    },

    setZoom: function(zoom) {
        this.camera.zoom = zoom;
        this.camera.update();
    },

    onTouchMove: function(x, y) {
        tmp.set(x, this.webGLRenderer ? y : this.camera.viewportHeight-y, 0);
        this.camera.unproject(tmp, tmp2);
        this.mouse.set(tmp2.x, tmp2.y);

        this._updateGlyphHitTest();
    },

    onTouchStart: function(x, y) {
        tmp.set(x, this.webGLRenderer ? y : this.camera.viewportHeight-y, 0);
        this.camera.unproject(tmp, tmp2);
        this.mouse.set(tmp2.x, tmp2.y);
    },

    onTouchEnd: function(x, y) {
        tmp.set(x, this.webGLRenderer ? y : this.camera.viewportHeight-y, 0);
        this.camera.unproject(tmp, tmp2);
        this.mouse.set(tmp2.x, tmp2.y);
    },

    //Resets all triangles to their original position
    resetAll: function() {
        this.resetTime = 0;
        this.resetting = true;
        this._savePosition();
    },

    renderCanvas: function(context, fill, noIntersect) {
        fill = typeof fill === "boolean" ? fill : true;
        noIntersect = typeof noIntersect === "boolean" ? noIntersect : false;

        var style = "rgba("+ ~~(this.color.r*255)+","+ ~~(this.color.g*255) +","+ ~~(this.color.b*255) + "," + this.color.a +")";
        if (fill)
            context.fillStyle = style;
        else
            context.strokeStyle = style;

        drawTriangles(context, this.world.particles, this.camera, fill, noIntersect);
    },

    destroy: function() {
        this.world.points.length = 0;
        this.text = null;
        this.world = null;
        this.webGLRenderer = null;
        this.camera = null;
        this.face = null;
    },

    renderWebGL: function(points) {
        if (this.webGLRenderer) {
            this.webGLRenderer.render(this.width, this.height, 
                        this.world.particles, this.camera, this.color, points);
        }
    },
});


module.exports = TextManager;


// renderer = new TextRenderer("STORYTELLING.\nCRAFT.\nEXPLOSIONS.", glContext);
// renderer.update();
// renderer.draw();


},{"../vendor/uni_sans_bold_B.typeface":6,"./Constraint":1,"./WebGLRenderer":3,"./World":4,"./typeface-stripped":5,"cam3d":17,"fs":65,"interpolation":19,"klasse":44,"text3d":"Bm9NR4","vecmath":64}],3:[function(require,module,exports){

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
        if (this.mesh)
            this.mesh.destroy();

        this.mesh = new MeshRenderer(this.context, {
            hasColors: true,
            maxVertices: particles.length * 4, //4 floats per vertex
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

    _renderNormal: function(particles, camera, color, points) {
        var gl = this.context.gl;
        var renderer = this.mesh;
        var shader = this.shader;

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

    render: function(width, height, particles, camera, color, points) {
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
            this._renderNormal(particles, camera, color, points);
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
            this._renderNormal(particles, camera, color, points);
        }
        
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    },
});


module.exports = WebGLRenderer;
},{"cam3d":17,"kami":40,"kami-mesh":20,"klasse":44,"vecmath":64}],4:[function(require,module,exports){
var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;

var Constraint = require('./Constraint');

var tmp = new Vector3();

/**
 * Creates a "physical text" object where each point (in triangles)
 * has a velocity, position, mass, etc.
 *
 * This does not hold on to the Text3D object
 */
var World = new Class({

    initialize: function(gravity) {
        this.particles = [];
        this.gravity = gravity||new Vector3(0, 0, 0);
        
        this.floor = Number.MAX_VALUE;
        this.floorFriction = 0.98;

        this.accuracy = 1;

        this.defaultStiffness = 0.2;
        this.defaultRestingDistance = undefined;
    },

    clear: function() {
        this.particles.length = 0;
    },

    addTriangleList: function(triangles, mass, restitution, glyphIndex) {
        mass = typeof mass === "number" ? mass : 1.0;
        restitution = typeof restitution === "number" ? restitution : -0.5;


        var particles = this.particles,
            defStiff = this.defaultStiffness,
            defRest = this.defaultRestingDistance;

        for (var i=0; i<triangles.length; i++) {
            var point = triangles[i];

            //constrain the triangle together..
            
            var particle = {
                position: new Vector3(point),
                velocity: new Vector3(),
                acceleration: new Vector3(),

                original: new Vector3(point),
                lastPosition: new Vector3(point),
                finalPosition: new Vector3(point),

                glyphIndex: glyphIndex,
                mass: mass,
                restitution: restitution,
                restingDistance: 0,
                constraints: []
            };                

            particles.push(particle);

            if (((i+1) % 3) === 0) {
                //the last three particles are our triangle
                
                var p3 = particles[particles.length-1],
                    p2 = particles[particles.length-2],
                    p1 = particles[particles.length-3];
                


                p1.constraints = [
                    new Constraint(p1, p2, defStiff, defRest),
                    new Constraint(p1, p3, defStiff, defRest),
                ];
                p2.constraints = [
                    new Constraint(p2, p1, defStiff, defRest),
                    new Constraint(p2, p3, defStiff, defRest),
                ];
                p3.constraints = [
                    new Constraint(p3, p1, defStiff, defRest),
                    new Constraint(p3, p2, defStiff, defRest),
                ];

                //surely a more efficient means of doing this.
                //maybe each particle has a fixed # of constraints?
                // lastA.constraints = [
                //     new Constraint(lastA, lastB, defStiff, defRest),
                //     new Constraint(lastA, lastC, defStiff, defRest),
                // ];
                // lastB.constraints = [
                //     new Constraint(lastB, lastA, defStiff, defRest),
                //     new Constraint(lastB, lastC, defStiff, defRest),
                // ];
                // lastC.constraints = [
                //     new Constraint(lastC, lastB, defStiff, defRest),
                //     new Constraint(lastC, lastA, defStiff, defRest),
                // ];

                // lastA.constraints.push(new Constraint(lastA, lastB, defStiff, defRest));
            }
        }
    },

    //Utility/helper method...
    addText3D: function(text3D, mass, restitution) {
        var particles = this.particles,
            defStiff = this.defaultStiffness,
            defRest = this.defaultRestingDistance;

        for (var k=0; k<text3D.glyphs.length; k++) {
            var g = text3D.glyphs[k];

            this.addTriangleList(g.points, mass, restitution, k);
        }
    },

    solveConstraints: function(particle, constraints) {
        var i = constraints.length;
        while (i--) { //in reverse so we can pop safely
            var c = constraints[i];

            //solve the constraint, it will return the distance 
            var dist = c.solve();

            //here we can optionally check to see if we should tear the constraint
            //and pop it from the stack... 
        }
    },

    step: function(dt) {
        dt = dt||0.16;

        var particles = this.particles,
            gravity = this.gravity,
            floor = this.floor,
            floorFriction = this.floorFriction;

        var steps = this.accuracy;
        while (steps--) {
            for (var i=0; i<particles.length; i++) {
                var p = particles[i];
                var c = p.constraints;

                //Pull this particle close to its attached constraints
                this.solveConstraints(p, c);
            }
        }


        for (var i=0; i<particles.length; i++) {
            var p = particles[i];


            p.velocity.scale(0.98);

            p.velocity.x += gravity.x;
            p.velocity.y += gravity.y;
            p.velocity.z += gravity.z;

            p.position.x += p.velocity.x * dt;
            p.position.y += p.velocity.y * dt;
            p.position.z += p.velocity.z * dt;

            if (p.position.y >= this.floor) {
                p.velocity.x *= floorFriction;
                p.velocity.y *= floorFriction;
                p.velocity.z *= floorFriction;

                p.velocity.y *= p.restitution;
                p.position.y = this.floor - 0.1;
            }
        }
    },

});

module.exports = World;
},{"./Constraint":1,"klasse":44,"vecmath":64}],5:[function(require,module,exports){
var _typeface_js = {

    faces: {},

    loadFace: function(typefaceData) {
        var familyName = typefaceData.familyName.toLowerCase();
        
        if (!this.faces[familyName]) {
            this.faces[familyName] = {};
        }
        if (!this.faces[familyName][typefaceData.cssFontWeight]) {
            this.faces[familyName][typefaceData.cssFontWeight] = {};
        }

        var face = this.faces[familyName][typefaceData.cssFontWeight][typefaceData.cssFontStyle] = typefaceData;
        face.loaded = true;
    },

    pixelsFromPoints: function(face, style, points, dimension) {
        var pixels = points * parseInt(style.fontSize.toString(), 10) * 72 / (face.resolution * 100);
        if (dimension == 'horizontal' && style.fontStretchPercent) {
            pixels *= style.fontStretchPercent;
        }
        return pixels;
    },

    pointsFromPixels: function(face, style, pixels, dimension) {
        var points = pixels * face.resolution / (parseInt(style.fontSize.toString(), 10) * 72 / 100);
        if (dimension == 'horizontal' && style.fontStretchPrecent) {
            points *= style.fontStretchPercent;
        }
        return points;
    },
};

module.exports = _typeface_js;
},{}],6:[function(require,module,exports){
module.exports = {"glyphs":{"S":{"x_min":25,"x_max":740.6875,"ha":808,"o":"m 25 173 b 366 -13 108 48 238 -13 b 740 270 545 -13 723 86 b 412 597 750 502 583 565 b 243 706 326 615 244 626 l 243 708 b 393 805 247 776 315 805 b 556 712 456 805 515 776 l 725 825 b 393 998 643 948 520 998 b 34 715 216 998 45 901 b 345 402 31 498 191 426 b 534 284 447 388 538 369 b 179 291 526 147 268 150 l 25 173 "},"/":{"x_min":-45.828125,"x_max":559.71875,"ha":528,"o":"m -45 -8 l 138 -75 l 559 994 l 377 1058 l -45 -8 "},"K":{"x_min":61.109375,"x_max":863.890625,"ha":858,"o":"m 61 983 l 61 0 l 265 0 l 265 327 l 304 365 l 611 0 l 863 0 l 441 501 l 863 983 l 615 983 l 265 573 l 265 983 l 61 983 "},"7":{"x_min":-23.765625,"x_max":672.0625,"ha":685,"o":"m 402 788 l -19 0 l 201 0 l 672 870 l 615 984 l -23 984 l -23 788 l 402 788 "},"d":{"x_min":31.921875,"x_max":611.109375,"ha":701,"o":"m 416 982 l 416 700 b 31 481 259 772 29 680 l 31 232 b 330 -16 45 46 179 -16 b 611 38 420 -16 523 4 l 611 982 l 416 982 m 416 142 b 225 214 350 108 227 128 l 225 490 b 416 553 234 574 354 587 l 416 142 "},",":{"x_min":-8.328125,"x_max":315.28125,"ha":392,"o":"m -8 -169 l 187 -169 l 315 154 l 98 154 l -8 -169 "},"Y":{"x_min":-63.890625,"x_max":825,"ha":806,"o":"m 825 983 l 587 983 l 379 572 l 170 983 l -63 983 l 277 376 l 277 0 l 481 0 l 481 376 l 825 983 "},"E":{"x_min":55.5625,"x_max":722.21875,"ha":794,"o":"m 722 984 l 55 984 l 55 0 l 722 0 l 722 198 l 261 198 l 261 393 l 684 393 l 684 591 l 261 591 l 261 784 l 722 784 l 722 984 "},"y":{"x_min":35.984375,"x_max":608.203125,"ha":701,"o":"m 413 719 l 413 163 b 222 226 351 129 231 143 l 222 719 l 35 719 l 35 223 b 416 9 35 25 244 -48 b 158 -55 416 -125 233 -126 l 62 -154 b 608 26 223 -341 608 -280 l 608 719 l 413 719 "},"\"":{"x_min":36.109375,"x_max":480.5625,"ha":529,"o":"m 36 605 l 205 605 l 233 981 l 36 981 l 36 605 m 283 605 l 454 605 l 480 981 l 283 981 l 283 605 "},"g":{"x_min":26.03125,"x_max":598.25,"ha":696,"o":"m 52 -154 b 598 26 213 -341 598 -280 l 598 675 b 26 494 403 772 26 783 l 26 223 b 406 9 26 24 234 -48 b 148 -52 406 -125 223 -123 l 52 -154 m 403 163 b 212 226 341 128 221 142 l 212 498 b 403 575 214 585 337 608 l 403 163 "},"ƒ":{"x_min":-25.0625,"x_max":626.171875,"ha":704,"o":"m -25 -128 b 324 28 124 -217 295 -141 l 404 458 l 542 458 l 542 617 l 431 617 l 455 747 b 559 807 466 805 505 834 l 626 943 b 487 986 569 973 522 986 b 258 762 334 986 276 869 l 258 764 l 231 617 l 88 617 l 88 458 l 202 458 b 127 68 179 333 151 192 b 19 1 116 0 70 -20 l -25 -128 "},"e":{"x_min":25,"x_max":598.609375,"ha":686,"o":"m 416 419 l 219 419 l 219 483 b 416 484 216 584 416 584 l 416 419 m 440 211 b 219 241 391 130 219 141 l 219 276 l 598 276 l 598 476 b 315 730 598 650 455 730 b 25 476 170 730 25 650 l 25 241 b 315 -13 25 70 170 -13 b 566 122 400 -13 511 19 l 440 211 "},"J":{"x_min":-9.71875,"x_max":731.953125,"ha":847,"o":"m 526 790 l 526 308 b 362 186 526 227 443 186 b 187 351 286 186 206 241 l -9 312 b 358 -13 18 90 194 -13 b 731 308 543 -13 731 94 l 731 983 l 294 983 l 294 790 l 526 790 "},"|":{"x_min":48.609375,"x_max":241.671875,"ha":340,"o":"m 48 988 l 48 -202 l 241 -202 l 241 988 l 48 988 "},"^":{"x_min":-6.9375,"x_max":769.453125,"ha":824,"o":"m -6 549 l 216 549 l 375 749 l 537 549 l 769 549 l 436 964 l 318 964 l -6 549 "},"q":{"x_min":27.75,"x_max":606.9375,"ha":704,"o":"m 606 -263 l 606 681 b 326 735 519 714 416 735 b 27 486 175 735 41 672 l 27 238 b 412 18 25 38 255 -53 l 412 -263 l 606 -263 m 412 158 b 220 228 350 124 230 145 l 220 504 b 412 576 223 590 345 610 l 412 158 "},"b":{"x_min":37.5,"x_max":616.703125,"ha":701,"o":"m 37 982 l 37 38 b 318 -16 125 4 227 -16 b 616 232 469 -16 602 46 l 616 481 b 231 700 619 680 388 772 l 231 982 l 37 982 m 231 553 b 423 490 294 587 413 574 l 423 214 b 231 142 420 128 298 108 l 231 553 "},"D":{"x_min":58.328125,"x_max":794.453125,"ha":876,"o":"m 419 0 b 794 313 613 0 794 93 l 794 663 b 419 983 794 886 613 983 l 58 983 l 58 0 l 419 0 m 262 205 l 262 777 l 419 777 b 588 663 508 777 588 744 l 588 313 b 419 205 588 234 508 205 l 262 205 "},"z":{"x_min":-15.21875,"x_max":548.578125,"ha":596,"o":"m 283 554 l -15 69 l 40 0 l 538 0 l 538 165 l 248 165 l 548 651 l 493 719 l 11 719 l 11 554 l 283 554 "},"w":{"x_min":-31.9375,"x_max":922.21875,"ha":929,"o":"m 450 455 l 469 259 l 529 0 l 705 0 l 922 719 l 729 719 l 655 416 l 629 241 l 620 241 l 605 418 l 516 719 l 376 719 l 284 416 l 269 241 l 261 241 l 236 415 l 158 719 l -31 719 l 191 0 l 366 0 l 423 259 l 440 455 l 450 455 "},"$":{"x_min":17.78125,"x_max":733.40625,"ha":785,"o":"m 313 -97 l 445 -97 l 445 -5 b 733 271 591 21 719 115 b 445 589 741 484 601 554 l 445 796 b 549 712 485 782 520 755 l 717 825 b 445 994 648 929 551 980 l 445 1078 l 313 1078 l 313 993 b 27 715 165 969 37 875 b 313 407 24 509 167 434 l 313 193 b 171 291 256 208 203 240 l 17 173 b 313 -10 91 64 201 1 l 313 -97 m 527 284 b 445 191 524 236 491 205 l 445 380 b 527 284 495 364 530 337 m 235 707 l 235 708 b 313 794 238 753 269 780 l 313 618 b 235 707 269 633 235 657 "},"\\":{"x_min":-84.71875,"x_max":523.609375,"ha":522,"o":"m 100 1058 l -84 993 l 338 -79 l 523 -16 l 100 1058 "},"~":{"x_min":15.40625,"x_max":597.34375,"ha":647,"o":"m 487 514 b 359 479 443 456 408 443 b 209 543 323 507 273 543 b 15 409 126 543 64 480 l 136 307 b 262 331 184 370 220 367 b 394 276 297 301 343 276 b 597 423 486 276 551 342 l 487 514 "},"-":{"x_min":23.609375,"x_max":433.328125,"ha":489,"o":"m 23 308 l 433 308 l 433 504 l 23 504 l 23 308 "},"Q":{"x_min":40.625,"x_max":862.84375,"ha":939,"o":"m 743 -43 l 862 72 l 797 141 b 846 307 828 187 846 241 l 846 676 b 40 676 846 1112 40 1115 l 40 307 b 672 32 40 0 436 -90 l 743 -43 m 243 676 b 642 676 243 841 643 845 l 642 308 l 575 379 l 447 275 l 522 193 b 243 307 404 163 242 201 l 243 676 "},"M":{"x_min":61.265625,"x_max":969.59375,"ha":1088,"o":"m 790 581 l 765 391 l 765 0 l 969 0 l 969 983 l 755 983 l 514 418 l 275 983 l 61 983 l 61 0 l 265 0 l 265 390 l 243 580 l 257 580 l 304 445 l 440 129 l 593 129 l 727 444 l 775 581 l 790 581 "},"C":{"x_min":19.4375,"x_max":755.5625,"ha":811,"o":"m 579 294 b 222 316 495 133 222 165 l 222 667 b 583 693 222 819 498 854 l 747 782 b 405 993 680 926 536 993 b 19 667 211 993 19 882 l 19 316 b 401 -9 19 100 211 -9 b 755 196 531 -9 670 58 l 579 294 "},"[":{"x_min":37.5,"x_max":338.890625,"ha":372,"o":"m 338 990 l 37 990 l 37 -151 l 338 -151 l 338 36 l 234 36 l 234 801 l 338 801 l 338 990 "},"L":{"x_min":55.5625,"x_max":684.71875,"ha":721,"o":"m 684 205 l 259 205 l 259 983 l 55 983 l 55 0 l 684 0 l 684 205 "},"!":{"x_min":56.9375,"x_max":295.828125,"ha":403,"o":"m 273 986 l 77 986 l 77 265 l 273 265 l 273 986 m 56 104 b 175 -15 56 37 108 -15 b 295 104 243 -15 295 37 b 175 225 295 170 243 225 b 56 104 108 225 56 170 "}," ":{"x_min":0,"x_max":0,"ha":328},"{":{"x_min":16.328125,"x_max":382.890625,"ha":404,"o":"m 382 991 l 289 991 b 96 788 142 991 96 912 l 96 622 b 16 512 96 566 78 512 l 16 327 b 96 218 78 327 96 275 l 96 51 b 277 -150 96 -72 134 -150 l 382 -150 l 382 33 l 288 33 b 294 54 291 34 294 41 l 294 241 b 196 419 294 318 271 388 b 294 598 253 445 294 526 l 294 781 b 294 806 294 797 294 806 l 382 806 l 382 991 "},"X":{"x_min":-48.65625,"x_max":831.90625,"ha":826,"o":"m 831 983 l 583 983 l 384 633 l 202 983 l -45 983 l 241 490 l -48 0 l 202 0 l 384 347 l 581 0 l 831 0 b 520 488 765 100 583 391 l 831 983 "},"P":{"x_min":59.71875,"x_max":798.4375,"ha":856,"o":"m 262 304 l 448 304 b 447 983 912 304 918 981 l 59 983 l 59 0 l 262 0 l 262 304 m 447 495 l 262 495 l 262 777 l 447 777 b 447 495 648 777 645 495 "},"%":{"x_min":18.0625,"x_max":962.46875,"ha":1038,"o":"m 430 745 b 223 995 430 905 355 995 b 18 748 104 995 18 900 b 223 495 18 583 93 495 b 430 745 341 495 430 590 m 888 934 l 736 1034 l 56 -9 l 208 -104 l 888 934 m 286 745 b 220 641 286 675 262 641 b 154 747 181 641 154 670 b 220 851 154 819 181 851 b 286 745 261 851 286 819 m 962 244 b 755 494 962 404 887 494 b 549 247 636 494 549 398 b 755 -5 549 81 624 -5 b 962 244 873 -5 962 88 m 818 244 b 752 140 818 173 794 140 b 686 245 713 140 686 169 b 752 350 686 318 713 350 b 818 244 793 350 818 318 "},"#":{"x_min":8.796875,"x_max":950.6875,"ha":988,"o":"m 724 506 l 897 506 l 950 694 l 782 694 l 856 936 l 661 936 l 590 694 l 490 694 l 561 936 l 370 936 b 299 694 349 863 322 769 l 94 694 l 54 506 l 243 506 b 222 440 233 472 231 462 l 44 440 l 8 255 l 168 255 l 93 0 l 285 0 l 358 255 l 458 255 l 386 0 l 577 0 b 650 255 588 40 610 118 l 857 255 l 896 440 l 706 440 l 724 506 m 553 519 l 528 427 l 395 427 l 418 519 l 553 519 "},"_":{"x_min":-16.671875,"x_max":681.953125,"ha":756,"o":"m -16 -181 l 681 -181 l 681 11 l -16 11 l -16 -181 "},"+":{"x_min":36.109375,"x_max":747.21875,"ha":838,"o":"m 36 355 l 300 355 l 300 97 l 494 97 l 494 355 l 747 355 l 747 551 l 494 551 l 494 806 l 300 806 l 300 551 l 36 551 l 36 355 "},")":{"x_min":-48.609375,"x_max":310.234375,"ha":393,"o":"m -48 1006 b -45 -65 191 701 190 274 l 98 -164 b 91 1101 381 234 381 774 l -48 1006 "},"'":{"x_min":33.328125,"x_max":227.78125,"ha":299,"o":"m 33 605 l 208 605 l 227 981 l 33 981 l 33 605 "},"}":{"x_min":-9.3125,"x_max":344.859375,"ha":393,"o":"m -9 806 l 62 806 b 67 781 67 806 67 797 l 67 598 b 167 420 65 526 111 455 b 67 241 94 390 65 315 l 67 54 b 60 33 67 40 65 33 l -9 33 l -9 -150 l 61 -150 b 262 51 226 -150 262 -72 l 262 218 b 344 327 262 275 279 327 l 344 512 b 262 622 279 512 262 566 l 262 788 b 64 991 262 912 243 991 l -9 991 l -9 806 "},"a":{"x_min":24.75,"x_max":593.09375,"ha":701,"o":"m 288 466 b 322 -16 -66 466 -70 -16 b 593 35 409 -16 508 3 l 593 481 b 50 605 593 757 198 811 l 144 518 b 405 444 220 603 405 612 b 288 466 370 462 326 466 m 400 141 b 319 131 373 134 347 131 b 312 317 172 131 162 313 b 400 305 345 319 379 313 l 400 141 "},"T":{"x_min":-11.109375,"x_max":758.328125,"ha":783,"o":"m -11 984 l -11 779 l 270 779 l 270 0 l 476 0 l 476 779 l 758 779 l 758 984 l -11 984 "},"=":{"x_min":47.21875,"x_max":640.28125,"ha":738,"o":"m 47 437 l 640 437 l 640 627 l 47 627 l 47 437 m 47 183 l 640 183 l 640 372 l 47 372 l 47 183 "},"N":{"x_min":59.71875,"x_max":830.5625,"ha":947,"o":"m 641 269 l 572 447 l 261 983 l 59 983 l 59 0 l 265 0 l 265 479 l 238 647 l 252 650 l 312 516 l 612 0 l 830 0 l 830 983 l 626 983 l 626 480 b 655 272 627 459 644 336 l 641 269 "},"2":{"x_min":-13.671875,"x_max":675.9375,"ha":749,"o":"m 161 688 b 464 759 234 819 397 850 b 414 575 500 712 471 634 l -13 106 l 37 1 l 673 1 l 673 196 l 439 195 b 298 180 429 194 298 180 l 296 188 l 553 433 b 347 997 772 656 694 983 b 5 794 212 1001 83 926 l 161 688 "},"j":{"x_min":-55.5625,"x_max":252.78125,"ha":332,"o":"m 20 883 b 136 767 20 819 72 767 b 252 883 201 767 252 819 b 136 999 252 949 201 999 b 20 883 72 999 20 949 m -55 -105 b 41 -12 31 -114 41 -52 l 41 720 l 234 720 l 234 -12 b -55 -254 234 -169 147 -294 l -55 -105 "},"Z":{"x_min":-21.03125,"x_max":755.296875,"ha":776,"o":"m 469 794 l -21 93 l 27 0 l 735 0 l 735 183 l 265 183 l 755 890 l 698 983 l 5 983 l 5 794 l 469 794 "},"u":{"x_min":38.890625,"x_max":613.890625,"ha":710,"o":"m 613 720 l 422 720 l 422 154 b 231 251 334 124 236 164 l 231 720 l 38 720 l 38 253 b 613 42 38 -71 404 -34 l 613 720 "},"1":{"x_min":-56.9375,"x_max":355.5625,"ha":451,"o":"m 194 986 l -56 720 l 70 612 l 163 693 l 163 0 l 355 0 l 355 986 l 194 986 "},"k":{"x_min":47.21875,"x_max":675,"ha":664,"o":"m 47 981 l 47 0 l 240 0 l 240 251 l 252 262 l 451 0 l 675 0 b 387 372 587 116 477 252 l 673 719 l 448 719 l 240 447 l 240 981 l 47 981 "},"€":{"x_min":-26.390625,"x_max":798.609375,"ha":824,"o":"m 1 647 l -26 509 l 62 509 l 62 456 l 1 456 l -26 320 l 62 320 l 62 317 b 444 -9 62 100 254 -9 b 798 196 575 -9 713 58 l 622 295 b 265 317 538 133 265 165 l 265 320 l 502 320 l 529 456 l 265 456 l 265 509 l 501 509 l 529 647 l 265 647 l 265 667 b 626 693 265 819 541 854 l 790 782 b 448 993 723 926 579 993 b 62 667 254 993 62 882 l 62 647 l 1 647 "},"<":{"x_min":40.28125,"x_max":531.9375,"ha":608,"o":"m 531 788 l 40 473 l 40 345 l 531 34 l 531 259 l 258 409 l 531 565 l 531 788 "},"t":{"x_min":37.484375,"x_max":377.78125,"ha":424,"o":"m 377 150 b 229 254 284 132 229 172 l 229 526 l 356 526 l 356 720 l 229 720 l 229 983 l 37 983 l 37 253 b 377 10 36 29 186 -53 l 377 150 "},"W":{"x_min":-40.015625,"x_max":1229.4375,"ha":1283,"o":"m 559 377 b 586 497 561 376 586 497 l 597 497 l 619 379 l 746 0 l 946 0 l 1229 983 l 1019 983 l 876 468 l 850 230 l 837 230 l 797 468 l 678 847 l 512 847 b 387 470 457 670 441 650 l 354 240 l 341 240 l 311 469 l 171 983 l -40 983 l 244 0 l 444 0 l 559 377 "},"v":{"x_min":-51.390625,"x_max":643.0625,"ha":649,"o":"m 288 170 l 259 356 l 154 719 l -51 719 l 204 0 l 386 0 l 643 719 l 436 719 l 329 356 l 302 170 l 288 170 "},">":{"x_min":47.21875,"x_max":538.890625,"ha":615,"o":"m 47 565 l 320 409 l 47 259 l 47 34 l 538 345 l 538 473 l 47 788 l 47 565 "},"s":{"x_min":-7.84375,"x_max":509.875,"ha":551,"o":"m -7 108 b 250 -13 60 18 150 -13 b 509 222 384 -13 509 65 b 302 433 509 358 394 410 b 207 507 272 439 202 464 b 388 521 215 601 345 562 l 484 653 b 255 728 411 712 320 729 b 245 276 -45 724 -94 335 b 315 185 311 267 333 226 b 83 233 290 126 168 153 l -7 108 "},"B":{"x_min":59.734375,"x_max":799.53125,"ha":861,"o":"m 263 598 l 263 784 l 448 784 b 448 598 604 784 587 598 l 263 598 m 448 423 b 448 198 643 423 640 198 l 263 198 l 263 423 l 448 423 m 757 695 b 448 984 757 886 618 984 l 59 984 l 59 0 l 455 0 b 795 250 682 0 777 118 b 664 523 809 348 786 463 b 757 695 730 561 757 640 "},"?":{"x_min":-11.109375,"x_max":587.90625,"ha":656,"o":"m 113 717 b 231 787 145 762 188 783 b 236 522 437 805 430 522 b 150 531 222 522 188 522 l 162 244 l 330 244 l 344 401 b 266 970 712 455 644 970 b -11 823 170 970 69 928 l 113 717 m 143 95 b 252 -14 143 34 191 -14 b 362 95 313 -14 362 34 b 252 205 362 159 313 205 b 143 95 191 205 143 159 "},"H":{"x_min":70.828125,"x_max":841.671875,"ha":953,"o":"m 637 0 l 841 0 l 841 983 l 637 983 l 637 593 l 275 593 l 275 983 l 70 983 l 70 0 l 275 0 l 275 388 l 637 388 l 637 0 "},"c":{"x_min":19.4375,"x_max":588.890625,"ha":628,"o":"m 419 243 b 212 247 379 126 212 149 l 212 473 b 415 482 212 569 383 589 l 580 533 b 308 728 543 680 411 728 b 19 472 165 728 19 643 l 19 246 b 308 -7 19 75 165 -7 b 588 188 411 -7 538 42 l 419 243 "},"&":{"x_min":19,"x_max":900.828125,"ha":871,"o":"m 489 516 b 634 751 568 564 634 631 b 380 991 634 895 511 991 b 105 737 238 991 105 899 b 171 558 105 670 135 609 b 19 299 91 502 19 427 b 337 -5 19 112 159 -5 b 593 105 450 -5 524 31 l 663 20 l 900 20 l 707 256 l 806 371 l 682 491 l 598 389 l 489 516 m 455 239 b 212 299 363 133 212 180 b 300 414 212 348 255 384 l 455 239 m 374 816 b 443 748 414 816 443 788 b 350 633 443 702 399 658 b 298 741 321 667 298 709 b 374 816 298 784 331 816 "},"I":{"x_min":43.0625,"x_max":247.21875,"ha":364,"o":"m 43 0 l 247 0 l 247 983 l 43 983 l 43 0 "},"G":{"x_min":28.25,"x_max":797.703125,"ha":910,"o":"m 757 789 b 411 997 682 943 544 997 b 28 674 219 997 28 889 l 28 317 b 797 317 28 -123 797 -120 l 797 561 l 374 561 l 374 363 l 597 363 l 597 317 b 231 317 597 143 231 142 l 231 674 b 592 701 231 836 522 864 l 757 789 "},"(":{"x_min":32.796875,"x_max":391.671875,"ha":417,"o":"m 251 1101 b 244 -164 -38 774 -38 234 l 388 -65 b 391 1006 152 274 151 701 l 251 1101 "},"`":{"x_min":-91.671875,"x_max":323.609375,"ha":357,"o":"m 166 979 l -91 979 l 109 727 l 323 727 l 166 979 "},"U":{"x_min":61.109375,"x_max":833.328125,"ha":943,"o":"m 61 983 l 61 322 b 833 322 61 -127 831 -126 l 833 983 l 627 983 l 627 322 b 266 322 627 138 266 137 l 266 983 l 61 983 "},"◊":{"x_min":-13.984375,"x_max":694.53125,"ha":738,"o":"m 694 470 l 412 975 l 272 975 l -13 468 l 263 -36 l 408 -36 l 694 470 m 482 469 l 340 204 b 195 472 284 306 249 375 b 338 745 245 568 290 651 l 482 469 "},"F":{"x_min":55.5625,"x_max":720.828125,"ha":765,"o":"m 720 983 l 55 983 l 55 0 l 261 0 l 261 366 l 663 366 l 663 568 l 261 568 l 261 784 l 720 784 l 720 983 "},"r":{"x_min":34.71875,"x_max":418.0625,"ha":457,"o":"m 172 698 b 34 474 94 658 34 578 l 34 0 l 227 0 l 227 471 b 418 560 236 553 336 582 l 418 717 b 316 730 375 727 344 730 b 248 723 295 730 265 728 l 247 723 b 172 698 220 717 193 707 "},":":{"x_min":29.171875,"x_max":268.0625,"ha":338,"o":"m 29 561 b 148 440 29 494 81 440 b 268 561 215 440 268 494 b 148 679 268 627 215 679 b 29 561 81 679 29 627 m 29 129 b 148 9 29 62 81 9 b 268 129 215 9 268 62 b 148 248 268 198 215 248 b 29 129 81 248 29 198 "},"x":{"x_min":-45.296875,"x_max":657.515625,"ha":657,"o":"m 428 719 b 332 555 383 645 351 586 l 307 487 l 299 487 l 272 555 l 172 719 l -45 719 b 188 359 117 481 147 420 l -45 0 l 172 0 b 265 147 217 68 242 109 l 297 223 l 307 223 l 335 150 l 428 0 l 657 0 b 415 361 589 95 488 258 l 654 719 l 428 719 "},"*":{"x_min":-1.234375,"x_max":566.515625,"ha":610,"o":"m 373 984 l 193 984 l 207 820 l 48 886 l -1 711 l 155 676 l 47 547 l 195 440 l 281 590 l 373 440 l 516 548 l 405 677 l 566 708 l 515 883 l 356 822 l 373 984 "},"V":{"x_min":-56.9375,"x_max":851.390625,"ha":851,"o":"m 387 236 l 347 438 l 161 984 l -56 984 l 298 1 l 495 1 l 851 984 l 633 984 l 440 438 l 402 236 l 387 236 "},"h":{"x_min":45.828125,"x_max":620.828125,"ha":733,"o":"m 45 983 l 45 0 l 238 0 l 238 526 b 429 463 298 561 429 554 l 429 0 l 620 0 l 620 462 b 238 698 620 681 406 765 l 238 983 l 45 983 "},"0":{"x_min":41.671875,"x_max":752.78125,"ha":853,"o":"m 237 286 l 237 695 b 556 695 248 841 545 841 l 556 286 b 237 286 545 143 248 143 m 397 -11 b 752 286 565 -11 752 80 l 752 695 b 397 994 752 902 565 994 b 41 695 230 994 41 902 l 41 286 b 397 -11 41 80 230 -11 "},".":{"x_min":62.5,"x_max":300,"ha":379,"o":"m 62 112 b 180 -8 62 44 113 -8 b 300 112 247 -8 300 44 b 180 231 300 179 247 231 b 62 112 113 231 62 179 "},"@":{"x_min":17.84375,"x_max":1004.359375,"ha":1064,"o":"m 721 315 l 795 719 l 686 745 l 656 710 b 319 238 376 957 89 447 b 578 208 386 177 500 151 b 868 243 665 140 801 183 b 961 759 1004 363 1043 599 b 676 976 907 863 806 944 b 19 477 289 1077 37 773 b 624 12 -4 111 311 -86 l 592 143 b 650 841 -20 -34 77 990 b 837 683 739 817 807 762 b 721 315 891 545 855 388 m 624 560 l 581 355 b 428 349 547 315 468 303 b 428 565 384 402 388 505 b 624 560 477 637 570 656 "},"f":{"x_min":30.5625,"x_max":359.71875,"ha":393,"o":"m 359 986 b 30 731 176 998 30 904 l 30 0 l 223 0 l 223 423 l 351 423 l 351 618 l 223 618 l 223 731 b 359 797 223 772 273 797 l 359 986 "},";":{"x_min":-13.890625,"x_max":276.390625,"ha":349,"o":"m -13 -131 l 159 -131 l 276 190 l 63 190 l -13 -131 m 34 544 b 155 423 34 476 84 423 b 272 544 223 423 272 476 b 155 662 272 611 223 662 b 34 544 84 662 34 611 "},"i":{"x_min":30.5625,"x_max":261.109375,"ha":351,"o":"m 30 895 b 144 779 30 830 80 779 b 261 895 213 779 261 830 b 144 1011 261 961 213 1011 b 30 895 80 1011 30 961 m 244 720 l 244 0 l 51 0 l 51 720 l 244 720 "},"6":{"x_min":33.328125,"x_max":755.5625,"ha":847,"o":"m 734 791 b 397 991 654 935 530 991 b 33 692 213 992 33 892 l 33 289 b 397 -8 36 89 213 -10 b 755 289 580 -8 755 91 l 755 342 b 230 555 755 606 397 721 l 230 691 b 562 717 230 820 491 866 l 734 791 m 559 291 b 230 291 559 149 230 151 l 230 341 b 559 341 230 481 559 483 l 559 291 "},"A":{"x_min":-19.0625,"x_max":873.953125,"ha":886,"o":"m -19 0 l 198 0 b 280 225 230 87 250 141 l 573 225 l 660 0 l 873 0 l 521 983 l 325 983 l -19 0 m 430 766 l 458 626 l 521 412 l 332 412 l 387 625 l 415 766 l 430 766 "},"n":{"x_min":47.21875,"x_max":620.828125,"ha":718,"o":"m 47 0 l 240 0 l 240 555 b 429 479 309 594 429 578 l 429 0 l 620 0 l 620 480 b 306 743 620 669 469 743 b 47 680 219 743 126 719 l 47 0 "},"O":{"x_min":37.5,"x_max":843.0625,"ha":947,"o":"m 37 676 l 37 306 b 843 306 37 -130 843 -129 l 843 676 b 37 676 843 1112 37 1115 m 240 676 b 638 676 240 841 640 845 l 638 306 b 240 306 638 143 238 141 l 240 676 "},"3":{"x_min":-5.640625,"x_max":711.359375,"ha":782,"o":"m 151 712 b 342 794 209 784 287 794 b 466 698 406 794 466 758 b 363 598 466 640 420 598 l 226 598 l 226 425 l 363 425 b 340 188 561 413 558 188 b 145 306 270 188 191 230 l -5 195 b 336 -12 79 37 206 0 b 573 526 663 -44 858 327 b 645 809 680 612 687 723 b 30 819 523 1065 166 1031 l 151 712 "},"]":{"x_min":-33.328125,"x_max":266.671875,"ha":367,"o":"m -33 -150 l 266 -150 l 266 991 l -33 991 l -33 806 l 68 806 l 68 33 l -33 33 l -33 -150 "},"m":{"x_min":48.609375,"x_max":952.78125,"ha":1053,"o":"m 48 0 l 237 0 l 237 537 b 405 497 283 587 405 565 l 405 0 l 590 0 l 590 494 b 761 493 590 576 761 579 l 761 0 l 952 0 l 952 489 b 684 735 952 653 816 735 b 498 644 616 735 544 707 b 305 743 459 718 379 742 b 48 654 211 744 111 708 l 48 0 "},"9":{"x_min":27.6875,"x_max":749.90625,"ha":840,"o":"m 48 191 b 386 -8 129 47 252 -8 b 749 290 569 -9 749 90 l 749 693 b 386 991 747 893 569 993 b 27 693 202 991 27 891 l 27 640 b 552 427 27 376 381 263 l 552 291 b 220 265 552 162 291 116 l 48 191 m 223 691 b 552 691 223 833 552 832 l 552 641 b 223 641 552 501 223 500 l 223 691 "},"l":{"x_min":36.109375,"x_max":344.4375,"ha":375,"o":"m 344 168 b 229 266 265 168 229 212 l 229 983 l 36 983 l 36 266 b 344 2 36 109 133 -29 l 344 168 "},"8":{"x_min":14.3125,"x_max":747.125,"ha":818,"o":"m 369 176 b 208 300 296 176 208 219 b 369 429 208 394 284 429 l 390 429 b 551 300 475 429 551 394 b 390 176 551 219 463 176 l 369 176 m 390 -8 b 747 309 588 -8 742 105 b 617 527 747 391 713 480 b 708 687 680 565 708 636 b 390 962 708 881 551 962 l 369 962 b 75 805 246 962 128 909 b 139 523 36 729 36 588 b 14 309 46 462 14 376 b 369 -8 17 105 169 -8 l 390 -8 m 391 800 b 520 697 457 800 520 762 b 373 594 520 623 440 594 b 239 697 309 594 239 623 b 369 800 239 762 303 800 l 391 800 "},"p":{"x_min":31.9375,"x_max":611.140625,"ha":707,"o":"m 226 -263 l 226 18 b 611 238 383 -53 613 38 l 611 486 b 312 735 597 672 463 735 b 31 681 222 735 119 714 l 31 -263 l 226 -263 m 226 576 b 418 504 293 610 415 590 l 418 228 b 226 158 408 145 288 124 l 226 576 "},"4":{"x_min":-8.375,"x_max":708.46875,"ha":767,"o":"m 641 983 l 466 983 l -8 356 l 84 219 l 445 219 l 445 1 l 641 1 l 641 219 l 708 219 l 708 398 l 641 398 l 641 983 m 476 729 b 454 591 472 702 454 591 l 450 384 l 229 384 l 425 654 l 468 730 l 476 729 "},"R":{"x_min":60.046875,"x_max":868.390625,"ha":867,"o":"m 575 373 b 798 669 717 401 798 488 b 447 983 793 893 644 983 l 60 983 l 60 0 l 265 0 l 265 359 l 337 359 l 617 0 l 868 0 l 575 373 m 265 545 l 265 777 l 447 777 b 594 668 533 780 594 751 b 447 545 594 581 537 545 l 265 545 "},"o":{"x_min":29.171875,"x_max":605.5625,"ha":694,"o":"m 318 548 b 412 477 362 548 412 523 l 412 240 b 318 162 412 194 362 162 b 222 240 272 162 222 194 l 222 477 b 318 548 222 523 272 548 m 29 477 l 29 244 b 318 -11 29 70 173 -9 b 605 244 461 -9 605 70 l 605 477 b 318 734 605 648 461 733 b 29 477 173 733 29 648 "},"5":{"x_min":37.5,"x_max":727.984375,"ha":817,"o":"m 37 191 b 356 -8 109 47 236 -2 b 554 643 751 -26 854 495 b 234 655 472 683 348 702 l 234 790 l 659 790 l 659 983 l 45 983 l 45 431 l 159 434 b 365 498 252 486 293 500 b 359 188 580 495 577 188 b 187 291 300 188 230 223 l 37 191 "}},"cssFontWeight":"normal","ascender":1050,"underlinePosition":-75,"cssFontStyle":"normal","boundingBox":{"yMin":-263.359375,"xMin":-91.671875,"yMax":1101.171875,"xMax":1229.4375},"resolution":1000,"original_font_information":{"postscript_name":"Uni-Sans-Bold","version_string":"Version 001.001","vendor_url":"","full_font_name":"Uni-Sans-Bold","font_family_name":"Uni Sans Bold","copyright":"Copyright (c) 2009 by © 2009 Designed by Svetoslav Simov © Fontfabric, Inc. All rights reserved.","description":"Copyright (c) 2002 by © 2009 Designed by Svetoslav Simov © Fontfabric, Inc. All rights reserved.","trademark":"Uni Sans Bold is a trademark of © 2009 Designed by Svetoslav Simov © Fontfabric, Inc.","designer":"Svetoslav Simov","designer_url":"http://fontfabric.com/","unique_font_identifier":"2009DesignedbySvetoslavSimovFontfabric,Inc: Uni Sans Bold: 2009","license_url":"","license_description":"","manufacturer_name":"© 2009 Designed by Svetoslav Simov © Fontfabric, Inc","font_sub_family_name":"Regular"},"descender":-339,"familyName":"Uni Sans Bold","lineHeight":1667,"underlineThickness":50};
},{}],7:[function(require,module,exports){
var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;

var triangulateShapes = require('./triangulate');
var util = require('./util');

var tmp = new Vector3();

/**
 * A glyph holds the contour and triangulated mesh of a font.
 * 
 * @param  {[type]} face     [description]
 * @param  {[type]} chr      [description]
 * @param  {[type]} size     [description]
 * @param  {[type]} steps    [description]
 * @param  {[type]} simplify [description]
 * @param  {[type]} scale)   {                   if (!chr)            throw new Error('must specify a valid character for this glyph');        if (!face)            throw new Error("must specify a typeface 'font face' for a Glyph");        simplify = typeof simplify === "number" ? simplify : Glyph.DEFAULT_SIMPLIFY;        steps = typeof steps === "number" ? steps : Glyph.DEFAULT_STEPS;        size = typeof size === "number" ? size : Glyph.DEFAULT_SIZE;        scale = typeof scale === "number" ? scale : 1.0;                var shapes = util.getShapeList(face, size, chr, steps);                if (!shapes) {            shapes = util.getShapeList(face, size, Glyph.DEFAULT_CHARACTER, steps);            if (!shapes)                throw new Error("could not find glyph '"+chr+"' or the default '"+Glyph.DEFAULT_CHARACTER+"'");        }                if (simplify > 0 [description]
 * @return {[type]}          [description]
 */
var Glyph = new Class({

    initialize: function(face, chr, size, steps, simplify, scale) {
        if (!chr)
            throw new Error('must specify a valid character for this glyph');
        if (!face)
            throw new Error("must specify a typeface 'font face' for a Glyph");
        simplify = typeof simplify === "number" ? simplify : Glyph.DEFAULT_SIMPLIFY;
        steps = typeof steps === "number" ? steps : Glyph.DEFAULT_STEPS;
        size = typeof size === "number" ? size : Glyph.DEFAULT_SIZE;
        scale = typeof scale === "number" ? scale : 1.0;


        //Try to get our shape...
        var shapes = util.getShapeList(face, size, chr, steps);

        //If the font face doesn't support the character, what about the default?
        if (!shapes) {
            shapes = util.getShapeList(face, size, Glyph.DEFAULT_CHARACTER, steps);
            if (!shapes)
                throw new Error("could not find glyph '"+chr+"' or the default '"+Glyph.DEFAULT_CHARACTER+"'");
        }

        //now simplify the shape by a certain amount...
        if (simplify > 0) {
            for (var i=0; i<shapes.length; i++) {
                shapes[i] = shapes[i].simplify(simplify);
            }
        }

        /**
         * This is a list of Shape objects which define the simplified contour 
         * of the glyph in discrete points. This may be useful when drawing the
         * text in simple 2D, or as a stroke.
         * 
         * @type {Array} an array of Shape objects
         */
        this.shapes = shapes;

        this.bounds = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0
        };

        /**
         * This is a list of Vector3s which defines the triangulated data
         * for this glyph. The z component is zero. 
         *
         * These points are in model-space, unless otherwise transformed.
         * 
         * @type {Array}
         */
        this.points = [];

        this.triangulate(this.shapes);

        if (!Glyph.SAVE_CONTOUR) {
            for (var i=0; i<this.shapes.length; i++) {
                this.shapes[i].length = 0;
            }
            this.shapes.length = 0;
            this.shapes = null;
        }
    },

    /**
     * This is called from the constructor to triangulate the list of
     * shapes and determine the new (model-space) bounding box.
     */
    triangulate: function(shapes) {
        this.shapes = shapes || this.shapes;

        this.points.length = 0;

        //Triangulate the shape data
        var triangles = triangulateShapes(this.shapes) || [];

        //bounds are initially zero
        this.bounds.minX = 0;
        this.bounds.minY = 0;
        this.bounds.maxX = 0;
        this.bounds.maxY = 0;

        if (triangles.length > 0) {
            var minX = Number.MAX_VALUE,
                minY = Number.MAX_VALUE,
                maxX = -Number.MAX_VALUE,
                maxY = -Number.MAX_VALUE;

            for (var i=0; i<triangles.length; i++) {
                var tri = triangles[i];
                for (var k=0; k<tri.points_.length; k++) {
                    var v = new Vector3(tri.points_[k].x, tri.points_[k].y, 0);

                    minX = Math.min(minX, v.x);
                    minY = Math.min(minY, v.y);
                    maxX = Math.max(maxX, v.x);
                    maxY = Math.max(maxY, v.y);

                    this.points.push( v );
                }
            }
            this.bounds.minX = minX;
            this.bounds.minY = minY;
            this.bounds.maxX = maxX;
            this.bounds.maxY = maxY;
        }
    },

    /**
     * Runs through all points and transforms them by the given matrix.
     * This is a destructive operation; the original model-space points
     * will be lost.
     *
     * The bounding box is updated.
     * 
     * @param  {[type]} matrix [description]
     * @return {[type]}        [description]
     */
    applyTransform: function(matrix) {
        var points = this.points;
        if (points.length===0)
            return;


        var minX = Number.MAX_VALUE,
            minY = Number.MAX_VALUE,
            maxX = -Number.MAX_VALUE,
            maxY = -Number.MAX_VALUE;
        for (var i=0; i<points.length; i++) {
            var v = points[i];
            v.transformMat4(matrix);

            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
        }
        this.bounds.minX = minX;
        this.bounds.minY = minY;
        this.bounds.maxX = maxX;
        this.bounds.maxY = maxY;
    },

    destroyContour: function() {
        if (!this.shapes)
            return;

        for (var i=0; i<this.shapes.length; i++) {
            this.shapes[i].length = 0;
        }
        this.shapes.length = 0;
        this.shapes = null;
    },

    destroy: function() {
        this.destroyContour();
        if (this.points) {
            this.points.length = 0;
            this.points = null;
        }

        // this.bounds.minX = 0;
        // this.bounds.minY = 0;
        // this.bounds.maxX = 0;
        // this.bounds.maxY = 0;
    },
});

Glyph.DEFAULT_SIZE = 12;
Glyph.DEFAULT_STEPS = 10;
Glyph.DEFAULT_SIMPLIFY = 3;
Glyph.DEFAULT_CHARACTER = '?';

Glyph.SAVE_CONTOUR = false;

module.exports = Glyph;
},{"./triangulate":11,"./util":13,"klasse":44,"vecmath":64}],8:[function(require,module,exports){
var Class = require('klasse');

var Vector2 = require('vecmath').Vector2;
var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;

var triangulateShapes = require('./triangulate');
var util = require('./util');

var Glyph = require('./Glyph');
var tmp = new Vector3();
var tmpMat = new Matrix4();

/**
 * Text3D represents multiple glyphs in 3D space.
 *
 * Each glyph is transformed based on its x-advance and line
 * height (for multi-line strings), which gives us a model-space
 * representation of the entire string. 
 */
var Text3D = new Class({

	initialize: function(text, face, size, steps, simplify) {
        size = typeof size === "number" ? size : Glyph.DEFAULT_SIZE;

        this.size = size;
		this.text = "";
		this.face = face;

        this.align = 

        this.glyphs = [];

        var wMetric = util.getGlyphMetrics(face, size, 'W');
        this.spaceWidth = wMetric ? wMetric.xadvance : size/2;
        this.lineHeight = util.getFaceHeight(face, size);

        this.bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        
		this.setText(text, steps, simplify);
	},


	setText: function(text, steps, simplify) {
        text = (text||'').toString().trim();

		this.text = text;

        this.glyphs.length = 0;
        

        var size = this.size,
            face = this.face;

        this.bounds.minX = 0;
        this.bounds.minY = 0;
        this.bounds.maxX = 0;
        this.bounds.maxY = 0;

        if (this.text.length === 0)
            return;

        this.bounds.minX = Number.MAX_VALUE,
        this.bounds.minY = Number.MAX_VALUE,
        this.bounds.maxX = -Number.MAX_VALUE,
        this.bounds.maxY = -Number.MAX_VALUE;

        var xoff = 0;
        var metricsList = [];
        var offsets = [];
        var rowIdx = 0;

        var yoff = 0;


        var curWidth = 0;
        var rowWidths = [ 0 ];
        var maxWidth = 0;

        for (var i=0; i<text.length; i++) {
            var c = text.charAt(i);

            //skip chars
            if (c == '\r') {
                metricsList.push( {xadvance: 0 });
                continue;
            }

            //line chars
            if (c == '\n') {
                metricsList.push( {xadvance: 0} );
                yoff += this.lineHeight;
                xoff = 0;

                curWidth = 0;
                rowWidths.push(0);
                rowIdx++;
                continue;
            }

            //space chars
            if (c == ' ' || c == '\t') {
                metricsList.push( {xadvance: this.spaceWidth });
                //Should we include space as bounds?
                continue;
            }

            var glyph = new Glyph(face, c, size, steps, simplify);
            
            var metrics = util.getGlyphMetrics(face, size, c);
            if (!metrics)
                metrics = { xadvance: 0 };


            if (i > 0)
                xoff += metricsList[i-1].xadvance;

            curWidth = Math.max(curWidth, xoff + glyph.bounds.minX + (glyph.bounds.maxX-glyph.bounds.minX) )
            rowWidths[rowWidths.length-1] = curWidth;

            maxWidth = Math.max(maxWidth, curWidth);

            offsets.push( { x: xoff, y: yoff, row: rowIdx } );
            metricsList.push(metrics);
            
            this.glyphs.push(glyph);
        }



        for (var i=0; i<this.glyphs.length; i++) {
            var glyph = this.glyphs[i];
            var xoff = offsets[i].x;
            var yoff = offsets[i].y;
            var row = offsets[i].row;

            //determine how much to center it from the left
            var width = rowWidths[row];

            xoff += (maxWidth-width)/2;

            //create a transformation for this glyph
            tmpMat.idt();
            tmpMat.translate( tmp.set(xoff, yoff, 0) );

            //apply the transform so the glyph's points are now
            //part of the model-space of the entire text string
            glyph.applyTransform(tmpMat);

            this.bounds.minX = Math.min(this.bounds.minX, xoff + glyph.bounds.minX);
            this.bounds.maxX = Math.max(this.bounds.maxX, glyph.bounds.minX + (glyph.bounds.maxX - glyph.bounds.minX))
            this.bounds.minY = Math.min(this.bounds.minY, glyph.bounds.minY);
            this.bounds.maxY = Math.max(this.bounds.maxY, glyph.bounds.maxY);
        }


        this.bounds.minX = 0;
        this.bounds.maxX = maxWidth;
	},

    _maxWidth: function(offsets) {

    },

    destroy: function() {
        if (!this.glyphs)
            return;

        for (var i=0; i<this.glyphs.length; i++) {
            this.glyphs[i].destroy();
        }

        //Need to handle this more cleanly...
        // this.glyphs.length = 0;
        // this.glyphs = null;
    },
});

Text3D.ALIGN = {
    CENTER: 'CENTER',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
};

module.exports = Text3D;
},{"./Glyph":7,"./triangulate":11,"./util":13,"klasse":44,"vecmath":64}],"Bm9NR4":[function(require,module,exports){
module.exports = {
    triangulate: require('./triangulate'),
    util: require('./util'),
    Glyph: require('./Glyph'),
    Text3D: require('./Text3D')
};
},{"./Glyph":7,"./Text3D":8,"./triangulate":11,"./util":13}],"text3d":[function(require,module,exports){
module.exports=require('Bm9NR4');
},{}],11:[function(require,module,exports){
var poly2tri = require('poly2tri');

function getWindingNumber(point, points_list)
{
    // The winding number counter.
    var winding_number = 0;

    for (var i = 0; i < points_list.length; ++i)             // Edge from point1 to points_list[i+1]
    {
        var point1 = points_list[i];
        var point2;

        // Wrap?
        if (i === (points_list.length - 1))
        {
            point2 = points_list[0];
        }
        else
        {
            point2 = points_list[i + 1];
        }

        if (point1.y <= point.y)                                    // start y <= point.y
        {
            if (point2.y > point.y)                                 // An upward crossing
            {
                if (Is_Left(point1, point2, point) > 0)             // Point left of edge
                {
                    ++winding_number;                               // Have a valid up intersect
                }
            }
        }
        else
        {
            // start y > point.y (no test needed)
            if (point2.y <= point.y)                                // A downward crossing
            {
                if (Is_Left(point1, point2, point) < 0)             // Point right of edge
                {
                    --winding_number;                               // Have a valid down intersect
                }
            }
        }
    }

    return winding_number;
}

function Is_Left(p0, p1, point) {
    return ((p1.x - p0.x) * (point.y - p0.y) - (point.x - p0.x) * (p1.y - p0.y));
}

function isClockwise(points) {
    var sum = 0;
    for (var i=0; i<points.length; i++) {
        var o = i===points.length-1 ? points[0] : points[i+1];
        sum += (o.x - points[i].x) * (o.y + points[i].y);
    }
    return sum > 0;
}



function indexOfPointInList(other, list) {
    for (var i=0; i<list.length; i++) {
        var p = list[i];
        if (p.x == other.x && p.y == other.y)
            return i;
    }
    return -1;
}

function isCollinear(a, b, c) {
    var r = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y) ;
    var eps = 0.0000001;
    return Math.abs(r) < eps;
}

function asPointSet(points) {
    var contour = [];

    for (var n=0; n<points.length; n++) {
        var x = points[n].x;
        var y = points[n].y;
                
        var np = new poly2tri.Point(x, y);
        
        if (indexOfPointInList(np, contour) === -1) {
            if ( (n===0 || n===points.length-1) || !isCollinear(points[n-1], points[n], points[n+1]))
                contour.push(np);
        }
    }
    return contour;
}

/**
 * Triangulates a list of Shape objects. 
 */
module.exports = function (shapes) {
    var windingClockwise = false;
    var sweep = null;

    var poly = {holes:[], contour:[]};
    var allTris = [];

    // debugger;

    for (var j=0; j<shapes.length; j++) {
        var points = shapes[j].points;
        
        var set = asPointSet(points);

        //check the winding order
        if (j==0) {
            windingClockwise = isClockwise(set);

            var windingNumber = getWindingNumber(points[0], points);

            // console.log("POIND", j, windingClockwise, windingNumber);
        }
        
        try {
            // var set = asPointSet(points);

            //if the sweep has already been created, maybe we're on a hole?
            if (sweep !== null) {
                var clock = isClockwise(set);
                var windingNumber = getWindingNumber(points[0], points);

                // console.log("POINT", j, clock, windingNumber);

                //we have a hole...
                if (windingClockwise !== clock) {
                    sweep.addHole( set );
                    poly.holes.push(points);
                } else {
                    //no hole, so it must be a new shape.
                    //add our last shape
                    
                    sweep.triangulate();
                    allTris = allTris.concat(sweep.getTriangles());

                    //reset the sweep for next shape
                    sweep = new poly2tri.SweepContext(set);
                    poly = {holes:[], contour:points};
                }
            } else {
                sweep = new poly2tri.SweepContext(set);   
                poly = {holes:[], contour:points};
            }
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    //if the sweep is still setup, then triangulate it
    if (sweep !== null) {
        try {
            sweep.triangulate();
            allTris = allTris.concat(sweep.getTriangles());
        } catch (e) {
            console.log(e);
            return null;
        }
    }
    return allTris;
}
},{"poly2tri":49}],12:[function(require,module,exports){
module.exports=require(5)
},{}],13:[function(require,module,exports){
var Vector2 = require('vecmath').Vector2;
var Shape = require('shape2d');
var _typeface_js = require('./typeface-stripped.js');

var style = {
    fontSize: 12,
    fontStretchPercent: 1.0,
    letterSpacing: 0
};
      
module.exports.getFaces = function() {
    return _typeface_js.faces;
};

//Look through the dict, return if we find 'search'
//Otherwise return
function doLookup(dict, search, defaultVal) {
    var first = null;
    var foundDefault = null;

    for (var k in dict) {
        var e = dict[k];
        if (e) {
            if (k === search)
                return e;

            //store the first..
            if (first === null)
                first = e;
            if (defaultVal && foundDefault === null && k === defaultVal)
                foundDefault = e;
        }
    }
    return foundDefault !== null ? foundDefault : first;
}

/**
 * Returns the face by the given family, weight and style.
 * If these parameters are passed, they are expected to succeed,
 * otherwise an error is thrown. If a parameter is undefined (falsy),
 * we will do a looser lookup, initially looking for 'normal' style/weight,
 * and if that isn't found, then falling back to any weight/style that is
 * available. 
 *
 * If no parameters are passed, we simply find the first font, or null
 * if no faces are loaded.
 * 
 * @param  {[type]} family [description]
 * @param  {[type]} weight [description]
 * @param  {[type]} style  [description]
 * @return {[type]}        [description]
 */
module.exports.getFace = function(family, weight, style) {
    family = (family||'').toLowerCase();

    var face = null;
    if (_typeface_js && _typeface_js.faces) {

        if (family && !(family in _typeface_js.faces)) {
            throw "No font with the name "+family;
        }
        //get matching font..
        var fonts = family ? _typeface_js.faces[family] : doLookup(_typeface_js.faces, family);
        
        if (weight && !(weight in fonts)) {
            throw "No '"+family+"' weight with the value "+weight;
        }
            
        var weightDict = weight ? fonts[weight] : doLookup(fonts, weight, 'normal');
        if (style && !(style in weightDict)) {
            throw "No '"+family+"' style with the type "+style;
        }
        
        face = style ? weightDict[style] : doLookup(weightDict, style, 'normal');
    }
    return face;  
};

module.exports.getFaceHeight = function(face, size) {
    style.fontSize = size; 
    return Math.round(_typeface_js.pixelsFromPoints(face, style, face.lineHeight));
}

module.exports.getFaceAscent = function(face, size) {
    style.fontSize = size;
    return Math.round(_typeface_js.pixelsFromPoints(face, style, face.ascender));   
}

module.exports.pixelsFromPoints = function(face, size, points) {
    style.fontSize = size; 
    return _typeface_js.pixelsFromPoints(face, style, typeof points === "number" ? points : 1);
};

module.exports.pointsFromPixels = function(face, size, pixels) {
    style.fontSize = size; 
    return _typeface_js.pointsFromPixels(face, style, pixels);  
};

module.exports.getGlyphMetrics = function(face, size, chr) {
    var g = face.glyphs[chr];
    if (!g || !g.o)
        return null;
    var pointScale = module.exports.pixelsFromPoints(face, size);
    return {
        xadvance: (g.ha) ? g.ha * pointScale : 0,
        height: module.exports.getFaceHeight(face, size),
        ascent: module.exports.getFaceAscent(face, size)
    };
};

function scaleAndOffset(shape, scale, offset) {
    var p = shape.points;
    for (var i=0; i<p.length; i++) {
        p[i].x = p[i].x * scale.x + offset.x;
        p[i].y = p[i].y * scale.y + offset.y;
    }
}

function getShapeList(face, size, chr, steps) {
    steps = steps || 10;
    style.fontSize = size;
    
    var glyph = face.glyphs[chr];
    if (!glyph || !glyph.o)
        return null;
    
    moveTo(0, 0);
    var shapes = [];
    var shape = new Shape();

    var curves = false, //TODO: better curve fitting; and expose it to end-user
        factor = 0.5;
    shape.approximateCurves = curves;
    shape.approximationFactor = factor;
    shape.steps = steps;

    var pointScale = _typeface_js.pixelsFromPoints(face, style, 1);
    var scl = new Vector2(pointScale * style.fontStretchPercent, -pointScale);
    var off = new Vector2(0, face.ascender*pointScale);
    
    var outline = glyph.o.split(' ');
    var outlineLength = outline.length;
    for (var i = 0; i < outlineLength; ) {
        var action = outline[i++];

        switch(action) {
            case 'm':
                if (i!==1) {
                    scaleAndOffset(shape, scl, off);
                    shapes.push(shape);

                    shape = new Shape();
                    shape.approximateCurves = curves;
                    shape.approximationFactor = factor;
                    shape.steps = steps;
                }
                shape.moveTo(outline[i++], outline[i++]);
                break;
            case 'l':
                shape.lineTo(outline[i++], outline[i++]);
                break;
            case 'q':
                var cpx = outline[i++];
                var cpy = outline[i++];
                shape.quadraticCurveTo(outline[i++], outline[i++], cpx, cpy);
                break;
            case 'b':
                var x = outline[i++];
                var y = outline[i++];
                shape.bezierCurveTo(outline[i++], outline[i++], outline[i++], outline[i++], x, y);
                break;
        }
    }
    scaleAndOffset(shape, scl, off);
    shapes.push(shape);
    return shapes;
}


module.exports.getShapeList = getShapeList;
},{"./typeface-stripped.js":12,"shape2d":55,"vecmath":64}],14:[function(require,module,exports){
var Class = require('klasse');

var util = require('./vecutil');

var Vector2 = require('vecmath').Vector2;
var Vector3 = require('vecmath').Vector3;
var Vector4 = require('vecmath').Vector4;
var Matrix4 = require('vecmath').Matrix4;

var tmpVec3 = new Vector3();
var tmpVec4 = new Vector4();

/** 
 * Abstract base class for cameras to implement.
 * @class Camera
 * @abstract
 */
var Camera = new Class({
	
    initialize: function() {
        this.direction = new Vector3(0, 0, -1);
        this.up = new Vector3(0, 1, 0);
        this.position = new Vector3();
        
        this.projection = new Matrix4();
        this.view = new Matrix4();
        this.combined = new Matrix4();
        this.invProjectionView = new Matrix4();

        this.near = 1;
        this.far = 100;

        this.ray = {
            origin: new Vector3(),
            direction: new Vector3()
        };

        this.viewportWidth = 0;
        this.viewportHeight = 0;
    },

    /**
     * Translates this camera by a specified Vector3 object
     * or x, y, z parameters. Any undefined x y z values will
     * default to zero, leaving that component unaffected.
     * 
     * @param  {[type]} vec [description]
     * @return {[type]}     [description]
     */
    translate: function(x, y, z) {
        if (typeof x === "object") {
            this.position.x += x.x || 0;
            this.position.y += x.y || 0;
            this.position.z += x.z || 0;
        } else {
            this.position.x += x || 0;
            this.position.y += y || 0;
            this.position.z += z || 0;
        }
    },

    lookAt: function(x, y, z) {
        var dir = this.direction,
            up = this.up;

        if (typeof x === "object") {
            dir.copy(x);
        } else {
            dir.set(x, y, z);
        }

        dir.sub(this.position).normalize();

        //calculate right vector
        tmpVec3.copy(dir).cross(up).normalize();

        //calculate up vector
        up.copy(tmpVec3).cross(dir).normalize();
    },

    rotate: function(radians, axis) {
        util.rotate( this.direction, axis, radians );
        util.rotate( this.up, axis, radians );
    },

    rotateAround: function(point, radians, axis) {
        tmpVec.copy(point).sub(this.position);
        this.translate( tmpVec );
        this.rotate( radians, axis );
        this.translate( tmpVec.negate() );
    },

    project: function(vec, out) {
        if (!out)
            out = new Vector4();

        //TODO: support viewport XY
        var viewportWidth = this.viewportWidth,
            viewportHeight = this.viewportHeight,
            n = Camera.NEAR_RANGE,
            f = Camera.FAR_RANGE;

        // for useful Z and W values we should do the usual steps...
        //    clip space -> NDC -> window coords

        //implicit 1.0 for w component
        tmpVec4.set(vec.x, vec.y, vec.z, 1.0);
        
        //transform into clip space
        tmpVec4.transformMat4( this.combined );
        
        //now into NDC
        tmpVec4.x = tmpVec4.x / tmpVec4.w;
        tmpVec4.y = tmpVec4.y / tmpVec4.w;
        tmpVec4.z = tmpVec4.z / tmpVec4.w;
        
        //and finally into window coordinates
        out.x = viewportWidth/2 * tmpVec4.x + (0 + viewportWidth/2);
        out.y = viewportHeight/2 * tmpVec4.y + (0 + viewportHeight/2);
        out.z = (f-n)/2 * tmpVec4.z + (f+n)/2;

        //if the out vector has a fourth component, we also store (1/clip.w)
        //same idea as gl_FragCoord.w
        if (out.w === 0 || out.w)
            out.w = 1/tmpVec4.w;
        
        return out;
    },

    unproject: function(vec, out) {
        if (!out)
            out = new Vector3();

        var viewport = tmpVec4.set(0, 0, this.viewportWidth, this.viewportHeight);
        return out.copy(vec).unproject( viewport, this.invProjectionView );
    },

    getPickRay: function(x, y) {
        var origin = this.ray.origin.set(x, y, 0),
            direction = this.ray.direction.set(x, y, 1),
            viewport = tmpVec4.set(0, 0, this.viewportWidth, this.viewportHeight),
            mtx = this.invProjectionView;

        origin.unproject(viewport, mtx);
        direction.unproject(viewport, mtx);

        direction.sub(origin).normalize();
        return this.ray;
    },

    update: function() {
        //left empty for subclasses
    }
});

Camera.FAR_RANGE = 1.0;
Camera.NEAR_RANGE = 0.0;

// Regarding method overloading. It introduces a slow-down,
// but presumably this is negligible compared to the benefit of convenience.
// Besides, this is a high-level API!
// http://jsperf.com/arguments-length-perf

module.exports = Camera;



},{"./vecutil":18,"klasse":44,"vecmath":64}],15:[function(require,module,exports){
var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;
var Vector4 = require('vecmath').Vector4;
var Matrix4 = require('vecmath').Matrix4;

var Camera = require('./Camera');

var tmpVec3 = new Vector3();

var OrthographicCamera = new Class({

	Extends: Camera,

	initialize: function(viewportWidth, viewportHeight) {
		Camera.call(this);
		this.viewportWidth = viewportWidth||0;
		this.viewportHeight = viewportHeight||0;

		this.zoom = 1.0;
		this.near = 0;
		this.update();
	},

	setToOrtho: function(yDown, viewportWidth, viewportHeight) {
		var zoom = this.zoom;
		viewportWidth = typeof viewportWidth === "number" ? viewportWidth : this.viewportWidth;
		viewportHeight = typeof viewportHeight === "number" ? viewportHeight : this.viewportHeight;

		this.up.set(0, yDown ? -1 : 1, 0);
		this.direction.set(0, 0, yDown ? 1 : -1);
		this.position.set(zoom * viewportWidth/2, zoom * viewportHeight/2, 0);

		this.viewportWidth = viewportWidth;
		this.viewportHeight = viewportHeight;
		this.update();
	},

	update: function() {
		//TODO: support x/y offset
		var w = this.viewportWidth,
			h = this.viewportHeight,
			near = Math.abs(this.near),
			far = Math.abs(this.far),
			zoom = this.zoom;

		this.projection.ortho(
					zoom * -w/2, zoom * w/2, 
					zoom * -h/2, zoom * h/2,
					near, far);		
		

		//build the view matrix 
		tmpVec3.copy(this.position).add(this.direction);
		this.view.lookAt(this.position, tmpVec3, this.up);


		//projection * view matrix
		this.combined.copy(this.projection).mul(this.view);

		//invert combined matrix, used for unproject
		this.invProjectionView.copy(this.combined).invert();
	}
});

module.exports = OrthographicCamera;
},{"./Camera":14,"klasse":44,"vecmath":64}],16:[function(require,module,exports){
var Class = require('klasse');

var Matrix4 = require('vecmath').Matrix4;
var Vector2 = require('vecmath').Vector2;
var Vector3 = require('vecmath').Vector3;
var Camera = require('./Camera');

var tmpVec3 = new Vector3();

var dirvec = null,
    rightvec = null,
    billboardMatrix = null;

var PerspectiveCamera = new Class({

	Extends: Camera,

	//fov in RADIANS!
	initialize: function(fieldOfView, viewportWidth, viewportHeight) {
		Camera.call(this);
		this.viewportWidth = viewportWidth;
		this.viewportHeight = viewportHeight;

        this.billboardMatrixDirty = true;

		this.fieldOfView = fieldOfView;
		this.update();
	},

	/**
	 * This method sets the width and height of the viewport.
	 * 
	 * @method  setViewport
	 * @param {Number} width  the viewport width
	 * @param {Number} height the viewport height
	 */
	setViewport: function(width, height) {
		this.viewportWidth = width;
		this.viewportHeight = height;
	},

    /**
     * This is a helper function to determine the scaling factor
     * for 2D billboard sprites when projected in 3D space. 
     *
     * @param  {vec3} position     the 3D position
     * @param  {vec2} originalSize the 2D sprite size
     * @return {vec2}              the output size
     */
    // projectedScale: function(position, originalSize, out) {
    // },



    updateBillboardMatrix: function() {
        if (!dirvec) {
            dirvec = new Vector3();
            rightvec = new Vector3();
            billboardMatrix = new Matrix4();
        }


        var dir = dirvec.set(this.direction).negate();

        // Better view-aligned billboards might use this:
        // var dir = tmp.set(camera.position).sub(p).normalize();
        
        var right = rightvec.set(this.up).cross(dir).normalize();
        var up = tmpVec3.set(dir).cross(right).normalize();

        var out = billboardMatrix.val;
        out[0] = right.x;
        out[1] = right.y;
        out[2] = right.z;
        out[3] = 0;
        out[4] = up.x;
        out[5] = up.y;
        out[6] = up.z;
        out[7] = 0;
        out[8] = dir.x;
        out[9] = dir.y;
        out[10] = dir.z;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;

        this.billboardMatrixDirty = false;
    },

    /**
     * This is a utility function for canvas 3D rendering, 
     * which determines the "point size" of a camera-facing
     * sprite billboard given its 3D world position 
     * (origin at center of sprite) and its world width
     * and height in x/y. 
     *
     * We place into the output Vector2 the scaled width
     * and height. If no `out` is specified, a new Vector2
     * will be created for convenience (this should be avoided 
     * in tight loops).
     * 
     * @param  {Vector3} vec the position of the 3D sprite
     * @param  {Vector2} size the x and y dimensions of the sprite
     * @param  {Vector2} out the result, scaled x and y dimensions in 3D space
     * @return {Vector2} returns the out parameter, or a new Vector2 if none was given    
     */
    getPointSize: function(vec, size, out) {
        //TODO: optimize this with a simple distance calculation:
        //https://developer.valvesoftware.com/wiki/Field_of_View

        if (!out)
            out = new Vector2();

        if (this.billboardMatrixDirty)
            this.updateBillboardMatrix();

        var tmp = tmpVec3;

        var dx = size.x/2;
        var dy = size.y/2;

        tmp.set(-dx, -dy, 0).transformMat4(billboardMatrix).add(vec);
        this.project(tmp, tmp);

        var tlx = tmp.x;
        var tly = tmp.y;

        tmp.set(dx, dy, 0).transformMat4(billboardMatrix).add(vec);
        this.project(tmp, tmp);

        var brx = tmp.x;
        var bry = tmp.y;

        var w = Math.abs(brx - tlx);
        var h = Math.abs(bry - tly);
        return out.set(w, h);
    },

	update: function() {
		var aspect = this.viewportWidth / this.viewportHeight;

		//create a perspective matrix for our camera
		this.projection.perspective(this.fieldOfView, aspect, 
							Math.abs(this.near), Math.abs(this.far));

		//build the view matrix 
		tmpVec3.copy(this.position).add(this.direction);
		this.view.lookAt(this.position, tmpVec3, this.up);

		//projection * view matrix
		this.combined.copy(this.projection).mul(this.view);

		//invert combined matrix, used for unproject
		this.invProjectionView.copy(this.combined).invert();

        this.billboardMatrixDirty = true;
	}
});

module.exports = PerspectiveCamera;
},{"./Camera":14,"klasse":44,"vecmath":64}],17:[function(require,module,exports){
module.exports = {
	vecutil: require('./vecutil'),
	Camera: require('./Camera'),
    PerspectiveCamera: require('./PerspectiveCamera'),
    OrthographicCamera: require('./OrthographicCamera')
};
},{"./Camera":14,"./OrthographicCamera":15,"./PerspectiveCamera":16,"./vecutil":18}],18:[function(require,module,exports){

var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;
var Quaternion = require('vecmath').Quaternion;

var tmpMat4 = new Matrix4();
var tmpQuat = new Quaternion();
var tmpVec3 = new Vector3();

var util = {};

/**
 * Rotates a vector in place by axis angle.
 *
 * This is the same as transforming a point by an 
 * axis-angle quaternion, but it has higher precision.
 * 
 * @param  {Vector3} vec     [description]
 * @param  {Vector3} axis    [description]
 * @param  {float} radians [description]
 * @return {Vector3}         [description]
 */
util.rotate = function(vec, axis, radians) {
    //set the quaternion to our axis angle
    tmpQuat.setAxisAngle(axis, radians);

    //create a rotation matrix from the axis angle
    tmpMat4.fromRotationTranslation( tmpQuat, tmpVec3.set(0, 0, 0) );

    //multiply our vector by the rotation matrix
    return vec.transformMat4( tmpMat4 );
};

module.exports = util;
},{"vecmath":64}],19:[function(require,module,exports){
/** Utility function for linear interpolation. */
module.exports.lerp = function(v0, v1, t) {
    return v0*(1-t)+v1*t;
};

/** Utility function for Hermite interpolation. */
module.exports.smoothstep = function(v0, v1, t) {
    // Scale, bias and saturate x to 0..1 range
    t = Math.max(0.0, Math.min(1.0, (t - v0)/(v1 - v0) ));
    // Evaluate polynomial
    return t*t*(3 - 2*t);
};
},{}],20:[function(require,module,exports){
module.exports = {
    MeshRenderer: require('./lib/MeshRenderer'),
};
},{"./lib/MeshRenderer":21}],21:[function(require,module,exports){
var Class = require('klasse');
var Mesh = require('kami').Mesh;
var ShaderProgram = require('kami').ShaderProgram;

var Matrix4 = require('vecmath').Matrix4;
var colorToFloat = require('number-util').colorToFloat;


////TODOS:
/// - use BaseBatch as a mixin for flush/begin/etc.
/// - rename to VertexRenderer? ImmediateModeRenderer?

/**
 * An immediate mode mesh renderer, mostly straight from LibGDX:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/glutils/ImmediateModeRenderer20.java
 * 
 * This is mainly useful for prototyping.
 *
 * The options and their defaults:
 *
 * @class  MeshRenderer
 * @constructor
 * @param {WebGLContext} context the WebGLContext for management
 * @param {Object} options the optional set of options
 * @param {Boolean} options.hasNormals whether the renderer should write normals; default false
 * @param {Boolean} options.hasColors whether the renderer should write colors; default false
 * @param {Number} options.numTexCoords the number of texture coordinates to write. defaults to zero (no texcoords)
 * @param {Number} options.maxVertices the maximum number of vertices for this renderer, default 500
 */
var MeshRenderer = new Class({

    initialize: function(context, options) {
        this.context = context;
        if (!context)
            throw new Error("no WebGLContext specified to MeshRenderer");

        options = options || {};

        var hasNormals = typeof options.hasNormals !== "undefined" ? options.hasNormals : false;
        var hasColors = typeof options.hasColors !== "undefined" ? options.hasColors : false;
        this.numTexCoords = options.numTexCoords || 0;
        this.maxVertices = typeof options.maxVertices === "number" ? options.maxVertices : 500;

        var attribs = this._createVertexAttributes(hasNormals, hasColors);
        this.mesh = new Mesh(context, false, this.maxVertices, 0, attribs);

        //offset in FLOATS from start of vertex
        this.normalOffset = hasNormals ? 3 : 0;
        this.colorOffset = hasColors ? (this.normalOffset + 3) : 0;
        this.texCoordOffset = this.numTexCoords > 0 ? (this.colorOffset + 1) : 0;
        
        this.numSetTexCoords = 0;
        this.vertices = this.mesh.vertices;
        this.vertexSize = this.mesh.vertexStride / 4;

        this.primitiveType = context.gl.TRIANGLES;

        this.premultiplied = true;
        this.vertexIdx = 0;
        this.numVertices = 0;

        this.projModelView = new Matrix4();
        this._shader = MeshRenderer.createDefaultShader(context, hasNormals, hasColors, this.numTexCoords);


        /**
         * This shader will be used whenever "null" is passed
         * as the renderer's shader. 
         *
         * @property {ShaderProgram} shader
         */
        this.defaultShader = this._shader;

        /**
         * By default, a MeshRenderer is created with its own ShaderProgram,
         * stored in `defaultShader`. If this flag is true, on deleting the MeshRenderer, its
         * `defaultShader` will also be deleted. If this flag is false, no shaders
         * will be deleted on destroy.
         *
         * Note that if you re-assign `defaultShader`, you will need to dispose the previous
         * default shader yoursel. 
         *
         * @property ownsShader
         * @type {Boolean}
         */
        this.ownsShader = true;
    },


    destroy: function() {
        if (this.ownsShader && this.defaultShader)
            this.defaultShader.destroy();
        if (this.mesh)
            this.mesh.destroy();

        this.defaultShader = null;
        this._shader = null;
        this.mesh = null;
        this.context = null;
    },

    /**
     * This is a setter/getter for this renderer's current ShaderProgram.
     * 
     * If `null` or a falsy value is specified, the batch's `defaultShader` will be used. 
     *
     * Note that shaders are bound on renderer.begin().
     *
     * @property shader
     * @type {ShaderProgram}
     */
    shader: {
        set: function(val) {

            this._shader = val ? val : this.defaultShader;

            if (this.drawing) {
                this._shader.bind();
                this.uploadMatrices();
            }
        },

        get: function() {
            return this._shader;
        }
    },

    _createVertexAttributes: function(hasNormals, hasColors) {
        var gl = this.context.gl;
        var attribs = [
            new Mesh.Attrib(ShaderProgram.POSITION_ATTRIBUTE, 3)
        ];

        if (hasNormals)
            attribs.push( new Mesh.Attrib(ShaderProgram.NORMAL_ATTRIBUTE, 3) );
        if (hasColors)
            attribs.push( new Mesh.Attrib(ShaderProgram.COLOR_ATTRIBUTE, 4, null, gl.UNSIGNED_BYTE, true, 1) );

        for (var i = 0; i < this.numTexCoords; i++) {
            attribs.push( new Mesh.Attrib(ShaderProgram.TEXCOORD_ATTRIBUTE+i, 2) );
        }

        return attribs;
    },

    begin: function(projModelView, primitiveType) {
        if (this.drawing) 
            throw "batch.end() must be called before begin";
        this.drawing = true;

        if (projModelView)
            this.projModelView.set(projModelView);
        this.primitiveType = typeof primitiveType === "undefined" ? this.context.gl.TRIANGLES : primitiveType;

        var shader = this._shader;
        shader.bind();
        this.uploadMatrices();
    },

    uploadMatrices: function() {
        var shader = this._shader;
        shader.setUniformMatrix4("u_projModelView", this.projModelView);
        for (var i=0; i<this.numTexCoords; i++) {
            shader.setUniformi("u_sampler"+i, i);
        }
    },

    color: function(r, g, b, a) {
        var rnum = typeof r === "number";
        if (rnum
                && typeof g === "number"
                && typeof b === "number") {
            //default alpha to one 
            a = (a || a === 0) ? a : 1.0;
        } else {
            r = g = b = a = rnum ? r : 1.0;
        }
        

        if (this.premultiplied) {
            r *= a;
            g *= a;
            b *= a;
        }
        
        var color = colorToFloat(
            ~~(r * 255),
            ~~(g * 255),
            ~~(b * 255),
            ~~(a * 255)
        );
        this.vertices[ this.vertexIdx + this.colorOffset ] = color;
    },

    texCoord: function(u, v) {
        var idx = this.vertexIdx + this.texCoordOffset;
        this.vertices[ idx + this.numSetTexCoords ] = u || 0;
        this.vertices[ idx + this.numSetTexCoords + 1 ] = v || 0;
        this.numSetTexCoords += 2;
    },

    normal: function(x, y, z) {
        var idx = this.vertexIdx + this.normalOffset;
        this.vertices[ idx ] = x || 0;
        this.vertices[ idx + 1 ] = y || 0;
        this.vertices[ idx + 2 ] = z || 0;
    },

    vertex: function(x, y, z) {
        var idx = this.vertexIdx;
        this.vertices[ idx ] = x || 0;
        this.vertices[ idx + 1 ] = y || 0;
        this.vertices[ idx + 2 ] = z || 0;

        this.numSetTexCoords = 0;
        this.vertexIdx += this.vertexSize;
        this.numVertices++;
    },

    end: function() {
        //TODO: allow flushing and check for size like SpriteBatch
        if (!this.drawing)
            throw "renderer.begin() must be called before end";

        this.drawing = false;
        
        if (this.numVertices === 0)
            return;

        var shader = this._shader,
            gl = this.context.gl;

        this.mesh.bind(shader);

        this.mesh.verticesDirty = true;
        this.mesh.draw(this.primitiveType, this.vertexIdx * 4 / this.mesh.vertexStride, 0, this.vertexIdx);

        this.mesh.unbind(shader);

        this.numSetTexCoords = 0;
        this.vertexIdx = 0;
        this.numVertices = 0;
    }
});

//little shader builder from LibGDX..
MeshRenderer.createDefaultShader = function(context, hasNormals, hasColors, numTexCoords) {
    var vertSrc = MeshRenderer.createVertexShader(hasNormals, hasColors, numTexCoords);
    var fragSrc = MeshRenderer.createFragmentShader(hasColors, numTexCoords);
    return new ShaderProgram(context, vertSrc, fragSrc);
};

MeshRenderer.createVertexShader = function(hasNormals, hasColors, numTexCoords) {
    numTexCoords = numTexCoords || 0;
    var shader = "";
    shader += "attribute vec4 "+ShaderProgram.POSITION_ATTRIBUTE+";\n"
         + (hasNormals ? "attribute vec3 " + ShaderProgram.NORMAL_ATTRIBUTE + ";\n" : "")
         + (hasColors ? "attribute vec4 " + ShaderProgram.COLOR_ATTRIBUTE + ";\n" : "");

    var i;

    for (i = 0; i < numTexCoords; i++) {
        shader += "attribute vec2 " + ShaderProgram.TEXCOORD_ATTRIBUTE + i + ";\n";
    }

    shader += "uniform mat4 u_projModelView;\n";
    
    shader += (hasColors ? "varying vec4 v_col;\n" : "");

    for (i = 0; i < numTexCoords; i++) {
        shader += "varying vec2 v_tex" + i + ";\n";
    }

    shader += "void main() {\n" + "   gl_Position = u_projModelView * " + ShaderProgram.POSITION_ATTRIBUTE + ";\n"
            + (hasColors ? "   v_col = " + ShaderProgram.COLOR_ATTRIBUTE + ";\n" : "");

    for (i = 0; i < numTexCoords; i++) {
        shader += "   v_tex" + i + " = " + ShaderProgram.TEXCOORD_ATTRIBUTE + i + ";\n";
    }
    shader += "   gl_PointSize = 1.0;\n";
    shader += "}\n";

    return shader;
};

MeshRenderer.createFragmentShader = function(hasColors, numTexCoords) {
    numTexCoords = numTexCoords || 0;
    var shader = "#ifdef GL_ES\n" + "precision mediump float;\n" + "#endif\n";
 
    if (hasColors) 
        shader += "varying vec4 v_col;\n";

    var i;
    for (i = 0; i < numTexCoords; i++) {
            shader += "varying vec2 v_tex" + i + ";\n";
            shader += "uniform sampler2D u_sampler" + i + ";\n";
    }

    shader += "void main() {\n" + "   gl_FragColor = " + (hasColors ? "v_col" : "vec4(1, 1, 1, 1)");

    if (numTexCoords > 0) shader += " * ";

    for (i = 0; i < numTexCoords; i++) {
            if (i == numTexCoords - 1) {
                    shader += " texture2D(u_sampler" + i + ",  v_tex" + i + ")";
            } else {
                    shader += " texture2D(u_sampler" + i + ",  v_tex" + i + ") *";
            }
    }

    shader += ";\n}";
    return shader;
};

module.exports = MeshRenderer;
},{"kami":40,"klasse":22,"number-util":23,"vecmath":31}],22:[function(require,module,exports){
function hasGetterOrSetter(def) {
	return (!!def.get && typeof def.get === "function") || (!!def.set && typeof def.set === "function");
}

function getProperty(definition, k, isClassDescriptor) {
	//This may be a lightweight object, OR it might be a property
	//that was defined previously.
	
	//For simple class descriptors we can just assume its NOT previously defined.
	var def = isClassDescriptor 
				? definition[k] 
				: Object.getOwnPropertyDescriptor(definition, k);

	if (!isClassDescriptor && def.value && typeof def.value === "object") {
		def = def.value;
	}


	//This might be a regular property, or it may be a getter/setter the user defined in a class.
	if ( def && hasGetterOrSetter(def) ) {
		if (typeof def.enumerable === "undefined")
			def.enumerable = true;
		if (typeof def.configurable === "undefined")
			def.configurable = true;
		return def;
	} else {
		return false;
	}
}

function hasNonConfigurable(obj, k) {
	var prop = Object.getOwnPropertyDescriptor(obj, k);
	if (!prop)
		return false;

	if (prop.value && typeof prop.value === "object")
		prop = prop.value;

	if (prop.configurable === false) 
		return true;

	return false;
}

//TODO: On create, 
//		On mixin, 

function extend(ctor, definition, isClassDescriptor, extend) {
	for (var k in definition) {
		if (!definition.hasOwnProperty(k))
			continue;

		var def = getProperty(definition, k, isClassDescriptor);

		if (def !== false) {
			//If Extends is used, we will check its prototype to see if 
			//the final variable exists.
			
			var parent = extend || ctor;
			if (hasNonConfigurable(parent.prototype, k)) {

				//just skip the final property
				if (Class.ignoreFinals)
					continue;

				//We cannot re-define a property that is configurable=false.
				//So we will consider them final and throw an error. This is by
				//default so it is clear to the developer what is happening.
				//You can set ignoreFinals to true if you need to extend a class
				//which has configurable=false; it will simply not re-define final properties.
				throw new Error("cannot override final property '"+k
							+"', set Class.ignoreFinals = true to skip");
			}

			Object.defineProperty(ctor.prototype, k, def);
		} else {
			ctor.prototype[k] = definition[k];
		}

	}
}

/**
 */
function mixin(myClass, mixins) {
	if (!mixins)
		return;

	if (!Array.isArray(mixins))
		mixins = [mixins];

	for (var i=0; i<mixins.length; i++) {
		extend(myClass, mixins[i].prototype || mixins[i]);
	}
}

/**
 * Creates a new class with the given descriptor.
 * The constructor, defined by the name `initialize`,
 * is an optional function. If unspecified, an anonymous
 * function will be used which calls the parent class (if
 * one exists). 
 *
 * You can also use `Extends` and `Mixins` to provide subclassing
 * and inheritance.
 *
 * @class  Class
 * @constructor
 * @param {Object} definition a dictionary of functions for the class
 * @example
 *
 * 		var MyClass = new Class({
 * 		
 * 			initialize: function() {
 * 				this.foo = 2.0;
 * 			},
 *
 * 			bar: function() {
 * 				return this.foo + 5;
 * 			}
 * 		});
 */
function Class(definition) {
	if (!definition)
		definition = {};

	//The variable name here dictates what we see in Chrome debugger
	var initialize;
	var Extends;

	if (definition.initialize) {
		if (typeof definition.initialize !== "function")
			throw new Error("initialize must be a function");
		initialize = definition.initialize;

		//Usually we should avoid "delete" in V8 at all costs.
		//However, its unlikely to make any performance difference
		//here since we only call this on class creation (i.e. not object creation).
		delete definition.initialize;
	} else {
		if (definition.Extends) {
			var base = definition.Extends;
			initialize = function () {
				base.apply(this, arguments);
			}; 
		} else {
			initialize = function () {}; 
		}
	}

	if (definition.Extends) {
		initialize.prototype = Object.create(definition.Extends.prototype);
		initialize.prototype.constructor = initialize;
		//for getOwnPropertyDescriptor to work, we need to act
		//directly on the Extends (or Mixin)
		Extends = definition.Extends;
		delete definition.Extends;
	} else {
		initialize.prototype.constructor = initialize;
	}

	//Grab the mixins, if they are specified...
	var mixins = null;
	if (definition.Mixins) {
		mixins = definition.Mixins;
		delete definition.Mixins;
	}

	//First, mixin if we can.
	mixin(initialize, mixins);

	//Now we grab the actual definition which defines the overrides.
	extend(initialize, definition, true, Extends);

	return initialize;
};

Class.extend = extend;
Class.mixin = mixin;
Class.ignoreFinals = false;

module.exports = Class;
},{}],23:[function(require,module,exports){
var int8 = new Int8Array(4);
var int32 = new Int32Array(int8.buffer, 0, 1);
var float32 = new Float32Array(int8.buffer, 0, 1);

/**
 * A singleton for number utilities. 
 * @class NumberUtil
 */
var NumberUtil = function() {

};


/**
 * Returns a float representation of the given int bits. ArrayBuffer
 * is used for the conversion.
 *
 * @method  intBitsToFloat
 * @static
 * @param  {Number} i the int to cast
 * @return {Number}   the float
 */
NumberUtil.intBitsToFloat = function(i) {
	int32[0] = i;
	return float32[0];
};

/**
 * Returns the int bits from the given float. ArrayBuffer is used
 * for the conversion.
 *
 * @method  floatToIntBits
 * @static
 * @param  {Number} f the float to cast
 * @return {Number}   the int bits
 */
NumberUtil.floatToIntBits = function(f) {
	float32[0] = f;
	return int32[0];
};

/**
 * Encodes ABGR int as a float, with slight precision loss.
 *
 * @method  intToFloatColor
 * @static
 * @param {Number} value an ABGR packed integer
 */
NumberUtil.intToFloatColor = function(value) {
	return NumberUtil.intBitsToFloat( value & 0xfeffffff );
};

/**
 * Returns a float encoded ABGR value from the given RGBA
 * bytes (0 - 255). Useful for saving bandwidth in vertex data.
 *
 * @method  colorToFloat
 * @static
 * @param {Number} r the Red byte (0 - 255)
 * @param {Number} g the Green byte (0 - 255)
 * @param {Number} b the Blue byte (0 - 255)
 * @param {Number} a the Alpha byte (0 - 255)
 * @return {Float32}  a Float32 of the RGBA color
 */
NumberUtil.colorToFloat = function(r, g, b, a) {
	var bits = (a << 24 | b << 16 | g << 8 | r);
	return NumberUtil.intToFloatColor(bits);
};

/**
 * Returns true if the number is a power-of-two.
 *
 * @method  isPowerOfTwo
 * @param  {Number}  n the number to test
 * @return {Boolean}   true if power-of-two
 */
NumberUtil.isPowerOfTwo = function(n) {
	return (n & (n - 1)) === 0;
};

/**
 * Returns the next highest power-of-two from the specified number. 
 * 
 * @param  {Number} n the number to test
 * @return {Number}   the next highest power of two
 */
NumberUtil.nextPowerOfTwo = function(n) {
	n--;
	n |= n >> 1;
	n |= n >> 2;
	n |= n >> 4;
	n |= n >> 8;
	n |= n >> 16;
	return n+1;
};

module.exports = NumberUtil;
},{}],24:[function(require,module,exports){
var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;

function Matrix3(m) {
    this.val = new ARRAY_TYPE(9);

    if (m) { //assume Matrix3 with val
        this.copy(m);
    } else { //default to identity
        this.idt();
    }
}

var mat3 = Matrix3.prototype;

mat3.clone = function() {
    return new Matrix3(this);
};

mat3.set = function(otherMat) {
    return this.copy(otherMat);
};

mat3.copy = function(otherMat) {
    var out = this.val,
        a = otherMat.val; 
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return this;
};

mat3.fromMat4 = function(m) {
    var a = m.val,
        out = this.val;
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return this;
};

mat3.fromArray = function(a) {
    var out = this.val;
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return this;
};

mat3.identity = function() {
    var out = this.val;
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return this;
};

mat3.transpose = function() {
    var a = this.val,
        a01 = a[1], 
        a02 = a[2], 
        a12 = a[5];
    a[1] = a[3];
    a[2] = a[6];
    a[3] = a01;
    a[5] = a[7];
    a[6] = a02;
    a[7] = a12;
    return this;
};

mat3.invert = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    a[0] = b01 * det;
    a[1] = (-a22 * a01 + a02 * a21) * det;
    a[2] = (a12 * a01 - a02 * a11) * det;
    a[3] = b11 * det;
    a[4] = (a22 * a00 - a02 * a20) * det;
    a[5] = (-a12 * a00 + a02 * a10) * det;
    a[6] = b21 * det;
    a[7] = (-a21 * a00 + a01 * a20) * det;
    a[8] = (a11 * a00 - a01 * a10) * det;
    return this;
};

mat3.adjoint = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    a[0] = (a11 * a22 - a12 * a21);
    a[1] = (a02 * a21 - a01 * a22);
    a[2] = (a01 * a12 - a02 * a11);
    a[3] = (a12 * a20 - a10 * a22);
    a[4] = (a00 * a22 - a02 * a20);
    a[5] = (a02 * a10 - a00 * a12);
    a[6] = (a10 * a21 - a11 * a20);
    a[7] = (a01 * a20 - a00 * a21);
    a[8] = (a00 * a11 - a01 * a10);
    return this;
};

mat3.determinant = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

mat3.multiply = function(otherMat) {
    var a = this.val,
        b = otherMat.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    a[0] = b00 * a00 + b01 * a10 + b02 * a20;
    a[1] = b00 * a01 + b01 * a11 + b02 * a21;
    a[2] = b00 * a02 + b01 * a12 + b02 * a22;

    a[3] = b10 * a00 + b11 * a10 + b12 * a20;
    a[4] = b10 * a01 + b11 * a11 + b12 * a21;
    a[5] = b10 * a02 + b11 * a12 + b12 * a22;

    a[6] = b20 * a00 + b21 * a10 + b22 * a20;
    a[7] = b20 * a01 + b21 * a11 + b22 * a21;
    a[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return this;
};

mat3.translate = function(v) {
    var a = this.val,
        x = v.x, y = v.y;
    a[6] = x * a[0] + y * a[3] + a[6];
    a[7] = x * a[1] + y * a[4] + a[7];
    a[8] = x * a[2] + y * a[5] + a[8];
    return this;
};

mat3.rotate = function(rad) {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],

        s = Math.sin(rad),
        c = Math.cos(rad);

    a[0] = c * a00 + s * a10;
    a[1] = c * a01 + s * a11;
    a[2] = c * a02 + s * a12;

    a[3] = c * a10 - s * a00;
    a[4] = c * a11 - s * a01;
    a[5] = c * a12 - s * a02;
    return this;
};

mat3.scale = function(v) {
    var a = this.val,
        x = v.x, 
        y = v.y;

    a[0] = x * a[0];
    a[1] = x * a[1];
    a[2] = x * a[2];

    a[3] = y * a[3];
    a[4] = y * a[4];
    a[5] = y * a[5];
    return this;
};

mat3.fromQuat = function(q) {
    var x = q.x, y = q.y, z = q.z, w = q.w,
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2,

        out = this.val;

    out[0] = 1 - (yy + zz);
    out[3] = xy + wz;
    out[6] = xz - wy;

    out[1] = xy - wz;
    out[4] = 1 - (xx + zz);
    out[7] = yz + wx;

    out[2] = xz + wy;
    out[5] = yz - wx;
    out[8] = 1 - (xx + yy);
    return this;
};

mat3.normalFromMat4 = function(m) {
    var a = m.val,
        out = this.val,

        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    return this;
};

mat3.mul = mat3.multiply;

mat3.idt = mat3.identity;

//This is handy for Pool utilities, to "reset" a
//shared object to its default state
mat3.reset = mat3.idt;

mat3.toString = function() {
    var a = this.val;
    return 'Matrix3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

mat3.str = mat3.toString;

module.exports = Matrix3;
},{}],25:[function(require,module,exports){
var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
var EPSILON = 0.000001;

function Matrix4(m) {
    this.val = new ARRAY_TYPE(16);

    if (m) { //assume Matrix4 with val
        this.copy(m);
    } else { //default to identity
        this.idt();
    }
}

var mat4 = Matrix4.prototype;

mat4.clone = function() {
    return new Matrix4(this);
};

mat4.set = function(otherMat) {
    return this.copy(otherMat);
};

mat4.copy = function(otherMat) {
    var out = this.val,
        a = otherMat.val; 
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return this;
};

mat4.fromArray = function(a) {
    var out = this.val;
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return this;
};

mat4.identity = function() {
    var out = this.val;
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return this;
};

mat4.transpose = function() {
    var a = this.val,
        a01 = a[1], a02 = a[2], a03 = a[3],
        a12 = a[6], a13 = a[7],
        a23 = a[11];

    a[1] = a[4];
    a[2] = a[8];
    a[3] = a[12];
    a[4] = a01;
    a[6] = a[9];
    a[7] = a[13];
    a[8] = a02;
    a[9] = a12;
    a[11] = a[14];
    a[12] = a03;
    a[13] = a13;
    a[14] = a23;
    return this;
};

mat4.invert = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    a[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    a[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    a[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    a[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    a[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    a[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    a[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    a[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    a[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    a[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    a[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    a[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    a[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    a[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    a[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    a[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return this;
};

mat4.adjoint = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    a[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    a[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    a[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    a[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    a[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    a[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    a[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    a[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    a[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    a[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    a[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    a[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    a[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    a[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    a[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    a[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return this;
};

mat4.determinant = function () {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

mat4.multiply = function(otherMat) {
    var a = this.val,
        b = otherMat.val,
        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    a[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    a[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    a[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    a[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    a[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    a[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    a[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    a[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    a[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    a[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    a[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    a[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    a[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    a[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    a[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    a[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return this;
};

mat4.translate = function(v) {
    var x = v.x, y = v.y, z = v.z,
        a = this.val;
    a[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    a[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    a[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    a[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    return this;
};

mat4.scale = function(v) {
    var x = v.x, y = v.y, z = v.z, a = this.val;

    a[0] = a[0] * x;
    a[1] = a[1] * x;
    a[2] = a[2] * x;
    a[3] = a[3] * x;
    a[4] = a[4] * y;
    a[5] = a[5] * y;
    a[6] = a[6] * y;
    a[7] = a[7] * y;
    a[8] = a[8] * z;
    a[9] = a[9] * z;
    a[10] = a[10] * z;
    a[11] = a[11] * z;
    a[12] = a[12];
    a[13] = a[13];
    a[14] = a[14];
    a[15] = a[15];
    return this;
};

mat4.rotate = function (rad, axis) {
    var a = this.val,
        x = axis.x, y = axis.y, z = axis.z,
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < EPSILON) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    a[0] = a00 * b00 + a10 * b01 + a20 * b02;
    a[1] = a01 * b00 + a11 * b01 + a21 * b02;
    a[2] = a02 * b00 + a12 * b01 + a22 * b02;
    a[3] = a03 * b00 + a13 * b01 + a23 * b02;
    a[4] = a00 * b10 + a10 * b11 + a20 * b12;
    a[5] = a01 * b10 + a11 * b11 + a21 * b12;
    a[6] = a02 * b10 + a12 * b11 + a22 * b12;
    a[7] = a03 * b10 + a13 * b11 + a23 * b12;
    a[8] = a00 * b20 + a10 * b21 + a20 * b22;
    a[9] = a01 * b20 + a11 * b21 + a21 * b22;
    a[10] = a02 * b20 + a12 * b21 + a22 * b22;
    a[11] = a03 * b20 + a13 * b21 + a23 * b22;
    return this;
};

mat4.rotateX = function(rad) {
    var a = this.val,
        s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    // Perform axis-specific matrix multiplication
    a[4] = a10 * c + a20 * s;
    a[5] = a11 * c + a21 * s;
    a[6] = a12 * c + a22 * s;
    a[7] = a13 * c + a23 * s;
    a[8] = a20 * c - a10 * s;
    a[9] = a21 * c - a11 * s;
    a[10] = a22 * c - a12 * s;
    a[11] = a23 * c - a13 * s;
    return this;
};

mat4.rotateY = function(rad) {
    var a = this.val,
        s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    // Perform axis-specific matrix multiplication
    a[0] = a00 * c - a20 * s;
    a[1] = a01 * c - a21 * s;
    a[2] = a02 * c - a22 * s;
    a[3] = a03 * c - a23 * s;
    a[8] = a00 * s + a20 * c;
    a[9] = a01 * s + a21 * c;
    a[10] = a02 * s + a22 * c;
    a[11] = a03 * s + a23 * c;
    return this;
};

mat4.rotateZ = function (rad) {
    var a = this.val,
        s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    // Perform axis-specific matrix multiplication
    a[0] = a00 * c + a10 * s;
    a[1] = a01 * c + a11 * s;
    a[2] = a02 * c + a12 * s;
    a[3] = a03 * c + a13 * s;
    a[4] = a10 * c - a00 * s;
    a[5] = a11 * c - a01 * s;
    a[6] = a12 * c - a02 * s;
    a[7] = a13 * c - a03 * s;
    return this;
};

mat4.fromRotationTranslation = function (q, v) {
    // Quaternion math
    var out = this.val,
        x = q.x, y = q.y, z = q.z, w = q.w,
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v.x;
    out[13] = v.y;
    out[14] = v.z;
    out[15] = 1;
    return this;
};

mat4.fromQuat = function (q) {
    var out = this.val,
        x = q.x, y = q.y, z = q.z, w = q.w,
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;

    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;

    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return this;
};


/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {Matrix4} this for chaining
 */
mat4.frustum = function (left, right, bottom, top, near, far) {
    var out = this.val,
        rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return this;
};


/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {Matrix4} this for chaining
 */
mat4.perspective = function (fovy, aspect, near, far) {
    var out = this.val,
        f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return this;
};

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {Matrix4} this for chaining
 */
mat4.ortho = function (left, right, bottom, top, near, far) {
    var out = this.val,
        lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return this;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {Vector3} eye Position of the viewer
 * @param {Vector3} center Point the viewer is looking at
 * @param {Vector3} up vec3 pointing up
 * @returns {Matrix4} this for chaining
 */
mat4.lookAt = function (eye, center, up) {
    var out = this.val,

        x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye.x,
        eyey = eye.y,
        eyez = eye.z,
        upx = up.x,
        upy = up.y,
        upz = up.z,
        centerx = center.x,
        centery = center.y,
        centerz = center.z;

    if (Math.abs(eyex - centerx) < EPSILON &&
        Math.abs(eyey - centery) < EPSILON &&
        Math.abs(eyez - centerz) < EPSILON) {
        return this.identity();
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return this;
};


mat4.mul = mat4.multiply;

mat4.idt = mat4.identity;

//This is handy for Pool utilities, to "reset" a
//shared object to its default state
mat4.reset = mat4.idt;

mat4.toString = function () {
    var a = this.val;
    return 'Matrix4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

mat4.str = mat4.toString;

module.exports = Matrix4;

},{}],26:[function(require,module,exports){
var Vector3 = require('./Vector3');
var Matrix3 = require('./Matrix3');
var common = require('./common');

//some shared 'private' arrays
var s_iNext = (typeof Int8Array !== 'undefined' ? new Int8Array([1,2,0]) : [1,2,0]);
var tmp = (typeof Float32Array !== 'undefined' ? new Float32Array([0,0,0]) : [0,0,0]);

var xUnitVec3 = new Vector3(1, 0, 0);
var yUnitVec3 = new Vector3(0, 1, 0);
var tmpvec = new Vector3();

var tmpMat3 = new Matrix3();

function Quaternion(x, y, z, w) {
	if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
        this.z = x.z||0;
        this.w = x.w||0;
    } else {
        this.x = x||0;
        this.y = y||0;
        this.z = z||0;
        this.w = w||0;
    }
}

var quat = Quaternion.prototype;

//mixin common functions
for (var k in common) {
    quat[k] = common[k];
}

quat.rotationTo = function(a, b) {
    var dot = a.x * b.x + a.y * b.y + a.z * b.z; //a.dot(b)
    if (dot < -0.999999) {
        if (tmpvec.copy(xUnitVec3).cross(a).len() < 0.000001)
            tmpvec.copy(yUnitVec3).cross(a);
        
        tmpvec.normalize();
        return this.setAxisAngle(tmpvec, Math.PI);
    } else if (dot > 0.999999) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 1;
        return this;
    } else {
        tmpvec.copy(a).cross(b);
        this.x = tmpvec.x;
        this.y = tmpvec.y;
        this.z = tmpvec.z;
        this.w = 1 + dot;
        return this.normalize();
    }
};

quat.setAxes = function(view, right, up) {
    var m = tmpMat3.val;
    m[0] = right.x;
    m[3] = right.y;
    m[6] = right.z;

    m[1] = up.x;
    m[4] = up.y;
    m[7] = up.z;

    m[2] = -view.x;
    m[5] = -view.y;
    m[8] = -view.z;

    return this.fromMat3(tmpMat3).normalize();
};

quat.identity = function() {
    this.x = this.y = this.z = 0;
    this.w = 1;
    return this;
};

quat.setAxisAngle = function(axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    this.x = s * axis.x;
    this.y = s * axis.y;
    this.z = s * axis.z;
    this.w = Math.cos(rad);
    return this;
};

quat.multiply = function(b) {
    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        bx = b.x, by = b.y, bz = b.z, bw = b.w;

    this.x = ax * bw + aw * bx + ay * bz - az * by;
    this.y = ay * bw + aw * by + az * bx - ax * bz;
    this.z = az * bw + aw * bz + ax * by - ay * bx;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
};

quat.slerp = function (b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = this.x, ay = this.y, az = this.y, aw = this.y,
        bx = b.x, by = b.y, bz = b.z, bw = b.w;

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {        
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    this.x = scale0 * ax + scale1 * bx;
    this.y = scale0 * ay + scale1 * by;
    this.z = scale0 * az + scale1 * bz;
    this.w = scale0 * aw + scale1 * bw;
    return this;
};

quat.invert = function() {
    var a0 = this.x, a1 = this.y, a2 = this.z, a3 = this.w,
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;
    
    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    this.x = -a0*invDot;
    this.y = -a1*invDot;
    this.z = -a2*invDot;
    this.w = a3*invDot;
    return this;
};

quat.conjugate = function() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
};

quat.rotateX = function (rad) {
    rad *= 0.5; 

    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        bx = Math.sin(rad), bw = Math.cos(rad);

    this.x = ax * bw + aw * bx;
    this.y = ay * bw + az * bx;
    this.z = az * bw - ay * bx;
    this.w = aw * bw - ax * bx;
    return this;
};

quat.rotateY = function (rad) {
    rad *= 0.5; 

    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        by = Math.sin(rad), bw = Math.cos(rad);

    this.x = ax * bw - az * by;
    this.y = ay * bw + aw * by;
    this.z = az * bw + ax * by;
    this.w = aw * bw - ay * by;
    return this;
};

quat.rotateZ = function (rad) {
    rad *= 0.5; 

    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        bz = Math.sin(rad), bw = Math.cos(rad);

    this.x = ax * bw + ay * bz;
    this.y = ay * bw - ax * bz;
    this.z = az * bw + aw * bz;
    this.w = aw * bw - az * bz;
    return this;
};

quat.calculateW = function () {
    var x = this.x, y = this.y, z = this.z;

    this.x = x;
    this.y = y;
    this.z = z;
    this.w = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return this;
};

quat.fromMat3 = function(mat) {
    // benchmarks:
    //    http://jsperf.com/typed-array-access-speed
    //    http://jsperf.com/conversion-of-3x3-matrix-to-quaternion

    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var m = mat.val,
        fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        this.w = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        this.x = (m[7]-m[5])*fRoot;
        this.y = (m[2]-m[6])*fRoot;
        this.z = (m[3]-m[1])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = s_iNext[i];
        var k = s_iNext[j];
            
        //This isn't quite as clean without array access...
        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        tmp[i] = 0.5 * fRoot;

        fRoot = 0.5 / fRoot;
        tmp[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        tmp[k] = (m[k*3+i] + m[i*3+k]) * fRoot;

        this.x = tmp[0];
        this.y = tmp[1];
        this.z = tmp[2];
        this.w = (m[k*3+j] - m[j*3+k]) * fRoot;
    }
    
    return this;
};

quat.idt = quat.identity;

quat.sub = quat.subtract;

quat.mul = quat.multiply;

quat.len = quat.length;

quat.lenSq = quat.lengthSq;

//This is handy for Pool utilities, to "reset" a
//shared object to its default state
quat.reset = quat.idt;


quat.toString = function() {
    return 'Quaternion(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
};

quat.str = quat.toString;

module.exports = Quaternion;
},{"./Matrix3":24,"./Vector3":28,"./common":30}],27:[function(require,module,exports){
function Vector2(x, y) {
	if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
    } else {
        this.x = x||0;
        this.y = y||0;
    }
}

//shorthand it for better minification
var vec2 = Vector2.prototype;

/**
 * Returns a new instance of Vector2 with
 * this vector's components. 
 * @return {Vector2} a clone of this vector
 */
vec2.clone = function() {
    return new Vector2(this.x, this.y);
};

/**
 * Copies the x, y components from the specified
 * Vector. Any undefined components from `otherVec`
 * will default to zero.
 * 
 * @param  {otherVec} the other Vector2 to copy
 * @return {Vector2}  this, for chaining
 */
vec2.copy = function(otherVec) {
    this.x = otherVec.x||0;
    this.y = otherVec.y||0;
    return this;
};

/**
 * A convenience function to set the components of
 * this vector as x and y. Falsy or undefined
 * parameters will default to zero.
 *
 * You can also pass a vector object instead of
 * individual components, to copy the object's components.
 * 
 * @param {Number} x the x component
 * @param {Number} y the y component
 * @return {Vector2}  this, for chaining
 */
vec2.set = function(x, y) {
    if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
    } else {
        this.x = x||0;
        this.y = y||0;
    }
    return this;
};

vec2.add = function(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

vec2.subtract = function(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

vec2.multiply = function(v) {
    this.x *= v.x;
    this.y *= v.y;
    return this;
};

vec2.scale = function(s) {
    this.x *= s;
    this.y *= s;
    return this;
};

vec2.divide = function(v) {
    this.x /= v.x;
    this.y /= v.y;
    return this;
};

vec2.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    return this;
};

vec2.distance = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y;
    return Math.sqrt(dx*dx + dy*dy);
};

vec2.distanceSq = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y;
    return dx*dx + dy*dy;
};

vec2.length = function() {
    var x = this.x,
        y = this.y;
    return Math.sqrt(x*x + y*y);
};

vec2.lengthSq = function() {
    var x = this.x,
        y = this.y;
    return x*x + y*y;
};

vec2.normalize = function() {
    var x = this.x,
        y = this.y;
    var len = x*x + y*y;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        this.x = x*len;
        this.y = y*len;
    }
    return this;
};

vec2.dot = function(v) {
    return this.x * v.x + this.y * v.y;
};

//Unlike Vector3, this returns a scalar
//http://allenchou.net/2013/07/cross-product-of-2d-vectors/
vec2.cross = function(v) {
    return this.x * v.y - this.y * v.x;
};

vec2.lerp = function(v, t) {
    var ax = this.x,
        ay = this.y;
    t = t||0;
    this.x = ax + t * (v.x - ax);
    this.y = ay + t * (v.y - ay);
    return this;
};

vec2.transformMat3 = function(mat) {
    var x = this.x, y = this.y, m = mat.val;
    this.x = m[0] * x + m[2] * y + m[4];
    this.y = m[1] * x + m[3] * y + m[5];
    return this;
};

vec2.transformMat4 = function(mat) {
    var x = this.x, 
        y = this.y,
        m = mat.val;
    this.x = m[0] * x + m[4] * y + m[12];
    this.y = m[1] * x + m[5] * y + m[13];
    return this;
};

vec2.reset = function() {
    this.x = 0;
    this.y = 0;
    return this;
};

vec2.sub = vec2.subtract;

vec2.mul = vec2.multiply;

vec2.div = vec2.divide;

vec2.dist = vec2.distance;

vec2.distSq = vec2.distanceSq;

vec2.len = vec2.length;

vec2.lenSq = vec2.lengthSq;

vec2.toString = function() {
    return 'Vector2(' + this.x + ', ' + this.y + ')';
};

vec2.random = function(scale) {
    scale = scale || 1.0;
    var r = Math.random() * 2.0 * Math.PI;
    this.x = Math.cos(r) * scale;
    this.y = Math.sin(r) * scale;
    return this;
};

vec2.str = vec2.toString;

module.exports = Vector2;
},{}],28:[function(require,module,exports){
function Vector3(x, y, z) {
    if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
        this.z = x.z||0;
    } else {
        this.x = x||0;
        this.y = y||0;
        this.z = z||0;
    }
}

//shorthand it for better minification
var vec3 = Vector3.prototype;

vec3.clone = function() {
    return new Vector3(this.x, this.y, this.z);
};

vec3.copy = function(otherVec) {
    this.x = otherVec.x;
    this.y = otherVec.y;
    this.z = otherVec.z;
    return this;
};

vec3.set = function(x, y, z) {
    if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
        this.z = x.z||0;
    } else {
        this.x = x||0;
        this.y = y||0;
        this.z = z||0;
    }
    return this;
};

vec3.add = function(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
};

vec3.subtract = function(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
};

vec3.multiply = function(v) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
};

vec3.scale = function(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
};

vec3.divide = function(v) {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
};

vec3.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
};

vec3.distance = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y,
        dz = v.z - this.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
};

vec3.distanceSq = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y,
        dz = v.z - this.z;
    return dx*dx + dy*dy + dz*dz;
};

vec3.length = function() {
    var x = this.x,
        y = this.y,
        z = this.z;
    return Math.sqrt(x*x + y*y + z*z);
};

vec3.lengthSq = function() {
    var x = this.x,
        y = this.y,
        z = this.z;
    return x*x + y*y + z*z;
};

vec3.normalize = function() {
    var x = this.x,
        y = this.y,
        z = this.z;
    var len = x*x + y*y + z*z;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        this.x = x*len;
        this.y = y*len;
        this.z = z*len;
    }
    return this;
};

vec3.dot = function(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
};

vec3.cross = function(v) {
    var ax = this.x, ay = this.y, az = this.z,
        bx = v.x, by = v.y, bz = v.z;

    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
};

vec3.lerp = function(v, t) {
    var ax = this.x,
        ay = this.y,
        az = this.z;
    t = t||0;
    this.x = ax + t * (v.x - ax);
    this.y = ay + t * (v.y - ay);
    this.z = az + t * (v.z - az);
    return this;
};

vec3.transformMat4 = function(mat) {
    var x = this.x, y = this.y, z = this.z, m = mat.val;
    this.x = m[0] * x + m[4] * y + m[8] * z + m[12];
    this.y = m[1] * x + m[5] * y + m[9] * z + m[13];
    this.z = m[2] * x + m[6] * y + m[10] * z + m[14];
    return this;
};

vec3.transformMat3 = function(mat) {
    var x = this.x, y = this.y, z = this.z, m = mat.val;
    this.x = x * m[0] + y * m[3] + z * m[6];
    this.y = x * m[1] + y * m[4] + z * m[7];
    this.z = x * m[2] + y * m[5] + z * m[8];
    return this;
};

vec3.transformQuat = function(q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations
    var x = this.x, y = this.y, z = this.z,
        qx = q.x, qy = q.y, qz = q.z, qw = q.w,

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
};

/**
 * Multiplies this Vector3 by the specified matrix, 
 * applying a W divide. This is useful for projection,
 * e.g. unprojecting a 2D point into 3D space.
 *
 * @method  prj
 * @param {Matrix4} the 4x4 matrix to multiply with 
 * @return {Vector3} this object for chaining
 */
vec3.project = function(mat) {
    var x = this.x,
        y = this.y,
        z = this.z,
        m = mat.val,
        a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3],
        a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
        a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11],
        a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    var l_w = 1 / (x * a03 + y * a13 + z * a23 + a33);

    this.x = (x * a00 + y * a10 + z * a20 + a30) * l_w; 
    this.y = (x * a01 + y * a11 + z * a21 + a31) * l_w; 
    this.z = (x * a02 + y * a12 + z * a22 + a32) * l_w;
    return this;
};

/**
 * Unproject this point from 2D space to 3D space.
 * The point should have its x and y properties set to
 * 2D screen space, and the z either at 0 (near plane)
 * or 1 (far plane). The provided matrix is assumed to already
 * be combined, i.e. projection * view * model.
 *
 * After this operation, this vector's (x, y, z) components will
 * represent the unprojected 3D coordinate.
 * 
 * @param  {Vector4} viewport          screen x, y, width and height in pixels
 * @param  {Matrix4} invProjectionView combined projection and view matrix
 * @return {Vector3}                   this object, for chaining
 */
vec3.unproject = function(viewport, invProjectionView) {
    var viewX = viewport.x,
        viewY = viewport.y,
        viewWidth = viewport.z,
        viewHeight = viewport.w;
    
    var x = this.x, 
        y = this.y,
        z = this.z;

    x = x - viewX;
    y = viewHeight - y - 1;
    y = y - viewY;

    this.x = (2 * x) / viewWidth - 1;
    this.y = (2 * y) / viewHeight - 1;
    this.z = 2 * z - 1;

    return this.project(invProjectionView);
};

vec3.random = function(scale) {
    scale = scale || 1.0;

    var r = Math.random() * 2.0 * Math.PI;
    var z = (Math.random() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;
    
    this.x = Math.cos(r) * zScale;
    this.y = Math.sin(r) * zScale;
    this.z = z * scale;
    return this;
};

vec3.reset = function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};


vec3.sub = vec3.subtract;

vec3.mul = vec3.multiply;

vec3.div = vec3.divide;

vec3.dist = vec3.distance;

vec3.distSq = vec3.distanceSq;

vec3.len = vec3.length;

vec3.lenSq = vec3.lengthSq;

vec3.toString = function() {
    return 'Vector3(' + this.x + ', ' + this.y + ', ' + this.z + ')';
};

vec3.str = vec3.toString;

module.exports = Vector3;
},{}],29:[function(require,module,exports){
var common = require('./common');

function Vector4(x, y, z, w) {
	if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
        this.z = x.z||0;
        this.w = x.w||0;
    } else {
        this.x = x||0;
        this.y = y||0;
        this.z = z||0;
        this.w = w||0;
    }
}

//shorthand it for better minification
var vec4 = Vector4.prototype;

//mixin common functions
for (var k in common) {
    vec4[k] = common[k];
}

vec4.clone = function() {
    return new Vector4(this.x, this.y, this.z, this.w);
};

vec4.multiply = function(v) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    this.w *= v.w;
    return this;
};

vec4.divide = function(v) {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    this.w /= v.w;
    return this;
};

vec4.distance = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y,
        dz = v.z - this.z,
        dw = v.w - this.w;
    return Math.sqrt(dx*dx + dy*dy + dz*dz + dw*dw);
};

vec4.distanceSq = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y,
        dz = v.z - this.z,
        dw = v.w - this.w;
    return dx*dx + dy*dy + dz*dz + dw*dw;
};

vec4.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    this.w = -this.w;
    return this;
};

vec4.transformMat4 = function(mat) {
    var m = mat.val, x = this.x, y = this.y, z = this.z, w = this.w;
    this.x = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    this.y = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    this.z = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    this.w = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return this;
};

//// TODO: is this really the same as Vector3 ??
///  Also, what about this:
///  http://molecularmusings.wordpress.com/2013/05/24/a-faster-quaternion-vector-multiplication/
vec4.transformQuat = function(q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations
    var x = this.x, y = this.y, z = this.z,
        qx = q.x, qy = q.y, qz = q.z, qw = q.w,

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
};

vec4.random = function(scale) {
    scale = scale || 1.0;

    //Not spherical; should fix this for more uniform distribution
    this.x = (Math.random() * 2 - 1) * scale;
    this.y = (Math.random() * 2 - 1) * scale;
    this.z = (Math.random() * 2 - 1) * scale;
    this.w = (Math.random() * 2 - 1) * scale;
    return this;
};

vec4.reset = function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 0;
    return this;
};

vec4.sub = vec4.subtract;

vec4.mul = vec4.multiply;

vec4.div = vec4.divide;

vec4.dist = vec4.distance;

vec4.distSq = vec4.distanceSq;

vec4.len = vec4.length;

vec4.lenSq = vec4.lengthSq;

vec4.toString = function() {
    return 'Vector4(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
};

vec4.str = vec4.toString;

module.exports = Vector4;
},{"./common":30}],30:[function(require,module,exports){
//common vec4 functions
module.exports = {
    
/**
 * Copies the x, y, z, w components from the specified
 * Vector. Unlike most other operations, this function
 * will default undefined components on `otherVec` to zero.
 * 
 * @method  copy
 * @param  {otherVec} the other Vector4 to copy
 * @return {Vector}  this, for chaining
 */


/**
 * A convenience function to set the components of
 * this vector as x, y, z, w. Falsy or undefined
 * parameters will default to zero.
 *
 * You can also pass a vector object instead of
 * individual components, to copy the object's components.
 * 
 * @method  set
 * @param {Number} x the x component
 * @param {Number} y the y component
 * @param {Number} z the z component
 * @param {Number} w the w component
 * @return {Vector2}  this, for chaining
 */

/**
 * Adds the components of the other Vector4 to
 * this vector.
 * 
 * @method add
 * @param  {Vector4} otherVec other vector, right operand
 * @return {Vector2}  this, for chaining
 */

/**
 * Subtracts the components of the other Vector4
 * from this vector. Aliased as `sub()`
 * 
 * @method  subtract
 * @param  {Vector4} otherVec other vector, right operand
 * @return {Vector2}  this, for chaining
 */

/**
 * Multiplies the components of this Vector4
 * by a scalar amount.
 *
 * @method  scale
 * @param {Number} s the scale to multiply by
 * @return {Vector4} this, for chaining
 */

/**
 * Returns the magnitude (length) of this vector.
 *
 * Aliased as `len()`
 * 
 * @method  length
 * @return {Number} the length of this vector
 */

/**
 * Returns the squared magnitude (length) of this vector.
 *
 * Aliased as `lenSq()`
 * 
 * @method  lengthSq
 * @return {Number} the squared length of this vector
 */

/**
 * Normalizes this vector to a unit vector.
 * @method normalize
 * @return {Vector4}  this, for chaining
 */

/**
 * Returns the dot product of this vector
 * and the specified Vector4.
 * 
 * @method dot
 * @return {Number} the dot product
 */
    copy: function(otherVec) {
        this.x = otherVec.x||0;
        this.y = otherVec.y||0;
        this.z = otherVec.z||0;
        this.w = otherVec.w||0;
        return this;
    },

    set: function(x, y, z, w) {
        if (typeof x === "object") {
            this.x = x.x||0;
            this.y = x.y||0;
            this.z = x.z||0;
            this.w = x.w||0;
        } else {
            this.x = x||0;
            this.y = y||0;
            this.z = z||0;
            this.w = w||0;

        }
        return this;
    },

    add: function(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
        return this;
    },

    subtract: function(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
        return this;
    },

    scale: function(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
        return this;
    },


    length: function() {
        var x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;
        return Math.sqrt(x*x + y*y + z*z + w*w);
    },

    lengthSq: function() {
        var x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;
        return x*x + y*y + z*z + w*w;
    },

    normalize: function() {
        var x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;
        var len = x*x + y*y + z*z + w*w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.x = x*len;
            this.y = y*len;
            this.z = z*len;
            this.w = w*len;
        }
        return this;
    },

    dot: function(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    },

    lerp: function(v, t) {
        var ax = this.x,
            ay = this.y,
            az = this.z,
            aw = this.w;
        t = t||0;
        this.x = ax + t * (v.x - ax);
        this.y = ay + t * (v.y - ay);
        this.z = az + t * (v.z - az);
        this.w = aw + t * (v.w - aw);
        return this;
    }
};
},{}],31:[function(require,module,exports){
module.exports = {
    Vector2: require('./Vector2'),
    Vector3: require('./Vector3'),
    Vector4: require('./Vector4'),
    Matrix3: require('./Matrix3'),
    Matrix4: require('./Matrix4'),
    Quaternion: require('./Quaternion')
};
},{"./Matrix3":24,"./Matrix4":25,"./Quaternion":26,"./Vector2":27,"./Vector3":28,"./Vector4":29}],32:[function(require,module,exports){
/**
 * The core kami module provides basic 2D sprite batching and 
 * asset management.
 * 
 * @module kami
 */

var Class = require('klasse');
var Mesh = require('./glutils/Mesh');

var colorToFloat = require('number-util').colorToFloat;

/** 
 * A batcher mixin composed of quads (two tris, indexed). 
 *
 * This is used internally; users should look at 
 * {{#crossLink "SpriteBatch"}}{{/crossLink}} instead, which inherits from this
 * class.
 * 
 * The batcher itself is not managed by WebGLContext; however, it makes
 * use of Mesh and Texture which will be managed. For this reason, the batcher
 * does not hold a direct reference to the GL state.
 *
 * Subclasses must implement the following:  
 * {{#crossLink "BaseBatch/_createShader:method"}}{{/crossLink}}  
 * {{#crossLink "BaseBatch/_createVertexAttributes:method"}}{{/crossLink}}  
 * {{#crossLink "BaseBatch/getVertexSize:method"}}{{/crossLink}}  
 * 
 * @class  BaseBatch
 * @constructor
 * @param {WebGLContext} context the context this batcher belongs to
 * @param {Number} size the optional size of this batch, i.e. max number of quads
 * @default  500
 */
var BaseBatch = new Class({

	//Constructor
	initialize: function BaseBatch(context, size) {
		if (typeof context !== "object")
			throw "GL context not specified to SpriteBatch";
		this.context = context;

		this.size = size || 500;
		
		// 65535 is max index, so 65535 / 6 = 10922.
		if (this.size > 10922)  //(you'd have to be insane to try and batch this much with WebGL)
			throw "Can't have more than 10922 sprites per batch: " + this.size;
				
		
		
		this._blendSrc = this.context.gl.ONE;
		this._blendDst = this.context.gl.ONE_MINUS_SRC_ALPHA
		this._blendingEnabled = true;
		this._shader = this._createShader();

		/**
		 * This shader will be used whenever "null" is passed
		 * as the batch's shader. 
		 *
		 * @property {ShaderProgram} shader
		 */
		this.defaultShader = this._shader;

		/**
		 * By default, a SpriteBatch is created with its own ShaderProgram,
		 * stored in `defaultShader`. If this flag is true, on deleting the SpriteBatch, its
		 * `defaultShader` will also be deleted. If this flag is false, no shaders
		 * will be deleted on destroy.
		 *
		 * Note that if you re-assign `defaultShader`, you will need to dispose the previous
		 * default shader yoursel. 
		 *
		 * @property ownsShader
		 * @type {Boolean}
		 */
		this.ownsShader = true;

		this.idx = 0;

		/**
		 * Whether we are currently drawing to the batch. Do not modify.
		 * 
		 * @property {Boolean} drawing
		 */
		this.drawing = false;

		this.mesh = this._createMesh(this.size);


		/**
		 * The ABGR packed color, as a single float. The default
		 * value is the color white (255, 255, 255, 255).
		 *
		 * @property {Number} color
		 * @readOnly 
		 */
		this.color = colorToFloat(255, 255, 255, 255);
		
		/**
		 * Whether to premultiply alpha on calls to setColor. 
		 * This is true by default, so that we can conveniently write:
		 *
		 *     batch.setColor(1, 0, 0, 0.25); //tints red with 25% opacity
		 *
		 * If false, you must premultiply the colors yourself to achieve
		 * the same tint, like so:
		 *
		 *     batch.setColor(0.25, 0, 0, 0.25);
		 * 
		 * @property premultiplied
		 * @type {Boolean}
		 * @default  true
		 */
		this.premultiplied = true;
	},

	/**
	 * A property to enable or disable blending for this sprite batch. If
	 * we are currently drawing, this will first flush the batch, and then
	 * update GL_BLEND state (enabled or disabled) with our new value.
	 * 
	 * @property {Boolean} blendingEnabled
	 */
	blendingEnabled: {
		set: function(val) {
			var old = this._blendingEnabled;
			if (this.drawing)
				this.flush();

			this._blendingEnabled = val;

			//if we have a new value, update it.
			//this is because blend is done in begin() / end() 
			if (this.drawing && old != val) {
				var gl = this.context.gl;
				if (val)
					gl.enable(gl.BLEND);
				else
					gl.disable(gl.BLEND);
			}

		},

		get: function() {
			return this._blendingEnabled;
		}
	},

	/**
	 * Sets the blend source parameters. 
	 * If we are currently drawing, this will flush the batch.
	 *
	 * Setting either src or dst to `null` or a falsy value tells the SpriteBatch
	 * to ignore gl.blendFunc. This is useful if you wish to use your
	 * own blendFunc or blendFuncSeparate. 
	 * 
	 * @property {GLenum} blendDst 
	 */
	blendSrc: {
		set: function(val) {
			if (this.drawing)
				this.flush();
			this._blendSrc = val;
		},

		get: function() {
			return this._blendSrc;
		}
	},

	/**
	 * Sets the blend destination parameters. 
	 * If we are currently drawing, this will flush the batch.
	 *
	 * Setting either src or dst to `null` or a falsy value tells the SpriteBatch
	 * to ignore gl.blendFunc. This is useful if you wish to use your
	 * own blendFunc or blendFuncSeparate. 
	 *
	 * @property {GLenum} blendSrc 
	 */
	blendDst: {
		set: function(val) {
			if (this.drawing)
				this.flush();
			this._blendDst = val;
		},

		get: function() {
			return this._blendDst;
		}
	},

	/**
	 * Sets the blend source and destination parameters. This is 
	 * a convenience function for the blendSrc and blendDst setters.
	 * If we are currently drawing, this will flush the batch.
	 *
	 * Setting either to `null` or a falsy value tells the SpriteBatch
	 * to ignore gl.blendFunc. This is useful if you wish to use your
	 * own blendFunc or blendFuncSeparate. 
	 *
	 * @method  setBlendFunction
	 * @param {GLenum} blendSrc the source blend parameter
	 * @param {GLenum} blendDst the destination blend parameter
	 */
	setBlendFunction: function(blendSrc, blendDst) {
		this.blendSrc = blendSrc;
		this.blendDst = blendDst;
	},

	/**
	 * This is a setter/getter for this batch's current ShaderProgram.
	 * If this is set when the batch is drawing, the state will be flushed
	 * to the GPU and the new shader will then be bound.
	 *
	 * If `null` or a falsy value is specified, the batch's `defaultShader` will be used. 
	 *
	 * Note that shaders are bound on batch.begin().
	 *
	 * @property shader
	 * @type {ShaderProgram}
	 */
	shader: {
		set: function(val) {
			var wasDrawing = this.drawing;

			if (wasDrawing) {
				this.end(); //unbinds the shader from the mesh
			}

			this._shader = val ? val : this.defaultShader;

			if (wasDrawing) {
				this.begin();
			}
		},

		get: function() {
			return this._shader;
		}
	},

	/**
	 * Sets the color of this sprite batcher, which is used in subsequent draw
	 * calls. This does not flush the batch.
	 *
	 * If r, g, b, are all numbers, this method assumes that RGB 
	 * or RGBA float values (0.0 to 1.0) are being passed. Alpha defaults to one
	 * if undefined.
	 * 
	 * If the first three arguments are not numbers, we only consider the first argument
	 * and assign it to all four components -- this is useful for setting transparency 
	 * in a premultiplied alpha stage. 
	 * 
	 * If the first argument is invalid or not a number,
	 * the color defaults to (1, 1, 1, 1).
	 *
	 * @method  setColor
	 * @param {Number} r the red component, normalized
	 * @param {Number} g the green component, normalized
	 * @param {Number} b the blue component, normalized
	 * @param {Number} a the alpha component, normalized
	 */
	setColor: function(r, g, b, a) {
		var rnum = typeof r === "number";
		if (rnum
				&& typeof g === "number"
				&& typeof b === "number") {
			//default alpha to one 
			a = (a || a === 0) ? a : 1.0;
		} else {
			r = g = b = a = rnum ? r : 1.0;
		}
		
		if (this.premultiplied) {
			r *= a;
			g *= a;
			b *= a;
		}
		
		this.color = colorToFloat(
			~~(r * 255),
			~~(g * 255),
			~~(b * 255),
			~~(a * 255)
		);
	},

	/**
	 * Called from the constructor to create a new Mesh 
	 * based on the expected batch size. Should set up
	 * verts & indices properly.
	 *
	 * Users should not call this directly; instead, it
	 * should only be implemented by subclasses.
	 * 
	 * @method _createMesh
	 * @param {Number} size the size passed through the constructor
	 */
	_createMesh: function(size) {
		//the total number of floats in our batch
		var numVerts = size * 4 * this.getVertexSize();
		//the total number of indices in our batch
		var numIndices = size * 6;
		var gl = this.context.gl;

		//vertex data
		this.vertices = new Float32Array(numVerts);
		//index data
		this.indices = new Uint16Array(numIndices); 
		
		for (var i=0, j=0; i < numIndices; i += 6, j += 4) 
		{
			this.indices[i + 0] = j + 0; 
			this.indices[i + 1] = j + 1;
			this.indices[i + 2] = j + 2;
			this.indices[i + 3] = j + 0;
			this.indices[i + 4] = j + 2;
			this.indices[i + 5] = j + 3;
		}

		var mesh = new Mesh(this.context, false, 
						numVerts, numIndices, this._createVertexAttributes());
		mesh.vertices = this.vertices;
		mesh.indices = this.indices;
		mesh.vertexUsage = gl.DYNAMIC_DRAW;
		mesh.indexUsage = gl.STATIC_DRAW;
		mesh.dirty = true;
		return mesh;
	},

	/**
	 * Returns a shader for this batch. If you plan to support
	 * multiple instances of your batch, it may or may not be wise
	 * to use a shared shader to save resources.
	 * 
	 * This method initially throws an error; so it must be overridden by
	 * subclasses of BaseBatch.
	 *
	 * @method  _createShader
	 * @return {Number} the size of a vertex, in # of floats
	 */
	_createShader: function() {
		throw "_createShader not implemented"
	},	

	/**
	 * Returns an array of vertex attributes for this mesh; 
	 * subclasses should implement this with the attributes 
	 * expected for their batch.
	 *
	 * This method initially throws an error; so it must be overridden by
	 * subclasses of BaseBatch.
	 *
	 * @method _createVertexAttributes
	 * @return {Array} an array of Mesh.VertexAttrib objects
	 */
	_createVertexAttributes: function() {
		throw "_createVertexAttributes not implemented";
	},


	/**
	 * Returns the number of floats per vertex for this batcher.
	 * 
	 * This method initially throws an error; so it must be overridden by
	 * subclasses of BaseBatch.
	 *
	 * @method  getVertexSize
	 * @return {Number} the size of a vertex, in # of floats
	 */
	getVertexSize: function() {
		throw "getVertexSize not implemented";
	},

	
	/** 
	 * Begins the sprite batch. This will bind the shader
	 * and mesh. Subclasses may want to disable depth or 
	 * set up blending.
	 *
	 * @method  begin
	 */
	begin: function()  {
		if (this.drawing) 
			throw "batch.end() must be called before begin";
		this.drawing = true;

		this.shader.bind();

		//bind the attributes now to avoid redundant calls
		this.mesh.bind(this.shader);

		if (this._blendingEnabled) {
			var gl = this.context.gl;
			gl.enable(gl.BLEND);
		}
	},

	/** 
	 * Ends the sprite batch. This will flush any remaining 
	 * data and set GL state back to normal.
	 * 
	 * @method  end
	 */
	end: function()  {
		if (!this.drawing)
			throw "batch.begin() must be called before end";
		if (this.idx > 0)
			this.flush();
		this.drawing = false;

		this.mesh.unbind(this.shader);

		if (this._blendingEnabled) {
			var gl = this.context.gl;
			gl.disable(gl.BLEND);
		}
	},

	/** 
	 * Called before rendering to bind new textures.
	 * This method does nothing by default.
	 *
	 * @method  _preRender
	 */
	_preRender: function()  {
	},

	/**
	 * Flushes the batch by pushing the current data
	 * to GL.
	 * 
	 * @method flush
	 */
	flush: function()  {
		if (this.idx===0)
			return;

		var gl = this.context.gl;

		//premultiplied alpha
		if (this._blendingEnabled) {
			//set either to null if you want to call your own 
			//blendFunc or blendFuncSeparate
			if (this._blendSrc && this._blendDst)
				gl.blendFunc(this._blendSrc, this._blendDst); 
		}

		this._preRender();

		//number of sprites in batch
		var numComponents = this.getVertexSize();
		var spriteCount = (this.idx / (numComponents * 4));
		
		//draw the sprites
		this.mesh.verticesDirty = true;
		this.mesh.draw(gl.TRIANGLES, spriteCount * 6, 0, this.idx);

		this.idx = 0;
	},

	/**
	 * Adds a sprite to this batch.
	 * The specifics depend on the sprite batch implementation.
	 *
	 * @method draw
	 * @param  {Texture} texture the texture for this sprite
	 * @param  {Number} x       the x position, defaults to zero
	 * @param  {Number} y       the y position, defaults to zero
	 * @param  {Number} width   the width, defaults to the texture width
	 * @param  {Number} height  the height, defaults to the texture height
	 * @param  {Number} u1      the first U coordinate, default zero
	 * @param  {Number} v1      the first V coordinate, default zero
	 * @param  {Number} u2      the second U coordinate, default one
	 * @param  {Number} v2      the second V coordinate, default one
	 */
	draw: function(texture, x, y, width, height, u1, v1, u2, v2) {
	},

	/**
	 * Adds a single quad mesh to this sprite batch from the given
	 * array of vertices.
	 * The specifics depend on the sprite batch implementation.
	 *
	 * @method  drawVertices
	 * @param {Texture} texture the texture we are drawing for this sprite
	 * @param {Float32Array} verts an array of vertices
	 * @param {Number} off the offset into the vertices array to read from
	 */
	drawVertices: function(texture, verts, off)  {
	},

	drawRegion: function(region, x, y, width, height) {
		this.draw(region.texture, x, y, width, height, region.u, region.v, region.u2, region.v2);
	},

	/**
	 * Destroys the batch, deleting its buffers and removing it from the
	 * WebGLContext management. Trying to use this
	 * batch after destroying it can lead to unpredictable behaviour.
	 *
	 * If `ownsShader` is true, this will also delete the `defaultShader` object.
	 * 
	 * @method destroy
	 */
	destroy: function() {
		this.vertices = null;
		this.indices = null;
		this.size = this.maxVertices = 0;

		if (this.ownsShader && this.defaultShader)
			this.defaultShader.destroy();
		this.defaultShader = null;
		this._shader = null; // remove reference to whatever shader is currently being used

		if (this.mesh) 
			this.mesh.destroy();
		this.mesh = null;
	}
});

module.exports = BaseBatch;

},{"./glutils/Mesh":38,"klasse":41,"number-util":42}],33:[function(require,module,exports){
/**
 * @module kami
 */

// Requires....
var Class         = require('klasse');

var BaseBatch = require('./BaseBatch');

var Mesh          = require('./glutils/Mesh');
var ShaderProgram = require('./glutils/ShaderProgram');

/**
 * A basic implementation of a batcher which draws 2D sprites.
 * This uses two triangles (quads) with indexed and interleaved
 * vertex data. Each vertex holds 5 floats (Position.xy, Color, TexCoord0.xy).
 *
 * The color is packed into a single float to reduce vertex bandwidth, and
 * the data is interleaved for best performance. We use a static index buffer,
 * and a dynamic vertex buffer that is updated with bufferSubData. 
 * 
 * @example
 *      var SpriteBatch = require('kami').SpriteBatch;  
 *      
 *      //create a new batcher
 *      var batch = new SpriteBatch(context);
 *
 *      function render() {
 *          batch.begin();
 *          
 *          //draw some sprites in between begin and end...
 *          batch.draw( texture, 0, 0, 25, 32 );
 *          batch.draw( texture1, 0, 25, 42, 23 );
 * 
 *          batch.end();
 *      }
 * 
 * @class  SpriteBatch
 * @uses BaseBatch
 * @constructor
 * @param {WebGLContext} context the context for this batch
 * @param {Number} size the max number of sprites to fit in a single batch
 */
var SpriteBatch = new Class({

	//inherit some stuff onto this prototype
	Mixins: BaseBatch,

	//Constructor
	initialize: function SpriteBatch(context, size) {
		BaseBatch.call(this, context, size);

		/**
		 * The projection Float32Array vec2 which is
		 * used to avoid some matrix calculations.
		 *
		 * @property projection
		 * @type {Float32Array}
		 */
		this.projection = new Float32Array(2);

		//Sets up a default projection vector so that the batch works without setProjection
		this.projection[0] = this.context.width/2;
		this.projection[1] = this.context.height/2;

		/**
		 * The currently bound texture. Do not modify.
		 * 
		 * @property {Texture} texture
		 * @readOnly
		 */
		this.texture = null;
	},

	/**
	 * This is a convenience function to set the batch's projection
	 * matrix to an orthographic 2D projection, based on the given screen
	 * size. This allows users to render in 2D without any need for a camera.
	 * 
	 * @param  {[type]} width  [description]
	 * @param  {[type]} height [description]
	 * @return {[type]}        [description]
	 */
	resize: function(width, height) {
		this.setProjection(width/2, height/2);
	},

	/**
	 * The number of floats per vertex for this batcher 
	 * (Position.xy + Color + TexCoord0.xy).
	 *
	 * @method  getVertexSize
	 * @return {Number} the number of floats per vertex
	 */
	getVertexSize: function() {
		return SpriteBatch.VERTEX_SIZE;
	},

	/**
	 * Used internally to return the Position, Color, and TexCoord0 attributes.
	 *
	 * @method  _createVertexAttribuets
	 * @protected
	 * @return {[type]} [description]
	 */
	_createVertexAttributes: function() {
		var gl = this.context.gl;

		return [ 
			new Mesh.Attrib(ShaderProgram.POSITION_ATTRIBUTE, 2),
			 //pack the color using some crazy wizardry 
			new Mesh.Attrib(ShaderProgram.COLOR_ATTRIBUTE, 4, null, gl.UNSIGNED_BYTE, true, 1),
			new Mesh.Attrib(ShaderProgram.TEXCOORD_ATTRIBUTE+"0", 2)
		];
	},


	/**
	 * Sets the projection vector, an x and y
	 * defining the middle points of your stage.
	 *
	 * @method setProjection
	 * @param {Number} x the x projection value
	 * @param {Number} y the y projection value
	 */
	setProjection: function(x, y) {
		var oldX = this.projection[0];
		var oldY = this.projection[1];
		this.projection[0] = x;
		this.projection[1] = y;

		//we need to flush the batch..
		if (this.drawing && (x != oldX || y != oldY)) {
			this.flush();
			this._updateMatrices();
		}
	},

	/**
	 * Creates a default shader for this batch.
	 *
	 * @method  _createShader
	 * @protected
	 * @return {ShaderProgram} a new instance of ShaderProgram
	 */
	_createShader: function() {
		var shader = new ShaderProgram(this.context,
				SpriteBatch.DEFAULT_VERT_SHADER, 
				SpriteBatch.DEFAULT_FRAG_SHADER);
		if (shader.log)
			console.warn("Shader Log:\n" + shader.log);
		return shader;
	},

	/**
	 * This is called during rendering to update projection/transform
	 * matrices and upload the new values to the shader. For example,
	 * if the user calls setProjection mid-draw, the batch will flush
	 * and this will be called before continuing to add items to the batch.
	 *
	 * You generally should not need to call this directly.
	 * 
	 * @method  updateMatrices
	 * @protected
	 */
	updateMatrices: function() {
		this.shader.setUniformfv("u_projection", this.projection);
	},

	/**
	 * Called before rendering, and binds the current texture.
	 * 
	 * @method _preRender
	 * @protected
	 */
	_preRender: function() {
		if (this.texture)
			this.texture.bind();
	},

	/**
	 * Binds the shader, disables depth writing, 
	 * enables blending, activates texture unit 0, and sends
	 * default matrices and sampler2D uniforms to the shader.
	 *
	 * @method  begin
	 */
	begin: function() {
		//sprite batch doesn't hold a reference to GL since it is volatile
		var gl = this.context.gl;
		
		//This binds the shader and mesh!
		BaseBatch.prototype.begin.call(this);

		this.updateMatrices(); //send projection/transform to shader

		//upload the sampler uniform. not necessary every flush so we just
		//do it here.
		this.shader.setUniformi("u_texture0", 0);

		//disable depth mask
		gl.depthMask(false);
	},

	/**
	 * Ends the sprite batcher and flushes any remaining data to the GPU.
	 * 
	 * @method end
	 */
	end: function() {
		//sprite batch doesn't hold a reference to GL since it is volatile
		var gl = this.context.gl;
		
		//just do direct parent call for speed here
		//This binds the shader and mesh!
		BaseBatch.prototype.end.call(this);

		gl.depthMask(true);
	},

	/**
	 * Flushes the batch to the GPU. This should be called when
	 * state changes, such as blend functions, depth or stencil states,
	 * shaders, and so forth.
	 * 
	 * @method flush
	 */
	flush: function() {
		//ignore flush if texture is null or our batch is empty
		if (!this.texture)
			return;
		if (this.idx === 0)
			return;
		BaseBatch.prototype.flush.call(this);
		SpriteBatch.totalRenderCalls++;
	},

	/**
	 * Adds a sprite to this batch. The sprite is drawn in 
	 * screen-space with the origin at the upper-left corner (y-down).
	 * 
	 * @method draw
	 * @param  {Texture} texture the Texture
	 * @param  {Number} x       the x position in pixels, defaults to zero
	 * @param  {Number} y       the y position in pixels, defaults to zero
	 * @param  {Number} width   the width in pixels, defaults to the texture width
	 * @param  {Number} height  the height in pixels, defaults to the texture height
	 * @param  {Number} u1      the first U coordinate, default zero
	 * @param  {Number} v1      the first V coordinate, default zero
	 * @param  {Number} u2      the second U coordinate, default one
	 * @param  {Number} v2      the second V coordinate, default one
	 */
	draw: function(texture, x, y, width, height, u1, v1, u2, v2) {
		if (!this.drawing)
			throw "Illegal State: trying to draw a batch before begin()";

		//don't draw anything if GL tex doesn't exist..
		if (!texture)
			return;

		if (this.texture === null || this.texture.id !== texture.id) {
			//new texture.. flush previous data
			this.flush();
			this.texture = texture;
		} else if (this.idx == this.vertices.length) {
			this.flush(); //we've reached our max, flush before pushing more data
		}

		width = (width===0) ? width : (width || texture.width);
		height = (height===0) ? height : (height || texture.height);
		x = x || 0;
		y = y || 0;

		var x1 = x;
		var x2 = x + width;
		var y1 = y;
		var y2 = y + height;

		u1 = u1 || 0;
		u2 = (u2===0) ? u2 : (u2 || 1);
		v1 = v1 || 0;
		v2 = (v2===0) ? v2 : (v2 || 1);

		var c = this.color;

		//xy
		this.vertices[this.idx++] = x1;
		this.vertices[this.idx++] = y1;
		//color
		this.vertices[this.idx++] = c;
		//uv
		this.vertices[this.idx++] = u1;
		this.vertices[this.idx++] = v1;
		
		//xy
		this.vertices[this.idx++] = x2;
		this.vertices[this.idx++] = y1;
		//color
		this.vertices[this.idx++] = c;
		//uv
		this.vertices[this.idx++] = u2;
		this.vertices[this.idx++] = v1;

		//xy
		this.vertices[this.idx++] = x2;
		this.vertices[this.idx++] = y2;
		//color
		this.vertices[this.idx++] = c;
		//uv
		this.vertices[this.idx++] = u2;
		this.vertices[this.idx++] = v2;

		//xy
		this.vertices[this.idx++] = x1;
		this.vertices[this.idx++] = y2;
		//color
		this.vertices[this.idx++] = c;
		//uv
		this.vertices[this.idx++] = u1;
		this.vertices[this.idx++] = v2;
	},

	/**
	 * Adds a single quad mesh to this sprite batch from the given
	 * array of vertices. The sprite is drawn in 
	 * screen-space with the origin at the upper-left corner (y-down).
	 *
	 * This reads 20 interleaved floats from the given offset index, in the format
	 *
	 *  { x, y, color, u, v,
	 *      ...  }
	 *
	 * @method  drawVertices
	 * @param {Texture} texture the Texture object
	 * @param {Float32Array} verts an array of vertices
	 * @param {Number} off the offset into the vertices array to read from
	 */
	drawVertices: function(texture, verts, off) {
		if (!this.drawing)
			throw "Illegal State: trying to draw a batch before begin()";
		
		//don't draw anything if GL tex doesn't exist..
		if (!texture)
			return;


		if (this.texture != texture) {
			//new texture.. flush previous data
			this.flush();
			this.texture = texture;
		} else if (this.idx == this.vertices.length) {
			this.flush(); //we've reached our max, flush before pushing more data
		}

		off = off || 0;
		//TODO: use a loop here?
		//xy
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		//color
		this.vertices[this.idx++] = verts[off++];
		//uv
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		
		//xy
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		//color
		this.vertices[this.idx++] = verts[off++];
		//uv
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];

		//xy
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		//color
		this.vertices[this.idx++] = verts[off++];
		//uv
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];

		//xy
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		//color
		this.vertices[this.idx++] = verts[off++];
		//uv
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
	}
});

/**
 * The default vertex size, i.e. number of floats per vertex.
 * @attribute  VERTEX_SIZE
 * @static
 * @final
 * @type {Number}
 * @default  5
 */
SpriteBatch.VERTEX_SIZE = 5;

/**
 * Incremented after each draw call, can be used for debugging.
 *
 *     SpriteBatch.totalRenderCalls = 0;
 *
 *     ... draw your scene ...
 *
 *     console.log("Draw calls per frame:", SpriteBatch.totalRenderCalls);
 *
 * 
 * @attribute  totalRenderCalls
 * @static
 * @type {Number}
 * @default  0
 */
SpriteBatch.totalRenderCalls = 0;

SpriteBatch.DEFAULT_FRAG_SHADER = [
	"precision mediump float;",
	"varying vec2 vTexCoord0;",
	"varying vec4 vColor;",
	"uniform sampler2D u_texture0;",

	"void main(void) {",
	"   gl_FragColor = texture2D(u_texture0, vTexCoord0) * vColor;",
	"}"
].join('\n');

SpriteBatch.DEFAULT_VERT_SHADER = [
	"attribute vec2 "+ShaderProgram.POSITION_ATTRIBUTE+";",
	"attribute vec4 "+ShaderProgram.COLOR_ATTRIBUTE+";",
	"attribute vec2 "+ShaderProgram.TEXCOORD_ATTRIBUTE+"0;",

	"uniform vec2 u_projection;",
	"varying vec2 vTexCoord0;",
	"varying vec4 vColor;",

	"void main(void) {", ///TODO: use a projection and transform matrix
	"   gl_Position = vec4( "
		+ShaderProgram.POSITION_ATTRIBUTE
		+".x / u_projection.x - 1.0, "
		+ShaderProgram.POSITION_ATTRIBUTE
		+".y / -u_projection.y + 1.0 , 0.0, 1.0);",
	"   vTexCoord0 = "+ShaderProgram.TEXCOORD_ATTRIBUTE+"0;",
	"   vColor = "+ShaderProgram.COLOR_ATTRIBUTE+";",
	"}"
].join('\n');

module.exports = SpriteBatch;

},{"./BaseBatch":32,"./glutils/Mesh":38,"./glutils/ShaderProgram":39,"klasse":41}],34:[function(require,module,exports){
/**
 * @module kami
 */

var Class = require('klasse');
var Signal = require('signals');
var nextPowerOfTwo = require('number-util').nextPowerOfTwo;
var isPowerOfTwo = require('number-util').isPowerOfTwo;

var Texture = new Class({


	/**
	 * Creates a new texture with the optional width, height, and data.
	 *
	 * If the constructor is passed no parameters other than WebGLContext, then
	 * it will not be initialized and will be non-renderable. You will need to manually
	 * uploadData or uploadImage yourself.
	 *
	 * If you pass a width and height after context, the texture will be initialized with that size
	 * and null data (e.g. transparent black). If you also pass the format and data, 
	 * it will be uploaded to the texture. 
	 *
	 * If you pass a String or Data URI as the second parameter,
	 * this Texture will load an Image object asynchronously. The optional third
	 * and fourth parameters are callback functions for success and failure, respectively. 
	 * The optional fifrth parameter for this version of the constructor is genMipmaps, which defaults to false. 
	 * 
	 * The arguments are kept in memory for future context restoration events. If
	 * this is undesirable (e.g. huge buffers which need to be GC'd), you should not
	 * pass the data in the constructor, but instead upload it after creating an uninitialized 
	 * texture. You will need to manage it yourself, either by extending the create() method, 
	 * or listening to restored events in WebGLContext.
	 *
	 * Most users will want to use the AssetManager to create and manage their textures
	 * with asynchronous loading and context loss. 
	 *
	 * @example
	 * 		new Texture(context, 256, 256); //empty 256x256 texture
	 * 		new Texture(context, 1, 1, Texture.Format.RGBA, Texture.DataType.UNSIGNED_BYTE, 
	 * 					new Uint8Array([255,0,0,255])); //1x1 red texture
	 * 		new Texture(context, "test.png"); //loads image asynchronously
	 * 		new Texture(context, "test.png", successFunc, failFunc, useMipmaps); //extra params for image laoder 
	 *
	 * @class  Texture
	 * @constructor
	 * @param  {WebGLContext} context the WebGL context
	 * @param  {Number} width the width of this texture
	 * @param  {Number} height the height of this texture
	 * @param  {GLenum} format e.g. Texture.Format.RGBA
	 * @param  {GLenum} dataType e.g. Texture.DataType.UNSIGNED_BYTE (Uint8Array)
	 * @param  {GLenum} data the array buffer, e.g. a Uint8Array view
	 * @param  {Boolean} genMipmaps whether to generate mipmaps after uploading the data
	 */
	initialize: function Texture(context, width, height, format, dataType, data, genMipmaps) {
		if (typeof context !== "object")
			throw "GL context not specified to Texture";
		this.context = context;

		/**
		 * The WebGLTexture which backs this Texture object. This
		 * can be used for low-level GL calls.
		 * 
		 * @type {WebGLTexture}
		 */
		this.id = null; //initialized in create()

		/**
		 * The target for this texture unit, i.e. TEXTURE_2D. Subclasses
		 * should override the create() method to change this, for correct
		 * usage with context restore.
		 * 
		 * @property target
		 * @type {GLenum}
		 * @default  gl.TEXTURE_2D
		 */
		this.target = context.gl.TEXTURE_2D;

		/**
		 * The width of this texture, in pixels.
		 * 
		 * @property width
		 * @readOnly
		 * @type {Number} the width
		 */
		this.width = 0; //initialized on texture upload

		/**
		 * The height of this texture, in pixels.
		 * 
		 * @property height
		 * @readOnly
		 * @type {Number} the height
		 */
		this.height = 0; //initialized on texture upload

		// e.g. --> new Texture(gl, 256, 256, gl.RGB, gl.UNSIGNED_BYTE, data);
		//		      creates a new empty texture, 256x256
		//		--> new Texture(gl);
		//			  creates a new texture but WITHOUT uploading any data. 

		/**
		 * The S wrap parameter.
		 * @property {GLenum} wrapS
		 */
		this.wrapS = Texture.DEFAULT_WRAP;
		/**
		 * The T wrap parameter.
		 * @property {GLenum} wrapT
		 */
		this.wrapT = Texture.DEFAULT_WRAP;
		/**
		 * The minifcation filter.
		 * @property {GLenum} minFilter 
		 */
		this.minFilter = Texture.DEFAULT_FILTER;
		
		/**
		 * The magnification filter.
		 * @property {GLenum} magFilter 
		 */
		this.magFilter = Texture.DEFAULT_FILTER;

		/**
		 * When a texture is created, we keep track of the arguments provided to 
		 * its constructor. On context loss and restore, these arguments are re-supplied
		 * to the Texture, so as to re-create it in its correct form.
		 *
		 * This is mainly useful if you are procedurally creating textures and passing
		 * their data directly (e.g. for generic lookup tables in a shader). For image
		 * or media based textures, it would be better to use an AssetManager to manage
		 * the asynchronous texture upload.
		 *
		 * Upon destroying a texture, a reference to this is also lost.
		 *
		 * @property managedArgs
		 * @type {Array} the array of arguments, shifted to exclude the WebGLContext parameter
		 */
		this.managedArgs = Array.prototype.slice.call(arguments, 1);

		//This is maanged by WebGLContext
		this.context.addManagedObject(this);
		this.create();
	},

	/**
	 * This can be called after creating a Texture to load an Image object asynchronously,
	 * or upload image data directly. It takes the same parameters as the constructor, except 
	 * for the context which has already been established. 
	 *
	 * Users will generally not need to call this directly. 
	 * 
	 * @protected
	 * @method  setup
	 */
	setup: function(width, height, format, dataType, data, genMipmaps) {
		var gl = this.gl;

		//If the first argument is a string, assume it's an Image loader
		//second argument will then be genMipmaps, third and fourth the success/fail callbacks
		if (typeof width === "string") {
			var img = new Image();
			var path      = arguments[0];   //first argument, the path
			var successCB = typeof arguments[1] === "function" ? arguments[1] : null;
			var failCB    = typeof arguments[2] === "function" ? arguments[2] : null;
			genMipmaps    = !!arguments[3];

			var self = this;

			//If you try to render a texture that is not yet "renderable" (i.e. the 
			//async load hasn't completed yet, which is always the case in Chrome since requestAnimationFrame
			//fires before img.onload), WebGL will throw us errors. So instead we will just upload some
			//dummy data until the texture load is complete. Users can disable this with the global flag.
			if (Texture.USE_DUMMY_1x1_DATA) {
				self.uploadData(1, 1);
				this.width = this.height = 0;
			}

			img.onload = function() {
				self.uploadImage(img, undefined, undefined, genMipmaps);
				if (successCB)
					successCB();
			}
			img.onerror = function() {
				// console.warn("Error loading image: "+path);
				if (genMipmaps) //we still need to gen mipmaps on the 1x1 dummy
					gl.generateMipmap(gl.TEXTURE_2D);
				if (failCB)
					failCB();
			}
			img.onabort = function() {
				// console.warn("Image load aborted: "+path);
				if (genMipmaps) //we still need to gen mipmaps on the 1x1 dummy
					gl.generateMipmap(gl.TEXTURE_2D);
				if (failCB)
					failCB();
			}

			img.src = path;
		} 
		//otherwise assume our regular list of width/height arguments are passed
		else {
			this.uploadData(width, height, format, dataType, data, genMipmaps);
		}
	},	

	/**
	 * Called in the Texture constructor, and after the GL context has been re-initialized. 
	 * Subclasses can override this to provide a custom data upload, e.g. cubemaps or compressed
	 * textures.
	 *
	 * @method  create
	 */
	create: function() {
		this.gl = this.context.gl; 
		var gl = this.gl;

		this.id = gl.createTexture(); //texture ID is recreated
		this.width = this.height = 0; //size is reset to zero until loaded
		this.target = gl.TEXTURE_2D;  //the provider can change this if necessary (e.g. cube maps)

		this.bind();


		//TODO: clean these up a little. 
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, Texture.UNPACK_PREMULTIPLY_ALPHA);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, Texture.UNPACK_ALIGNMENT);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, Texture.UNPACK_FLIP_Y);
		
		var colorspace = Texture.UNPACK_COLORSPACE_CONVERSION || gl.BROWSER_DEFAULT_WEBGL;
		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, colorspace);

		//setup wrap modes without binding redundantly
		this.setWrap(this.wrapS, this.wrapT, false);
		this.setFilter(this.minFilter, this.magFilter, false);
		
		if (this.managedArgs.length !== 0) {
			this.setup.apply(this, this.managedArgs);
		}
	},

	/**
	 * Destroys this texture by deleting the GL resource,
	 * removing it from the WebGLContext management stack,
	 * setting its size to zero, and id and managed arguments to null.
	 * 
	 * Trying to use this texture after may lead to undefined behaviour.
	 *
	 * @method  destroy
	 */
	destroy: function() {
		if (this.id && this.gl)
			this.gl.deleteTexture(this.id);
		if (this.context)
			this.context.removeManagedObject(this);
		this.width = this.height = 0;
		this.id = null;
		this.managedArgs = null;
		this.context = null;
		this.gl = null;
	},

	/**
	 * Sets the wrap mode for this texture; if the second argument
	 * is undefined or falsy, then both S and T wrap will use the first
	 * argument.
	 *
	 * You can use Texture.Wrap constants for convenience, to avoid needing 
	 * a GL reference.
	 *
	 * @method  setWrap
	 * @param {GLenum} s the S wrap mode
	 * @param {GLenum} t the T wrap mode
	 * @param {Boolean} ignoreBind (optional) if true, the bind will be ignored. 
	 */
	setWrap: function(s, t, ignoreBind) { //TODO: support R wrap mode
		if (s && t) {
			this.wrapS = s;
			this.wrapT = t;
		} else 
			this.wrapS = this.wrapT = s;
		
		//enforce POT rules..
		this._checkPOT();	

		if (!ignoreBind)
			this.bind();

		var gl = this.gl;
		gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, this.wrapS);
		gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, this.wrapT);
	},


	/**
	 * Sets the min and mag filter for this texture; 
	 * if mag is undefined or falsy, then both min and mag will use the
	 * filter specified for min.
	 *
	 * You can use Texture.Filter constants for convenience, to avoid needing 
	 * a GL reference.
	 *
	 * @method  setFilter
	 * @param {GLenum} min the minification filter
	 * @param {GLenum} mag the magnification filter
	 * @param {Boolean} ignoreBind if true, the bind will be ignored. 
	 */
	setFilter: function(min, mag, ignoreBind) { 
		if (min && mag) {
			this.minFilter = min;
			this.magFilter = mag;
		} else 
			this.minFilter = this.magFilter = min;
		
		//enforce POT rules..
		this._checkPOT();

		if (!ignoreBind)
			this.bind();

		var gl = this.gl;
		gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, this.minFilter);
		gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, this.magFilter);
	},

	/**
	 * A low-level method to upload the specified ArrayBufferView
	 * to this texture. This will cause the width and height of this
	 * texture to change.
	 *
	 * @method  uploadData
	 * @param  {Number} width          the new width of this texture,
	 *                                 defaults to the last used width (or zero)
	 * @param  {Number} height         the new height of this texture
	 *                                 defaults to the last used height (or zero)
	 * @param  {GLenum} format         the data format, default RGBA
	 * @param  {GLenum} type           the data type, default UNSIGNED_BYTE (Uint8Array)
	 * @param  {ArrayBufferView} data  the raw data for this texture, or null for an empty image
	 * @param  {Boolean} genMipmaps	   whether to generate mipmaps after uploading the data, default false
	 */
	uploadData: function(width, height, format, type, data, genMipmaps) {
		var gl = this.gl;

		format = format || gl.RGBA;
		type = type || gl.UNSIGNED_BYTE;
		data = data || null; //make sure falsey value is null for texImage2D

		this.width = (width || width==0) ? width : this.width;
		this.height = (height || height==0) ? height : this.height;

		this._checkPOT();

		this.bind();

		gl.texImage2D(this.target, 0, format, 
					  this.width, this.height, 0, format,
					  type, data);

		if (genMipmaps)
			gl.generateMipmap(this.target);
	},

	/**
	 * Uploads ImageData, HTMLImageElement, HTMLCanvasElement or 
	 * HTMLVideoElement.
	 *
	 * @method  uploadImage
	 * @param  {Object} domObject the DOM image container
	 * @param  {GLenum} format the format, default gl.RGBA
	 * @param  {GLenum} type the data type, default gl.UNSIGNED_BYTE
	 * @param  {Boolean} genMipmaps whether to generate mipmaps after uploading the data, default false
	 */
	uploadImage: function(domObject, format, type, genMipmaps) {
		var gl = this.gl;

		format = format || gl.RGBA;
		type = type || gl.UNSIGNED_BYTE;
		
		this.width = domObject.width;
		this.height = domObject.height;

		this._checkPOT();

		this.bind();

		gl.texImage2D(this.target, 0, format, format,
					  type, domObject);

		if (genMipmaps)
			gl.generateMipmap(this.target);
	},

	/**
	 * If FORCE_POT is false, we verify this texture to see if it is valid, 
	 * as per non-power-of-two rules. If it is non-power-of-two, it must have 
	 * a wrap mode of CLAMP_TO_EDGE, and the minification filter must be LINEAR
	 * or NEAREST. If we don't satisfy these needs, an error is thrown.
	 * 
	 * @method  _checkPOT
	 * @private
	 * @return {[type]} [description]
	 */
	_checkPOT: function() {
		if (!Texture.FORCE_POT) {
			//If minFilter is anything but LINEAR or NEAREST
			//or if wrapS or wrapT are not CLAMP_TO_EDGE...
			var wrongFilter = (this.minFilter !== Texture.Filter.LINEAR && this.minFilter !== Texture.Filter.NEAREST);
			var wrongWrap = (this.wrapS !== Texture.Wrap.CLAMP_TO_EDGE || this.wrapT !== Texture.Wrap.CLAMP_TO_EDGE);

			if ( wrongFilter || wrongWrap ) {
				if (!isPowerOfTwo(this.width) || !isPowerOfTwo(this.height))
					throw new Error(wrongFilter 
							? "Non-power-of-two textures cannot use mipmapping as filter"
							: "Non-power-of-two textures must use CLAMP_TO_EDGE as wrap");
			}
		}
	},

	/**
	 * Binds the texture. If unit is specified,
	 * it will bind the texture at the given slot
	 * (TEXTURE0, TEXTURE1, etc). If unit is not specified,
	 * it will simply bind the texture at whichever slot
	 * is currently active.
	 *
	 * @method  bind
	 * @param  {Number} unit the texture unit index, starting at 0
	 */
	bind: function(unit) {
		var gl = this.gl;
		if (unit || unit === 0)
			gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(this.target, this.id);
	},

	toString: function() {
		return this.id + ":" + this.width + "x" + this.height + "";
	}
});

/** 
 * A set of Filter constants that match their GL counterparts.
 * This is for convenience, to avoid the need for a GL rendering context.
 *
 * @example
 * ```
 *     Texture.Filter.NEAREST
 *     Texture.Filter.NEAREST_MIPMAP_LINEAR
 *     Texture.Filter.NEAREST_MIPMAP_NEAREST
 *     Texture.Filter.LINEAR
 *     Texture.Filter.LINEAR_MIPMAP_LINEAR
 *     Texture.Filter.LINEAR_MIPMAP_NEAREST
 * ```
 * @attribute Filter
 * @static
 * @type {Object}
 */
Texture.Filter = {
	NEAREST: 9728,
	NEAREST_MIPMAP_LINEAR: 9986,
	NEAREST_MIPMAP_NEAREST: 9984,
	LINEAR: 9729,
	LINEAR_MIPMAP_LINEAR: 9987,
	LINEAR_MIPMAP_NEAREST: 9985
};

/** 
 * A set of Wrap constants that match their GL counterparts.
 * This is for convenience, to avoid the need for a GL rendering context.
 *
 * @example
 * ```
 *     Texture.Wrap.CLAMP_TO_EDGE
 *     Texture.Wrap.MIRRORED_REPEAT
 *     Texture.Wrap.REPEAT
 * ```
 * @attribute Wrap
 * @static
 * @type {Object}
 */
Texture.Wrap = {
	CLAMP_TO_EDGE: 33071,
	MIRRORED_REPEAT: 33648,
	REPEAT: 10497
};

/** 
 * A set of Format constants that match their GL counterparts.
 * This is for convenience, to avoid the need for a GL rendering context.
 *
 * @example
 * ```
 *     Texture.Format.RGB
 *     Texture.Format.RGBA
 *     Texture.Format.LUMINANCE_ALPHA
 * ```
 * @attribute Format
 * @static
 * @type {Object}
 */
Texture.Format = {
	DEPTH_COMPONENT: 6402,
	ALPHA: 6406,
	RGBA: 6408,
	RGB: 6407,
	LUMINANCE: 6409,
	LUMINANCE_ALPHA: 6410
};

/** 
 * A set of DataType constants that match their GL counterparts.
 * This is for convenience, to avoid the need for a GL rendering context.
 *
 * @example
 * ```
 *     Texture.DataType.UNSIGNED_BYTE 
 *     Texture.DataType.FLOAT 
 * ```
 * @attribute DataType
 * @static
 * @type {Object}
 */
Texture.DataType = {
	BYTE: 5120,
	SHORT: 5122,
	INT: 5124,
	FLOAT: 5126,
	UNSIGNED_BYTE: 5121,
	UNSIGNED_INT: 5125,
	UNSIGNED_SHORT: 5123,
	UNSIGNED_SHORT_4_4_4_4: 32819,
	UNSIGNED_SHORT_5_5_5_1: 32820,
	UNSIGNED_SHORT_5_6_5: 33635
}

/**
 * The default wrap mode when creating new textures. If a custom 
 * provider was specified, it may choose to override this default mode.
 * 
 * @attribute {GLenum} DEFAULT_WRAP
 * @static 
 * @default  Texture.Wrap.CLAMP_TO_EDGE
 */
Texture.DEFAULT_WRAP = Texture.Wrap.CLAMP_TO_EDGE;


/**
 * The default filter mode when creating new textures. If a custom
 * provider was specified, it may choose to override this default mode.
 *
 * @attribute {GLenum} DEFAULT_FILTER
 * @static
 * @default  Texture.Filter.LINEAR
 */
Texture.DEFAULT_FILTER = Texture.Filter.NEAREST;

/**
 * By default, we do some error checking when creating textures
 * to ensure that they will be "renderable" by WebGL. Non-power-of-two
 * textures must use CLAMP_TO_EDGE as their wrap mode, and NEAREST or LINEAR
 * as their wrap mode. Further, trying to generate mipmaps for a NPOT image
 * will lead to errors. 
 *
 * However, you can disable this error checking by setting `FORCE_POT` to true.
 * This may be useful if you are running on specific hardware that supports POT 
 * textures, or in some future case where NPOT textures is added as a WebGL extension.
 * 
 * @attribute {Boolean} FORCE_POT
 * @static
 * @default  false
 */
Texture.FORCE_POT = false;

//default pixel store operations. Used in create()
Texture.UNPACK_FLIP_Y = false;
Texture.UNPACK_ALIGNMENT = 1;
Texture.UNPACK_PREMULTIPLY_ALPHA = true; 
Texture.UNPACK_COLORSPACE_CONVERSION = undefined;

//for the Image constructor we need to handle things a bit differently..
Texture.USE_DUMMY_1x1_DATA = true;

/**
 * Utility to get the number of components for the given GLenum, e.g. gl.RGBA returns 4.
 * Returns null if the specified format is not of type DEPTH_COMPONENT, ALPHA, LUMINANCE,
 * LUMINANCE_ALPHA, RGB, or RGBA.
 * 
 * @method getNumComponents
 * @static
 * @param  {GLenum} format a texture format, i.e. Texture.Format.RGBA
 * @return {Number} the number of components for this format
 */
Texture.getNumComponents = function(format) {
	switch (format) {
		case Texture.Format.DEPTH_COMPONENT:
		case Texture.Format.ALPHA:
		case Texture.Format.LUMINANCE:
			return 1;
		case Texture.Format.LUMINANCE_ALPHA:
			return 2;
		case Texture.Format.RGB:
			return 3;
		case Texture.Format.RGBA:
			return 4;
	}
	return null;
};

module.exports = Texture;
},{"klasse":41,"number-util":42,"signals":43}],35:[function(require,module,exports){
var Class = require('klasse');
var Texture = require('./Texture');

//This is a GL-specific texture region, employing tangent space normalized coordinates U and V.
//A canvas-specific region would really just be a lightweight object with { x, y, width, height }
//in pixels.
var TextureRegion = new Class({

	initialize: function TextureRegion(texture, x, y, width, height) {
		this.texture = texture;
		this.setRegion(x, y, width, height);
	},

	setUVs: function(u, v, u2, v2) {
		this.regionWidth = Math.round(Math.abs(u2 - u) * this.texture.width);
        this.regionHeight = Math.round(Math.abs(v2 - v) * this.texture.height);

        // From LibGDX TextureRegion.java -- 
		// For a 1x1 region, adjust UVs toward pixel center to avoid filtering artifacts on AMD GPUs when drawing very stretched.
		if (this.regionWidth == 1 && this.regionHeight == 1) {
			var adjustX = 0.25 / this.texture.width;
			u += adjustX;
			u2 -= adjustX;
			var adjustY = 0.25 / this.texture.height;
			v += adjustY;
			v2 -= adjustY;
		}

		this.u = u;
		this.v = v;
		this.u2 = u2;
		this.v2 = v2;
	},

	setRegion: function(x, y, width, height) {
		x = x || 0;
		y = y || 0;
		width = (width===0 || width) ? width : this.texture.width;
		height = (height===0 || height) ? height : this.texture.height;

		var invTexWidth = 1 / this.texture.width;
		var invTexHeight = 1 / this.texture.height;
		this.setUVs(x * invTexWidth, y * invTexHeight, (x + width) * invTexWidth, (y + height) * invTexHeight);
		this.regionWidth = Math.abs(width);
		this.regionHeight = Math.abs(height);
	},

	/** Sets the texture to that of the specified region and sets the coordinates relative to the specified region. */
	setFromRegion: function(region, x, y, width, height) {
		this.texture = region.texture;
		this.set(region.getRegionX() + x, region.getRegionY() + y, width, height);
	},


	//TODO: add setters for regionX/Y and regionWidth/Height

	regionX: {
		get: function() {
			return Math.round(this.u * this.texture.width);
		} 
	},

	regionY: {
		get: function() {
			return Math.round(this.v * this.texture.height);
		}
	},

	flip: function(x, y) {
		var temp;
		if (x) {
			temp = this.u;
			this.u = this.u2;
			this.u2 = temp;
		}
		if (y) {
			temp = this.v;
			this.v = this.v2;
			this.v2 = temp;
		}
	}
});

module.exports = TextureRegion;
},{"./Texture":34,"klasse":41}],36:[function(require,module,exports){
/**
 * @module kami
 */

var Class = require('klasse');
var Signal = require('signals');

/**
 * A thin wrapper around WebGLRenderingContext which handles
 * context loss and restore with various rendering objects (textures,
 * shaders and buffers). This also handles general viewport management.
 *
 * If the view is not specified, a canvas will be created.
 *
 * If the `view` parameter is an instanceof WebGLRenderingContext,
 * we will use its canvas and context without fetching another through `getContext`.
 * Passing a canvas that has already had `getContext('webgl')` called will not cause
 * errors, but in certain debuggers (e.g. Chrome WebGL Inspector) only the latest
 * context will be traced.
 * 
 * @class  WebGLContext
 * @constructor
 * @param {Number} width the width of the GL canvas
 * @param {Number} height the height of the GL canvas
 * @param {HTMLCanvasElement} view the optional DOM canvas element
 * @param {Object} contextAttribuets an object containing context attribs which
 *                                   will be used during GL initialization
 */
var WebGLContext = new Class({
	
	initialize: function WebGLContext(width, height, view, contextAttributes) {
		/**
		 * The list of rendering objects (shaders, VBOs, textures, etc) which are 
		 * currently being managed. Any object with a "create" method can be added
		 * to this list. Upon destroying the rendering object, it should be removed.
		 * See addManagedObject and removeManagedObject.
		 * 
		 * @property {Array} managedObjects
		 */
		this.managedObjects = [];

		/**
		 * The actual GL context. You can use this for
		 * raw GL calls or to access GLenum constants. This
		 * will be updated on context restore. While the WebGLContext
		 * is not `valid`, you should not try to access GL state.
		 * 
		 * @property gl
		 * @type {WebGLRenderingContext}
		 */
		this.gl = null;

		if (view && typeof window.WebGLRenderingContext !== "undefined"
				 && view instanceof window.WebGLRenderingContext) {
			view = view.canvas;
			this.gl = view;
			this.valid = true;
			contextAttributes = undefined; //just ignore new attribs...
		}

		/**
		 * The canvas DOM element for this context.
		 * @property {Number} view
		 */
		this.view = view || document.createElement("canvas");

		//default size as per spec:
		//http://www.w3.org/TR/2012/WD-html5-author-20120329/the-canvas-element.html#the-canvas-element
		
		/**
		 * The width of this canvas.
		 *
		 * @property width
		 * @type {Number}
		 */
		this.width = this.view.width = width || 300;

		/**
		 * The height of this canvas.
		 * @property height
		 * @type {Number}
		 */
		this.height = this.view.height = height || 150;


		/**
		 * The context attributes for initializing the GL state. This might include
		 * anti-aliasing, alpha settings, verison, and so forth.
		 * 
		 * @property {Object} contextAttributes 
		 */
		this.contextAttributes = contextAttributes;
		
		/**
		 * Whether this context is 'valid', i.e. renderable. A context that has been lost
		 * (and not yet restored) or destroyed is invalid.
		 * 
		 * @property {Boolean} valid
		 */
		this.valid = false;

		/**
		 * A signal dispatched when GL context is lost. 
		 * 
		 * The first argument passed to the listener is the WebGLContext
		 * managing the context loss.
		 * 
		 * @event {Signal} lost
		 */
		this.lost = new Signal();

		/**
		 * A signal dispatched when GL context is restored, after all the managed
		 * objects have been recreated.
		 *
		 * The first argument passed to the listener is the WebGLContext
		 * which managed the restoration.
		 *
		 * This does not gaurentee that all objects will be renderable.
		 * For example, a Texture with an ImageProvider may still be loading
		 * asynchronously.	 
		 * 
		 * @event {Signal} restored
		 */
		this.restored = new Signal();	
		
		//setup context lost and restore listeners
		this.view.addEventListener("webglcontextlost", function (ev) {
			ev.preventDefault();
			this._contextLost(ev);
		}.bind(this));
		this.view.addEventListener("webglcontextrestored", function (ev) {
			ev.preventDefault();
			this._contextRestored(ev);
		}.bind(this));
			
		if (!this.valid) //would only be valid if WebGLRenderingContext was passed 
			this._initContext();

		this.resize(this.width, this.height);
	},
	
	_initContext: function() {
		var err = "";
		this.valid = false;

		try {
			this.gl = (this.view.getContext('webgl', this.contextAttributes) 
						|| this.view.getContext('experimental-webgl', this.contextAttributes));
		} catch (e) {
			this.gl = null;
		}

		if (this.gl) {
			this.valid = true;
		} else {
			throw "WebGL Context Not Supported -- try enabling it or using a different browser";
		}	
	},

	/**
	 * Updates the width and height of this WebGL context, resizes
	 * the canvas view, and calls gl.viewport() with the new size.
	 * 
	 * @param  {Number} width  the new width
	 * @param  {Number} height the new height
	 */
	resize: function(width, height) {
		this.width = width;
		this.height = height;

		this.view.width = width;
		this.view.height = height;

		var gl = this.gl;
		gl.viewport(0, 0, this.width, this.height);
	},

	/**
	 * (internal use)
	 * A managed object is anything with a "create" function, that will
	 * restore GL state after context loss. 
	 * 
	 * @param {[type]} tex [description]
	 */
	addManagedObject: function(obj) {
		this.managedObjects.push(obj);
	},

	/**
	 * (internal use)
	 * Removes a managed object from the cache. This is useful to destroy
	 * a texture or shader, and have it no longer re-load on context restore.
	 *
	 * Returns the object that was removed, or null if it was not found in the cache.
	 * 
	 * @param  {Object} obj the object to be managed
	 * @return {Object}     the removed object, or null
	 */
	removeManagedObject: function(obj) {
		var idx = this.managedObjects.indexOf(obj);
		if (idx > -1) {
			this.managedObjects.splice(idx, 1);
			return obj;
		} 
		return null;
	},

	/**
	 * Calls destroy() on each managed object, then removes references to these objects
	 * and the GL rendering context. This also removes references to the view and sets
	 * the context's width and height to zero.
	 *
	 * Attempting to use this WebGLContext or the GL rendering context after destroying it
	 * will lead to undefined behaviour.
	 */
	destroy: function() {
		for (var i=0; i<this.managedObjects.length; i++) {
			var obj = this.managedObjects[i];
			if (obj && typeof obj.destroy === "function")
				obj.destroy();
		}
		this.managedObjects.length = 0;
		this.valid = false;
		this.gl = null;
		this.view = null;
		this.width = this.height = 0;
	},

	_contextLost: function(ev) {
		//all textures/shaders/buffers/FBOs have been deleted... 
		//we need to re-create them on restore
		this.valid = false;

		this.lost.dispatch(this);
	},

	_contextRestored: function(ev) {
		//first, initialize the GL context again
		this._initContext();

		//now we recreate our shaders and textures
		for (var i=0; i<this.managedObjects.length; i++) {
			this.managedObjects[i].create();
		}

		//update GL viewport
		this.resize(this.width, this.height);

		this.restored.dispatch(this);
	}
});

module.exports = WebGLContext;
},{"klasse":41,"signals":43}],37:[function(require,module,exports){
var Class = require('klasse');
var Texture = require('../Texture');


var FrameBuffer = new Class({

	/**
	 * Creates a new Frame Buffer Object with the given width and height.
	 *
	 * If width and height are non-numbers, this method expects the
	 * first parameter to be a Texture object which should be acted upon. 
	 * In this case, the FrameBuffer does not "own" the texture, and so it
	 * won't dispose of it upon destruction. This is an advanced version of the
	 * constructor that assumes the user is giving us a valid Texture that can be bound (i.e.
	 * no async Image textures).
	 *
	 * @class  FrameBuffer
	 * @constructor
	 * @param  {[type]} width  [description]
	 * @param  {[type]} height [description]
	 * @param  {[type]} filter [description]
	 * @return {[type]}        [description]
	 */
	initialize: function FrameBuffer(context, width, height, format) { //TODO: depth component
		if (typeof context !== "object")
			throw "GL context not specified to FrameBuffer";
	

		/**
		 * The underlying ID of the GL frame buffer object.
		 *
		 * @property {WebGLFramebuffer} id
		 */		
		this.id = null;

		/**
		 * The WebGLContext backed by this frame buffer.
		 *
		 * @property {WebGLContext} context
		 */
		this.context = context;

		/**
		 * The Texture backed by this frame buffer.
		 *
		 * @property {Texture} Texture
		 */
		//this Texture is now managed.
		this.texture = new Texture(context, width, height, format);

		//This is maanged by WebGLContext
		this.context.addManagedObject(this);
		this.create();
	},

	/**
	 * A read-only property which returns the width of the backing texture. 
	 * 
	 * @readOnly
	 * @property width
	 * @type {Number}
	 */
	width: {
		get: function() {
			return this.texture.width
		}
	},

	/**
	 * A read-only property which returns the height of the backing texture. 
	 * 
	 * @readOnly
	 * @property height
	 * @type {Number}
	 */
	height: {
		get: function() {
			return this.texture.height;
		}
	},


	/**
	 * Called during initialization to setup the frame buffer; also called on
	 * context restore. Users will not need to call this directly.
	 * 
	 * @method create
	 */
	create: function() {
		this.gl = this.context.gl; 
		var gl = this.gl;

		var tex = this.texture;

		//we assume the texture has already had create() called on it
		//since it was added as a managed object prior to this FrameBuffer
		tex.bind();
 
		this.id = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex.target, tex.id, 0);

		var result = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if (result != gl.FRAMEBUFFER_COMPLETE) {
			this.destroy(); //destroy our resources before leaving this function..

			var err = "Framebuffer not complete";
			switch (result) {
				case gl.FRAMEBUFFER_UNSUPPORTED:
					throw new Error(err + ": unsupported");
				case gl.INCOMPLETE_DIMENSIONS:
					throw new Error(err + ": incomplete dimensions");
				case gl.INCOMPLETE_ATTACHMENT:
					throw new Error(err + ": incomplete attachment");
				case gl.INCOMPLETE_MISSING_ATTACHMENT:
					throw new Error(err + ": missing attachment");
				default:
					throw new Error(err);
			}
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	},


	/**
	 * Destroys this frame buffer. Using this object after destroying it will have
	 * undefined results. 
	 * @method destroy
	 */
	destroy: function() {
		var gl = this.gl;

		if (this.texture)
			this.texture.destroy();
		if (this.id && this.gl)
			this.gl.deleteFramebuffer(this.id);
		if (this.context)
			this.context.removeManagedObject(this);

		this.id = null;
		this.gl = null;
		this.texture = null;
		this.context = null;
	},

	/**
	 * Binds this framebuffer and sets the viewport to the expected size.
	 * @method begin
	 */
	begin: function() {
		var gl = this.gl;
		gl.viewport(0, 0, this.texture.width, this.texture.height);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);
	},

	/**
	 * Binds the default frame buffer (the screen) and sets the viewport back
	 * to the size of the WebGLContext.
	 * 
	 * @method end
	 */
	end: function() {
		var gl = this.gl;
		gl.viewport(0, 0, this.context.width, this.context.height);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
});

module.exports = FrameBuffer;
},{"../Texture":34,"klasse":41}],38:[function(require,module,exports){
/**
 * @module kami
 */

var Class = require('klasse');

//TODO: decouple into VBO + IBO utilities 
/**
 * A mesh class that wraps VBO and IBO.
 *
 * @class  Mesh
 */
var Mesh = new Class({


	/**
	 * A write-only property which sets both vertices and indices 
	 * flag to dirty or not. 
	 *
	 * @property dirty
	 * @type {Boolean}
	 * @writeOnly
	 */
	dirty: {
		set: function(val) {
			this.verticesDirty = val;
			this.indicesDirty = val;
		}
	},

	/**
	 * Creates a new Mesh with the provided parameters.
	 *
	 * If numIndices is 0 or falsy, no index buffer will be used
	 * and indices will be an empty ArrayBuffer and a null indexBuffer.
	 * 
	 * If isStatic is true, then vertexUsage and indexUsage will
	 * be set to gl.STATIC_DRAW. Otherwise they will use gl.DYNAMIC_DRAW.
	 * You may want to adjust these after initialization for further control.
	 * 
	 * @param  {WebGLContext}  context the context for management
	 * @param  {Boolean} isStatic      a hint as to whether this geometry is static
	 * @param  {[type]}  numVerts      [description]
	 * @param  {[type]}  numIndices    [description]
	 * @param  {[type]}  vertexAttribs [description]
	 * @return {[type]}                [description]
	 */
	initialize: function Mesh(context, isStatic, numVerts, numIndices, vertexAttribs) {
		if (typeof context !== "object")
			throw "GL context not specified to Mesh";
		if (!numVerts)
			throw "numVerts not specified, must be > 0";

		this.context = context;
		this.gl = context.gl;
		
		this.numVerts = null;
		this.numIndices = null;
		
		this.vertices = null;
		this.indices = null;
		this.vertexBuffer = null;
		this.indexBuffer = null;

		this.verticesDirty = true;
		this.indicesDirty = true;
		this.indexUsage = null;
		this.vertexUsage = null;

		/** 
		 * @property
		 * @private
		 */
		this._vertexAttribs = null;

		/** 
		 * The stride for one vertex _in bytes_. 
		 * 
		 * @property {Number} vertexStride
		 */
		this.vertexStride = null;

		this.numVerts = numVerts;
		this.numIndices = numIndices || 0;
		this.vertexUsage = isStatic ? this.gl.STATIC_DRAW : this.gl.DYNAMIC_DRAW;
		this.indexUsage  = isStatic ? this.gl.STATIC_DRAW : this.gl.DYNAMIC_DRAW;
		this._vertexAttribs = vertexAttribs || [];
		
		this.indicesDirty = true;
		this.verticesDirty = true;

		//determine the vertex stride based on given attributes
		var totalNumComponents = 0;
		for (var i=0; i<this._vertexAttribs.length; i++)
			totalNumComponents += this._vertexAttribs[i].offsetCount;
		this.vertexStride = totalNumComponents * 4; // in bytes

		this.vertices = new Float32Array(this.numVerts);
		this.indices = new Uint16Array(this.numIndices);

		//add this VBO to the managed cache
		this.context.addManagedObject(this);

		this.create();
	},

	//recreates the buffers on context loss
	create: function() {
		this.gl = this.context.gl;
		var gl = this.gl;
		this.vertexBuffer = gl.createBuffer();

		//ignore index buffer if we haven't specified any
		this.indexBuffer = this.numIndices > 0
					? gl.createBuffer()
					: null;

		this.dirty = true;
	},

	destroy: function() {
		this.vertices = null;
		this.indices = null;
		if (this.vertexBuffer && this.gl)
			this.gl.deleteBuffer(this.vertexBuffer);
		if (this.indexBuffer && this.gl)
			this.gl.deleteBuffer(this.indexBuffer);
		this.vertexBuffer = null;
		this.indexBuffer = null;
		if (this.context)
			this.context.removeManagedObject(this);
		this.gl = null;
		this.context = null;
	},

	_updateBuffers: function(ignoreBind, subDataLength) {
		var gl = this.gl;

		//bind our index data, if we have any
		if (this.numIndices > 0) {
			if (!ignoreBind)
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

			//update the index data
			if (this.indicesDirty) {
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, this.indexUsage);
				this.indicesDirty = false;
			}
		}

		//bind our vertex data
		if (!ignoreBind)
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

		//update our vertex data
		if (this.verticesDirty) {
			if (subDataLength) {
				// TODO: When decoupling VBO/IBO be sure to give better subData support..
				var view = this.vertices.subarray(0, subDataLength);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
			} else {
				gl.bufferData(gl.ARRAY_BUFFER, this.vertices, this.vertexUsage);	
			}

			
			this.verticesDirty = false;
		}
	},

	draw: function(primitiveType, count, offset, subDataLength) {
		if (count === 0)
			return;

		var gl = this.gl;
		
		offset = offset || 0;

		//binds and updates our buffers. pass ignoreBind as true
		//to avoid binding unnecessarily
		this._updateBuffers(true, subDataLength);

		if (this.numIndices > 0) { 
			gl.drawElements(primitiveType, count, 
						gl.UNSIGNED_SHORT, offset * 2); //* Uint16Array.BYTES_PER_ELEMENT
		} else
			gl.drawArrays(primitiveType, offset, count);
	},

	//binds this mesh's vertex attributes for the given shader
	bind: function(shader) {
		var gl = this.gl;

		var offset = 0;
		var stride = this.vertexStride;

		//bind and update our vertex data before binding attributes
		this._updateBuffers();

		//for each attribtue
		for (var i=0; i<this._vertexAttribs.length; i++) {
			var a = this._vertexAttribs[i];

			//location of the attribute
			var loc = a.location === null 
					? shader.getAttributeLocation(a.name)
					: a.location;

			//TODO: We may want to skip unfound attribs
			// if (loc!==0 && !loc)
			// 	console.warn("WARN:", a.name, "is not enabled");

			//first, enable the vertex array
			gl.enableVertexAttribArray(loc);

			//then specify our vertex format
			gl.vertexAttribPointer(loc, a.numComponents, a.type || gl.FLOAT, 
								   a.normalize, stride, offset);

			//and increase the offset...
			offset += a.offsetCount * 4; //in bytes
		}
	},

	unbind: function(shader) {
		var gl = this.gl;

		//for each attribtue
		for (var i=0; i<this._vertexAttribs.length; i++) {
			var a = this._vertexAttribs[i];

			//location of the attribute
			var loc = a.location === null 
					? shader.getAttributeLocation(a.name)
					: a.location;

			//first, enable the vertex array
			gl.disableVertexAttribArray(loc);
		}
	}
});

Mesh.Attrib = new Class({

	name: null,
	numComponents: null,
	location: null,
	type: null,

	/**
	 * Location is optional and for advanced users that
	 * want vertex arrays to match across shaders. Any non-numerical
	 * value will be converted to null, and ignored. If a numerical
	 * value is given, it will override the position of this attribute
	 * when given to a mesh.
	 * 
	 * @param  {[type]} name          [description]
	 * @param  {[type]} numComponents [description]
	 * @param  {[type]} location      [description]
	 * @return {[type]}               [description]
	 */
	initialize: function(name, numComponents, location, type, normalize, offsetCount) {
		this.name = name;
		this.numComponents = numComponents;
		this.location = typeof location === "number" ? location : null;
		this.type = type;
		this.normalize = Boolean(normalize);
		this.offsetCount = typeof offsetCount === "number" ? offsetCount : this.numComponents;
	}
})


module.exports = Mesh;
},{"klasse":41}],39:[function(require,module,exports){
/**
 * @module kami
 */

var Class = require('klasse');


var ShaderProgram = new Class({
	
	/**
	 * Creates a new ShaderProgram from the given source, and an optional map of attribute
	 * locations as <name, index> pairs.
	 *
	 * _Note:_ Chrome version 31 was giving me issues with attribute locations -- you may
	 * want to omit this to let the browser pick the locations for you.	
	 *
	 * @class  ShaderProgram
	 * @constructor
	 * @param  {WebGLContext} context      the context to manage this object
	 * @param  {String} vertSource         the vertex shader source
	 * @param  {String} fragSource         the fragment shader source
	 * @param  {Object} attributeLocations the attribute locations
	 */
	initialize: function ShaderProgram(context, vertSource, fragSource, attributeLocations) {
		if (!vertSource || !fragSource)
			throw "vertex and fragment shaders must be defined";
		if (typeof context !== "object")
			throw "GL context not specified to ShaderProgram";
		this.context = context;

		this.vertShader = null;
		this.fragShader = null;
		this.program = null;
		this.log = "";

		this.uniformCache = null;
		this.attributeCache = null;

		this.attributeLocations = attributeLocations;

		//We trim (ECMAScript5) so that the GLSL line numbers are
		//accurate on shader log
		this.vertSource = vertSource.trim();
		this.fragSource = fragSource.trim();

		//Adds this shader to the context, to be managed
		this.context.addManagedObject(this);

		this.create();
	},

	/** 
	 * This is called during the ShaderProgram constructor,
	 * and may need to be called again after context loss and restore.
	 * 
	 * @method  create
	 */
	create: function() {
		this.gl = this.context.gl;
		this._compileShaders();
	},

	//Compiles the shaders, throwing an error if the program was invalid.
	_compileShaders: function() {
		var gl = this.gl; 
		
		this.log = "";

		this.vertShader = this._loadShader(gl.VERTEX_SHADER, this.vertSource);
		this.fragShader = this._loadShader(gl.FRAGMENT_SHADER, this.fragSource);

		if (!this.vertShader || !this.fragShader)
			throw "Error returned when calling createShader";

		this.program = gl.createProgram();

		gl.attachShader(this.program, this.vertShader);
		gl.attachShader(this.program, this.fragShader);
	
		//TODO: This seems not to be working on my OSX -- maybe a driver bug?
		if (this.attributeLocations) {
			for (var key in this.attributeLocations) {
				if (this.attributeLocations.hasOwnProperty(key)) {
					gl.bindAttribLocation(this.program, Math.floor(this.attributeLocations[key]), key);
				}
			}
		}

		gl.linkProgram(this.program); 

		this.log += gl.getProgramInfoLog(this.program) || "";

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			throw "Error linking the shader program:\n"
				+ this.log;
		}

		this._fetchUniforms();
		this._fetchAttributes();
	},

	_fetchUniforms: function() {
		var gl = this.gl;

		this.uniformCache = {};

		var len = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
		if (!len) //null or zero
			return;

		for (var i=0; i<len; i++) {
			var info = gl.getActiveUniform(this.program, i);
			if (info === null) 
				continue;
			var name = info.name;
			var location = gl.getUniformLocation(this.program, name);
			
			this.uniformCache[name] = {
				size: info.size,
				type: info.type,
				location: location
			};
		}
	},

	_fetchAttributes: function() { 
		var gl = this.gl; 

		this.attributeCache = {};

		var len = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
		if (!len) //null or zero
			return;	

		for (var i=0; i<len; i++) {
			var info = gl.getActiveAttrib(this.program, i);
			if (info === null) 
				continue;
			var name = info.name;

			//the attrib location is a simple index
			var location = gl.getAttribLocation(this.program, name);
			
			this.attributeCache[name] = {
				size: info.size,
				type: info.type,
				location: location
			};
		}
	},

	_loadShader: function(type, source) {
		var gl = this.gl;

		var shader = gl.createShader(type);
		if (!shader) //should not occur...
			return -1;

		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		
		var logResult = gl.getShaderInfoLog(shader) || "";
		if (logResult) {
			//we do this so the user knows which shader has the error
			var typeStr = (type === gl.VERTEX_SHADER) ? "vertex" : "fragment";
			logResult = "Error compiling "+ typeStr+ " shader:\n"+logResult;
		}

		this.log += logResult;

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
			throw this.log;
		}
		return shader;
	},

	/**
	 * Called to bind this shader. Note that there is no "unbind" since
	 * technically such a thing is not possible in the programmable pipeline.
	 *
	 * You must bind a shader before settings its uniforms.
	 * 
	 * @method bind
	 */
	bind: function() {
		this.gl.useProgram(this.program);
	},


	/**
	 * Destroys this shader and its resources. You should not try to use this
	 * after destroying it.
	 * @method  destroy
	 */
	destroy: function() {
		if (this.context)
			this.context.removeManagedObject(this);

		if (this.gl) {
			var gl = this.gl;
			gl.detachShader(this.vertShader);
			gl.detachShader(this.fragShader);

			gl.deleteShader(this.vertShader);
			gl.deleteShader(this.fragShader);
			gl.deleteProgram(this.program);
		}
		this.attributeCache = null;
		this.uniformCache = null;
		this.vertShader = null;
		this.fragShader = null;
		this.program = null;
		this.gl = null;
		this.context = null;
	},


	/**
	 * Returns the cached uniform info (size, type, location).
	 * If the uniform is not found in the cache, it is assumed
	 * to not exist, and this method returns null.
	 *
	 * This may return null even if the uniform is defined in GLSL:
	 * if it is _inactive_ (i.e. not used in the program) then it may
	 * be optimized out.
	 *
	 * @method  getUniformInfo
	 * @param  {String} name the uniform name as defined in GLSL
	 * @return {Object} an object containing location, size, and type
	 */
	getUniformInfo: function(name) {
		return this.uniformCache[name] || null; 
	},

	/**
	 * Returns the cached attribute info (size, type, location).
	 * If the attribute is not found in the cache, it is assumed
	 * to not exist, and this method returns null.
	 *
	 * This may return null even if the attribute is defined in GLSL:
	 * if it is _inactive_ (i.e. not used in the program or disabled) 
	 * then it may be optimized out.
	 *
	 * @method  getAttributeInfo
	 * @param  {String} name the attribute name as defined in GLSL
	 * @return {object} an object containing location, size and type
	 */
	getAttributeInfo: function(name) {
		return this.attributeCache[name] || null; 
	},


	/**
	 * Returns the cached uniform location object.
	 * If the uniform is not found, this method returns null.
	 *
	 * @method  getAttributeLocation
	 * @param  {String} name the uniform name as defined in GLSL
	 * @return {GLint} the location object
	 */
	getAttributeLocation: function(name) { //TODO: make faster, don't cache
		var info = this.getAttributeInfo(name);
		return info ? info.location : null;
	},

	/**
	 * Returns the cached uniform location object, assuming it exists
	 * and is active. Note that uniforms may be inactive if 
	 * the GLSL compiler deemed them unused.
	 *
	 * @method  getUniformLocation
	 * @param  {String} name the uniform name as defined in GLSL
	 * @return {WebGLUniformLocation} the location object
	 */
	getUniformLocation: function(name) {
		var info = this.getUniformInfo(name);
		return info ? info.location : null;
	},

	/**
	 * Returns true if the uniform is active and found in this
	 * compiled program. Note that uniforms may be inactive if 
	 * the GLSL compiler deemed them unused.
	 *
	 * @method  hasUniform
	 * @param  {String}  name the uniform name
	 * @return {Boolean} true if the uniform is found and active
	 */
	hasUniform: function(name) {
		return this.getUniformInfo(name) !== null;
	},

	/**
	 * Returns true if the attribute is active and found in this
	 * compiled program.
	 *
	 * @method  hasAttribute
	 * @param  {String}  name the attribute name
	 * @return {Boolean} true if the attribute is found and active
	 */
	hasAttribute: function(name) {
		return this.getAttributeInfo(name) !== null;
	},

	/**
	 * Returns the uniform value by name.
	 *
	 * @method  getUniform
	 * @param  {String} name the uniform name as defined in GLSL
	 * @return {any} The value of the WebGL uniform
	 */
	getUniform: function(name) {
		return this.gl.getUniform(this.program, this.getUniformLocation(name));
	},

	/**
	 * Returns the uniform value at the specified WebGLUniformLocation.
	 *
	 * @method  getUniformAt
	 * @param  {WebGLUniformLocation} location the location object
	 * @return {any} The value of the WebGL uniform
	 */
	getUniformAt: function(location) {
		return this.gl.getUniform(this.program, location);
	},

	/**
	 * A convenience method to set uniformi from the given arguments.
	 * We determine which GL call to make based on the number of arguments
	 * passed. For example, `setUniformi("var", 0, 1)` maps to `gl.uniform2i`.
	 * 
	 * @method  setUniformi
	 * @param {String} name        		the name of the uniform
	 * @param {GLint} x  the x component for ints
	 * @param {GLint} y  the y component for ivec2
	 * @param {GLint} z  the z component for ivec3
	 * @param {GLint} w  the w component for ivec4
	 */
	setUniformi: function(name, x, y, z, w) {
		var gl = this.gl;
		var loc = this.getUniformLocation(name);
		if (!loc) 
			return false;
		switch (arguments.length) {
			case 2: gl.uniform1i(loc, x); return true;
			case 3: gl.uniform2i(loc, x, y); return true;
			case 4: gl.uniform3i(loc, x, y, z); return true;
			case 5: gl.uniform4i(loc, x, y, z, w); return true;
			default:
				throw "invalid arguments to setUniformi"; 
		}
	},

	/**
	 * A convenience method to set uniformf from the given arguments.
	 * We determine which GL call to make based on the number of arguments
	 * passed. For example, `setUniformf("var", 0, 1)` maps to `gl.uniform2f`.
	 * 
	 * @method  setUniformf
	 * @param {String} name        		the name of the uniform
	 * @param {GLfloat} x  the x component for floats
	 * @param {GLfloat} y  the y component for vec2
	 * @param {GLfloat} z  the z component for vec3
	 * @param {GLfloat} w  the w component for vec4
	 */
	setUniformf: function(name, x, y, z, w) {
		var gl = this.gl;
		var loc = this.getUniformLocation(name);
		if (!loc) 
			return false;
		switch (arguments.length) {
			case 2: gl.uniform1f(loc, x); return true;
			case 3: gl.uniform2f(loc, x, y); return true;
			case 4: gl.uniform3f(loc, x, y, z); return true;
			case 5: gl.uniform4f(loc, x, y, z, w); return true;
			default:
				throw "invalid arguments to setUniformf"; 
		}
	},

	//I guess we won't support sequence<GLfloat> .. whatever that is ??
	

	///// 
	
	/**
	 * A convenience method to set uniformNfv from the given ArrayBuffer.
	 * We determine which GL call to make based on the length of the array 
	 * buffer (for 1-4 component vectors stored in a Float32Array). To use
	 * this method to upload data to uniform arrays, you need to specify the
	 * 'count' parameter; i.e. the data type you are using for that array. If
	 * specified, this will dictate whether to call uniform1fv, uniform2fv, etc.
	 *
	 * @method  setUniformfv
	 * @param {String} name        		the name of the uniform
	 * @param {ArrayBuffer} arrayBuffer the array buffer
	 * @param {Number} count            optional, the explicit data type count, e.g. 2 for vec2
	 */
	setUniformfv: function(name, arrayBuffer, count) {
		count = count || arrayBuffer.length;
		var gl = this.gl;
		var loc = this.getUniformLocation(name);
		if (!loc) 
			return false;
		switch (count) {
			case 1: gl.uniform1fv(loc, arrayBuffer); return true;
			case 2: gl.uniform2fv(loc, arrayBuffer); return true;
			case 3: gl.uniform3fv(loc, arrayBuffer); return true;
			case 4: gl.uniform4fv(loc, arrayBuffer); return true;
			default:
				throw "invalid arguments to setUniformf"; 
		}
	},

	/**
	 * A convenience method to set uniformNiv from the given ArrayBuffer.
	 * We determine which GL call to make based on the length of the array 
	 * buffer (for 1-4 component vectors stored in a int array). To use
	 * this method to upload data to uniform arrays, you need to specify the
	 * 'count' parameter; i.e. the data type you are using for that array. If
	 * specified, this will dictate whether to call uniform1fv, uniform2fv, etc.
	 *
	 * @method  setUniformiv
	 * @param {String} name        		the name of the uniform
	 * @param {ArrayBuffer} arrayBuffer the array buffer
	 * @param {Number} count            optional, the explicit data type count, e.g. 2 for ivec2
	 */
	setUniformiv: function(name, arrayBuffer, count) {
		count = count || arrayBuffer.length;
		var gl = this.gl;
		var loc = this.getUniformLocation(name);
		if (!loc) 
			return false;
		switch (count) {
			case 1: gl.uniform1iv(loc, arrayBuffer); return true;
			case 2: gl.uniform2iv(loc, arrayBuffer); return true;
			case 3: gl.uniform3iv(loc, arrayBuffer); return true;
			case 4: gl.uniform4iv(loc, arrayBuffer); return true;
			default:
				throw "invalid arguments to setUniformf"; 
		}
	},

	/**
	 * This is a convenience function to pass a Matrix3 (from vecmath,
	 * kami's preferred math library) or a Float32Array (e.g. gl-matrix)
	 * to a shader. If mat is an object with "val", it is considered to be
	 * a Matrix3, otherwise assumed to be a typed array being passed directly
	 * to the shader.
	 * 
	 * @param {String} name the uniform name
	 * @param {Matrix3|Float32Array} mat a Matrix3 or Float32Array
	 * @param {Boolean} transpose whether to transpose the matrix, default false
	 */
	setUniformMatrix3: function(name, mat, transpose) {
		var arr = typeof mat === "object" && mat.val ? mat.val : mat;
		transpose = !!transpose; //to boolean

		var gl = this.gl;
		var loc = this.getUniformLocation(name);
		if (!loc) 
			return false;
		gl.uniformMatrix3fv(loc, transpose, arr)
	},

	/**
	 * This is a convenience function to pass a Matrix4 (from vecmath,
	 * kami's preferred math library) or a Float32Array (e.g. gl-matrix)
	 * to a shader. If mat is an object with "val", it is considered to be
	 * a Matrix4, otherwise assumed to be a typed array being passed directly
	 * to the shader.
	 * 
	 * @param {String} name the uniform name
	 * @param {Matrix4|Float32Array} mat a Matrix4 or Float32Array
	 * @param {Boolean} transpose whether to transpose the matrix, default false
	 */
	setUniformMatrix4: function(name, mat, transpose) {
		var arr = typeof mat === "object" && mat.val ? mat.val : mat;
		transpose = !!transpose; //to boolean

		var gl = this.gl;
		var loc = this.getUniformLocation(name);
		if (!loc) 
			return false;
		gl.uniformMatrix4fv(loc, transpose, arr)
	} 
 
});

//Some default attribute names that parts of kami will use
//when creating a standard shader.
ShaderProgram.POSITION_ATTRIBUTE = "Position";
ShaderProgram.NORMAL_ATTRIBUTE = "Normal";
ShaderProgram.COLOR_ATTRIBUTE = "Color";
ShaderProgram.TEXCOORD_ATTRIBUTE = "TexCoord";

module.exports = ShaderProgram;
},{"klasse":41}],40:[function(require,module,exports){
/**
  Auto-generated Kami index file.
  Created on 2014-03-02.
*/
module.exports = {
    //core classes
    'BaseBatch':       require('./BaseBatch.js'),
    'SpriteBatch':     require('./SpriteBatch.js'),
    'Texture':         require('./Texture.js'),
    'TextureRegion':   require('./TextureRegion.js'),
    'WebGLContext':    require('./WebGLContext.js'),
    'FrameBuffer':     require('./glutils/FrameBuffer.js'),
    'Mesh':            require('./glutils/Mesh.js'),
    'ShaderProgram':   require('./glutils/ShaderProgram.js')
};
},{"./BaseBatch.js":32,"./SpriteBatch.js":33,"./Texture.js":34,"./TextureRegion.js":35,"./WebGLContext.js":36,"./glutils/FrameBuffer.js":37,"./glutils/Mesh.js":38,"./glutils/ShaderProgram.js":39}],41:[function(require,module,exports){
module.exports=require(22)
},{}],42:[function(require,module,exports){
var int8 = new Int8Array(4);
var int32 = new Int32Array(int8.buffer, 0, 1);
var float32 = new Float32Array(int8.buffer, 0, 1);

/**
 * A singleton for number utilities. 
 * @class NumberUtil
 */
var NumberUtil = function() {

};


/**
 * Returns a float representation of the given int bits. ArrayBuffer
 * is used for the conversion.
 *
 * @method  intBitsToFloat
 * @static
 * @param  {Number} i the int to cast
 * @return {Number}   the float
 */
NumberUtil.intBitsToFloat = function(i) {
	int32[0] = i;
	return float32[0];
};

/**
 * Returns the int bits from the given float. ArrayBuffer is used
 * for the conversion.
 *
 * @method  floatToIntBits
 * @static
 * @param  {Number} f the float to cast
 * @return {Number}   the int bits
 */
NumberUtil.floatToIntBits = function(f) {
	float32[0] = f;
	return int32[0];
};

/**
 * Encodes ABGR int as a float, with slight precision loss.
 *
 * @method  intToFloatColor
 * @static
 * @param {Number} value an ABGR packed integer
 */
NumberUtil.intToFloatColor = function(value) {
	return NumberUtil.intBitsToFloat( value & 0xfeffffff );
};

/**
 * Returns a float encoded ABGR value from the given RGBA
 * bytes (0 - 255). Useful for saving bandwidth in vertex data.
 *
 * @method  colorToFloat
 * @static
 * @param {Number} r the Red byte (0 - 255)
 * @param {Number} g the Green byte (0 - 255)
 * @param {Number} b the Blue byte (0 - 255)
 * @param {Number} a the Alpha byte (0 - 255)
 * @return {Float32}  a Float32 of the RGBA color
 */
NumberUtil.colorToFloat = function(r, g, b, a) {
	var bits = (a << 24 | b << 16 | g << 8 | r);
	return NumberUtil.intToFloatColor(bits);
};

/**
 * Returns true if the number is a power-of-two.
 *
 * @method  isPowerOfTwo
 * @param  {Number}  n the number to test
 * @return {Boolean}   true if power-of-two
 */
NumberUtil.isPowerOfTwo = function(n) {
	return (n & (n - 1)) == 0;
};

/**
 * Returns the next highest power-of-two from the specified number. 
 * 
 * @param  {Number} n the number to test
 * @return {Number}   the next highest power of two
 */
NumberUtil.nextPowerOfTwo = function(n) {
	n--;
	n |= n >> 1;
	n |= n >> 2;
	n |= n >> 4;
	n |= n >> 8;
	n |= n >> 16;
	return n+1;
};

module.exports = NumberUtil;
},{}],43:[function(require,module,exports){
/*jslint onevar:true, undef:true, newcap:true, regexp:true, bitwise:true, maxerr:50, indent:4, white:false, nomen:false, plusplus:false */
/*global define:false, require:false, exports:false, module:false, signals:false */

/** @license
 * JS Signals <http://millermedeiros.github.com/js-signals/>
 * Released under the MIT license
 * Author: Miller Medeiros
 * Version: 1.0.0 - Build: 268 (2012/11/29 05:48 PM)
 */

(function(global){

    // SignalBinding -------------------------------------------------
    //================================================================

    /**
     * Object that represents a binding between a Signal and a listener function.
     * <br />- <strong>This is an internal constructor and shouldn't be called by regular users.</strong>
     * <br />- inspired by Joa Ebert AS3 SignalBinding and Robert Penner's Slot classes.
     * @author Miller Medeiros
     * @constructor
     * @internal
     * @name SignalBinding
     * @param {Signal} signal Reference to Signal object that listener is currently bound to.
     * @param {Function} listener Handler function bound to the signal.
     * @param {boolean} isOnce If binding should be executed just once.
     * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
     * @param {Number} [priority] The priority level of the event listener. (default = 0).
     */
    function SignalBinding(signal, listener, isOnce, listenerContext, priority) {

        /**
         * Handler function bound to the signal.
         * @type Function
         * @private
         */
        this._listener = listener;

        /**
         * If binding should be executed just once.
         * @type boolean
         * @private
         */
        this._isOnce = isOnce;

        /**
         * Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @memberOf SignalBinding.prototype
         * @name context
         * @type Object|undefined|null
         */
        this.context = listenerContext;

        /**
         * Reference to Signal object that listener is currently bound to.
         * @type Signal
         * @private
         */
        this._signal = signal;

        /**
         * Listener priority
         * @type Number
         * @private
         */
        this._priority = priority || 0;
    }

    SignalBinding.prototype = {

        /**
         * If binding is active and should be executed.
         * @type boolean
         */
        active : true,

        /**
         * Default parameters passed to listener during `Signal.dispatch` and `SignalBinding.execute`. (curried parameters)
         * @type Array|null
         */
        params : null,

        /**
         * Call listener passing arbitrary parameters.
         * <p>If binding was added using `Signal.addOnce()` it will be automatically removed from signal dispatch queue, this method is used internally for the signal dispatch.</p>
         * @param {Array} [paramsArr] Array of parameters that should be passed to the listener
         * @return {*} Value returned by the listener.
         */
        execute : function (paramsArr) {
            var handlerReturn, params;
            if (this.active && !!this._listener) {
                params = this.params? this.params.concat(paramsArr) : paramsArr;
                handlerReturn = this._listener.apply(this.context, params);
                if (this._isOnce) {
                    this.detach();
                }
            }
            return handlerReturn;
        },

        /**
         * Detach binding from signal.
         * - alias to: mySignal.remove(myBinding.getListener());
         * @return {Function|null} Handler function bound to the signal or `null` if binding was previously detached.
         */
        detach : function () {
            return this.isBound()? this._signal.remove(this._listener, this.context) : null;
        },

        /**
         * @return {Boolean} `true` if binding is still bound to the signal and have a listener.
         */
        isBound : function () {
            return (!!this._signal && !!this._listener);
        },

        /**
         * @return {boolean} If SignalBinding will only be executed once.
         */
        isOnce : function () {
            return this._isOnce;
        },

        /**
         * @return {Function} Handler function bound to the signal.
         */
        getListener : function () {
            return this._listener;
        },

        /**
         * @return {Signal} Signal that listener is currently bound to.
         */
        getSignal : function () {
            return this._signal;
        },

        /**
         * Delete instance properties
         * @private
         */
        _destroy : function () {
            delete this._signal;
            delete this._listener;
            delete this.context;
        },

        /**
         * @return {string} String representation of the object.
         */
        toString : function () {
            return '[SignalBinding isOnce:' + this._isOnce +', isBound:'+ this.isBound() +', active:' + this.active + ']';
        }

    };


/*global SignalBinding:false*/

    // Signal --------------------------------------------------------
    //================================================================

    function validateListener(listener, fnName) {
        if (typeof listener !== 'function') {
            throw new Error( 'listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName) );
        }
    }

    /**
     * Custom event broadcaster
     * <br />- inspired by Robert Penner's AS3 Signals.
     * @name Signal
     * @author Miller Medeiros
     * @constructor
     */
    function Signal() {
        /**
         * @type Array.<SignalBinding>
         * @private
         */
        this._bindings = [];
        this._prevParams = null;

        // enforce dispatch to aways work on same context (#47)
        var self = this;
        this.dispatch = function(){
            Signal.prototype.dispatch.apply(self, arguments);
        };
    }

    Signal.prototype = {

        /**
         * Signals Version Number
         * @type String
         * @const
         */
        VERSION : '1.0.0',

        /**
         * If Signal should keep record of previously dispatched parameters and
         * automatically execute listener during `add()`/`addOnce()` if Signal was
         * already dispatched before.
         * @type boolean
         */
        memorize : false,

        /**
         * @type boolean
         * @private
         */
        _shouldPropagate : true,

        /**
         * If Signal is active and should broadcast events.
         * <p><strong>IMPORTANT:</strong> Setting this property during a dispatch will only affect the next dispatch, if you want to stop the propagation of a signal use `halt()` instead.</p>
         * @type boolean
         */
        active : true,

        /**
         * @param {Function} listener
         * @param {boolean} isOnce
         * @param {Object} [listenerContext]
         * @param {Number} [priority]
         * @return {SignalBinding}
         * @private
         */
        _registerListener : function (listener, isOnce, listenerContext, priority) {

            var prevIndex = this._indexOfListener(listener, listenerContext),
                binding;

            if (prevIndex !== -1) {
                binding = this._bindings[prevIndex];
                if (binding.isOnce() !== isOnce) {
                    throw new Error('You cannot add'+ (isOnce? '' : 'Once') +'() then add'+ (!isOnce? '' : 'Once') +'() the same listener without removing the relationship first.');
                }
            } else {
                binding = new SignalBinding(this, listener, isOnce, listenerContext, priority);
                this._addBinding(binding);
            }

            if(this.memorize && this._prevParams){
                binding.execute(this._prevParams);
            }

            return binding;
        },

        /**
         * @param {SignalBinding} binding
         * @private
         */
        _addBinding : function (binding) {
            //simplified insertion sort
            var n = this._bindings.length;
            do { --n; } while (this._bindings[n] && binding._priority <= this._bindings[n]._priority);
            this._bindings.splice(n + 1, 0, binding);
        },

        /**
         * @param {Function} listener
         * @return {number}
         * @private
         */
        _indexOfListener : function (listener, context) {
            var n = this._bindings.length,
                cur;
            while (n--) {
                cur = this._bindings[n];
                if (cur._listener === listener && cur.context === context) {
                    return n;
                }
            }
            return -1;
        },

        /**
         * Check if listener was attached to Signal.
         * @param {Function} listener
         * @param {Object} [context]
         * @return {boolean} if Signal has the specified listener.
         */
        has : function (listener, context) {
            return this._indexOfListener(listener, context) !== -1;
        },

        /**
         * Add a listener to the signal.
         * @param {Function} listener Signal handler function.
         * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
         * @return {SignalBinding} An Object representing the binding between the Signal and listener.
         */
        add : function (listener, listenerContext, priority) {
            validateListener(listener, 'add');
            return this._registerListener(listener, false, listenerContext, priority);
        },

        /**
         * Add listener to the signal that should be removed after first execution (will be executed only once).
         * @param {Function} listener Signal handler function.
         * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
         * @return {SignalBinding} An Object representing the binding between the Signal and listener.
         */
        addOnce : function (listener, listenerContext, priority) {
            validateListener(listener, 'addOnce');
            return this._registerListener(listener, true, listenerContext, priority);
        },

        /**
         * Remove a single listener from the dispatch queue.
         * @param {Function} listener Handler function that should be removed.
         * @param {Object} [context] Execution context (since you can add the same handler multiple times if executing in a different context).
         * @return {Function} Listener handler function.
         */
        remove : function (listener, context) {
            validateListener(listener, 'remove');

            var i = this._indexOfListener(listener, context);
            if (i !== -1) {
                this._bindings[i]._destroy(); //no reason to a SignalBinding exist if it isn't attached to a signal
                this._bindings.splice(i, 1);
            }
            return listener;
        },

        /**
         * Remove all listeners from the Signal.
         */
        removeAll : function () {
            var n = this._bindings.length;
            while (n--) {
                this._bindings[n]._destroy();
            }
            this._bindings.length = 0;
        },

        /**
         * @return {number} Number of listeners attached to the Signal.
         */
        getNumListeners : function () {
            return this._bindings.length;
        },

        /**
         * Stop propagation of the event, blocking the dispatch to next listeners on the queue.
         * <p><strong>IMPORTANT:</strong> should be called only during signal dispatch, calling it before/after dispatch won't affect signal broadcast.</p>
         * @see Signal.prototype.disable
         */
        halt : function () {
            this._shouldPropagate = false;
        },

        /**
         * Dispatch/Broadcast Signal to all listeners added to the queue.
         * @param {...*} [params] Parameters that should be passed to each handler.
         */
        dispatch : function (params) {
            if (! this.active) {
                return;
            }

            var paramsArr = Array.prototype.slice.call(arguments),
                n = this._bindings.length,
                bindings;

            if (this.memorize) {
                this._prevParams = paramsArr;
            }

            if (! n) {
                //should come after memorize
                return;
            }

            bindings = this._bindings.slice(); //clone array in case add/remove items during dispatch
            this._shouldPropagate = true; //in case `halt` was called before dispatch or during the previous dispatch.

            //execute all callbacks until end of the list or until a callback returns `false` or stops propagation
            //reverse loop since listeners with higher priority will be added at the end of the list
            do { n--; } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false);
        },

        /**
         * Forget memorized arguments.
         * @see Signal.memorize
         */
        forget : function(){
            this._prevParams = null;
        },

        /**
         * Remove all bindings from signal and destroy any reference to external objects (destroy Signal object).
         * <p><strong>IMPORTANT:</strong> calling any method on the signal instance after calling dispose will throw errors.</p>
         */
        dispose : function () {
            this.removeAll();
            delete this._bindings;
            delete this._prevParams;
        },

        /**
         * @return {string} String representation of the object.
         */
        toString : function () {
            return '[Signal active:'+ this.active +' numListeners:'+ this.getNumListeners() +']';
        }

    };


    // Namespace -----------------------------------------------------
    //================================================================

    /**
     * Signals namespace
     * @namespace
     * @name signals
     */
    var signals = Signal;

    /**
     * Custom event broadcaster
     * @see Signal
     */
    // alias for backwards compatibility (see #gh-44)
    signals.Signal = Signal;



    //exports to multiple environments
    if(typeof define === 'function' && define.amd){ //AMD
        define(function () { return signals; });
    } else if (typeof module !== 'undefined' && module.exports){ //node
        module.exports = signals;
    } else { //browser
        //use string because of Google closure compiler ADVANCED_MODE
        /*jslint sub:true */
        global['signals'] = signals;
    }

}(this));

},{}],44:[function(require,module,exports){
module.exports=require(22)
},{}],45:[function(require,module,exports){
module.exports={"version": "1.3.3"}
},{}],46:[function(require,module,exports){
/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 * 
 * All rights reserved.
 * 
 * Distributed under the 3-clause BSD License, see LICENSE.txt
 */

/* jshint maxcomplexity:11 */

"use strict";


/*
 * Note
 * ====
 * the structure of this JavaScript version of poly2tri intentionally follows
 * as closely as possible the structure of the reference C++ version, to make it 
 * easier to keep the 2 versions in sync.
 */


// -------------------------------------------------------------------------Node

/**
 * Advancing front node
 * @param {Point} p any "Point like" object with {x,y} (duck typing)
 * @param {Triangle} t triangle (optionnal)
 */
var Node = function(p, t) {
    this.point = p;
    this.triangle = t || null;

    this.next = null; // Node
    this.prev = null; // Node

    this.value = p.x;
};

// ---------------------------------------------------------------AdvancingFront
var AdvancingFront = function(head, tail) {
    this.head_ = head; // Node
    this.tail_ = tail; // Node
    this.search_node_ = head; // Node
};

AdvancingFront.prototype.head = function() {
    return this.head_;
};

AdvancingFront.prototype.setHead = function(node) {
    this.head_ = node;
};

AdvancingFront.prototype.tail = function() {
    return this.tail_;
};

AdvancingFront.prototype.setTail = function(node) {
    this.tail_ = node;
};

AdvancingFront.prototype.search = function() {
    return this.search_node_;
};

AdvancingFront.prototype.setSearch = function(node) {
    this.search_node_ = node;
};

AdvancingFront.prototype.findSearchNode = function(/*x*/) {
    // TODO: implement BST index
    return this.search_node_;
};

AdvancingFront.prototype.locateNode = function(x) {
    var node = this.search_node_;

    /* jshint boss:true */
    if (x < node.value) {
        while (node = node.prev) {
            if (x >= node.value) {
                this.search_node_ = node;
                return node;
            }
        }
    } else {
        while (node = node.next) {
            if (x < node.value) {
                this.search_node_ = node.prev;
                return node.prev;
            }
        }
    }
    return null;
};

AdvancingFront.prototype.locatePoint = function(point) {
    var px = point.x;
    var node = this.findSearchNode(px);
    var nx = node.point.x;

    if (px === nx) {
        // Here we are comparing point references, not values
        if (point !== node.point) {
            // We might have two nodes with same x value for a short time
            if (point === node.prev.point) {
                node = node.prev;
            } else if (point === node.next.point) {
                node = node.next;
            } else {
                throw new Error('poly2tri Invalid AdvancingFront.locatePoint() call');
            }
        }
    } else if (px < nx) {
        /* jshint boss:true */
        while (node = node.prev) {
            if (point === node.point) {
                break;
            }
        }
    } else {
        while (node = node.next) {
            if (point === node.point) {
                break;
            }
        }
    }

    if (node) {
        this.search_node_ = node;
    }
    return node;
};


// ----------------------------------------------------------------------Exports

module.exports = AdvancingFront;
module.exports.Node = Node;


},{}],47:[function(require,module,exports){
/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 * 
 * All rights reserved.
 * 
 * Distributed under the 3-clause BSD License, see LICENSE.txt
 */

"use strict";


/*
 * Note
 * ====
 * the structure of this JavaScript version of poly2tri intentionally follows
 * as closely as possible the structure of the reference C++ version, to make it 
 * easier to keep the 2 versions in sync.
 */

var xy = require('./xy');

// ------------------------------------------------------------------------Point
/**
 * Construct a point
 * @param {Number} x    coordinate (0 if undefined)
 * @param {Number} y    coordinate (0 if undefined)
 */
var Point = function(x, y) {
    this.x = +x || 0;
    this.y = +y || 0;

    // All extra fields added to Point are prefixed with _p2t_
    // to avoid collisions if custom Point class is used.

    // The edges this point constitutes an upper ending point
    this._p2t_edge_list = null;
};

/**
 * For pretty printing ex. <i>"(5;42)"</i>)
 */
Point.prototype.toString = function() {
    return xy.toStringBase(this);
};

/**
 * Creates a copy of this Point object.
 * @returns Point
 */
Point.prototype.clone = function() {
    return new Point(this.x, this.y);
};

/**
 * Set this Point instance to the origo. <code>(0; 0)</code>
 */
Point.prototype.set_zero = function() {
    this.x = 0.0;
    this.y = 0.0;
    return this; // for chaining
};

/**
 * Set the coordinates of this instance.
 * @param   x   number.
 * @param   y   number;
 */
Point.prototype.set = function(x, y) {
    this.x = +x || 0;
    this.y = +y || 0;
    return this; // for chaining
};

/**
 * Negate this Point instance. (component-wise)
 */
Point.prototype.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    return this; // for chaining
};

/**
 * Add another Point object to this instance. (component-wise)
 * @param   n   Point object.
 */
Point.prototype.add = function(n) {
    this.x += n.x;
    this.y += n.y;
    return this; // for chaining
};

/**
 * Subtract this Point instance with another point given. (component-wise)
 * @param   n   Point object.
 */
Point.prototype.sub = function(n) {
    this.x -= n.x;
    this.y -= n.y;
    return this; // for chaining
};

/**
 * Multiply this Point instance by a scalar. (component-wise)
 * @param   s   scalar.
 */
Point.prototype.mul = function(s) {
    this.x *= s;
    this.y *= s;
    return this; // for chaining
};

/**
 * Return the distance of this Point instance from the origo.
 */
Point.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

/**
 * Normalize this Point instance (as a vector).
 * @return The original distance of this instance from the origo.
 */
Point.prototype.normalize = function() {
    var len = this.length();
    this.x /= len;
    this.y /= len;
    return len;
};

/**
 * Test this Point object with another for equality.
 * @param   p   any "Point like" object with {x,y} (duck typing)
 * @return <code>True</code> if <code>this == p</code>, <code>false</code> otherwise.
 */
Point.prototype.equals = function(p) {
    return this.x === p.x && this.y === p.y;
};


// -----------------------------------------------------Point ("static" methods)

/**
 * Negate a point component-wise and return the result as a new Point object.
 * @param   p   Point object.
 * @return the resulting Point object.
 */
Point.negate = function(p) {
    return new Point(-p.x, -p.y);
};

/**
 * Add two points component-wise and return the result as a new Point object.
 * @param   a   Point object.
 * @param   b   Point object.
 * @return the resulting Point object.
 */
Point.add = function(a, b) {
    return new Point(a.x + b.x, a.y + b.y);
};

/**
 * Subtract two points component-wise and return the result as a new Point object.
 * @param   a   Point object.
 * @param   b   Point object.
 * @return the resulting Point object.
 */
Point.sub = function(a, b) {
    return new Point(a.x - b.x, a.y - b.y);
};

/**
 * Multiply a point by a scalar and return the result as a new Point object.
 * @param   s   the scalar (a number).
 * @param   p   Point object.
 * @return the resulting Point object.
 */
Point.mul = function(s, p) {
    return new Point(s * p.x, s * p.y);
};

/**
 * Perform the cross product on either two points (this produces a scalar)
 * or a point and a scalar (this produces a point).
 * This function requires two parameters, either may be a Point object or a
 * number.
 * @param   a   Point object or scalar.
 * @param   b   Point object or scalar.
 * @return  a   Point object or a number, depending on the parameters.
 */
Point.cross = function(a, b) {
    if (typeof(a) === 'number') {
        if (typeof(b) === 'number') {
            return a * b;
        } else {
            return new Point(-a * b.y, a * b.x);
        }
    } else {
        if (typeof(b) === 'number') {
            return new Point(b * a.y, -b * a.x);
        } else {
            return a.x * b.y - a.y * b.x;
        }
    }
};


// -----------------------------------------------------------------"Point-Like"
/*
 * The following functions operate on "Point" or any "Point like" object 
 * with {x,y} (duck typing).
 */

Point.toString = xy.toString;
Point.compare = xy.compare;
Point.cmp = xy.compare; // backward compatibility
Point.equals = xy.equals;

/**
 * Peform the dot product on two vectors.
 * @param   a,b   any "Point like" objects with {x,y} 
 * @return The dot product (as a number).
 */
Point.dot = function(a, b) {
    return a.x * b.x + a.y * b.y;
};


// ---------------------------------------------------------Exports (public API)

module.exports = Point;

},{"./xy":54}],48:[function(require,module,exports){
/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 * 
 * All rights reserved.
 * 
 * Distributed under the 3-clause BSD License, see LICENSE.txt
 */

"use strict";

/*
 * Class added in the JavaScript version (was not present in the c++ version)
 */

var xy = require('./xy');

/**
 * Custom exception class to indicate invalid Point values
 * @param {String} message          error message
 * @param {array<Point>} points     invalid points
 */
var PointError = function(message, points) {
    this.name = "PointError";
    this.points = points = points || [];
    this.message = message || "Invalid Points!";
    for (var i = 0; i < points.length; i++) {
        this.message += " " + xy.toString(points[i]);
    }
};
PointError.prototype = new Error();
PointError.prototype.constructor = PointError;


module.exports = PointError;

},{"./xy":54}],49:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * * Neither the name of Poly2Tri nor the names of its contributors may be
 *   used to endorse or promote products derived from this software without specific
 *   prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

/*
 * Public API for poly2tri.js
 * ==========================
 */


/*
 * for Browser + <script> : 
 * return the poly2tri global variable to its previous value. 
 * (this feature is not automatically provided by browserify).
 */
var previousPoly2tri = global.poly2tri;
exports.noConflict = function() {
    global.poly2tri = previousPoly2tri;
    return exports;
};

exports.VERSION = require('../dist/version.json').version;

exports.PointError = require('./pointerror');
exports.Point = require('./point');
exports.Triangle = require('./triangle');
exports.SweepContext = require('./sweepcontext');


// Backward compatibility
var sweep = require('./sweep');
exports.triangulate = sweep.triangulate;
exports.sweep = {Triangulate: sweep.triangulate};

},{"../dist/version.json":45,"./point":47,"./pointerror":48,"./sweep":50,"./sweepcontext":51,"./triangle":52}],50:[function(require,module,exports){
/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 * 
 * All rights reserved.
 * 
 * Distributed under the 3-clause BSD License, see LICENSE.txt
 */

/* jshint latedef:nofunc, maxcomplexity:9 */

"use strict";


/*
 * Note
 * ====
 * the structure of this JavaScript version of poly2tri intentionally follows
 * as closely as possible the structure of the reference C++ version, to make it 
 * easier to keep the 2 versions in sync.
 *
 * This 'Sweep' module is present in order to keep this JavaScript version 
 * as close as possible to the reference C++ version, even though almost all
 * functions could be declared as methods on the SweepContext object.
 */

var PointError = require('./pointerror');
var Triangle = require('./triangle');
var Node = require('./advancingfront').Node;


// ------------------------------------------------------------------------utils

var utils = require('./utils');

var PI_3div4 = 3 * Math.PI / 4;
var PI_div2 = Math.PI / 2;
var EPSILON = utils.EPSILON;

var Orientation = utils.Orientation;
var orient2d = utils.orient2d;
var inScanArea = utils.inScanArea;


// ------------------------------------------------------------------------Sweep

/**
 * Triangulate the polygon with holes and Steiner points.
 * Do this AFTER you've added the polyline, holes, and Steiner points
 * @param   tcx SweepContext object.
 */
function triangulate(tcx) {
    tcx.initTriangulation();
    tcx.createAdvancingFront();
    // Sweep points; build mesh
    sweepPoints(tcx);
    // Clean up
    finalizationPolygon(tcx);
}

/**
 * Start sweeping the Y-sorted point set from bottom to top
 * @param   tcx SweepContext object.
 */
function sweepPoints(tcx) {
    var i, len = tcx.pointCount();
    for (i = 1; i < len; ++i) {
        var point = tcx.getPoint(i);
        var node = pointEvent(tcx, point);
        var edges = point._p2t_edge_list;
        for (var j = 0; edges && j < edges.length; ++j) {
            edgeEventByEdge(tcx, edges[j], node);
        }
    }
}

function finalizationPolygon(tcx) {
    // Get an Internal triangle to start with
    var t = tcx.front().head().next.triangle;
    var p = tcx.front().head().next.point;
    while (!t.getConstrainedEdgeCW(p)) {
        t = t.neighborCCW(p);
    }

    // Collect interior triangles constrained by edges
    tcx.meshClean(t);
}

/**
 * Find closes node to the left of the new point and
 * create a new triangle. If needed new holes and basins
 * will be filled to.
 */
function pointEvent(tcx, point) {
    var node = tcx.locateNode(point);
    var new_node = newFrontTriangle(tcx, point, node);

    // Only need to check +epsilon since point never have smaller
    // x value than node due to how we fetch nodes from the front
    if (point.x <= node.point.x + (EPSILON)) {
        fill(tcx, node);
    }

    //tcx.AddNode(new_node);

    fillAdvancingFront(tcx, new_node);
    return new_node;
}

function edgeEventByEdge(tcx, edge, node) {
    tcx.edge_event.constrained_edge = edge;
    tcx.edge_event.right = (edge.p.x > edge.q.x);

    if (isEdgeSideOfTriangle(node.triangle, edge.p, edge.q)) {
        return;
    }

    // For now we will do all needed filling
    // TODO: integrate with flip process might give some better performance
    //       but for now this avoid the issue with cases that needs both flips and fills
    fillEdgeEvent(tcx, edge, node);
    edgeEventByPoints(tcx, edge.p, edge.q, node.triangle, edge.q);
}

function edgeEventByPoints(tcx, ep, eq, triangle, point) {
    if (isEdgeSideOfTriangle(triangle, ep, eq)) {
        return;
    }

    var p1 = triangle.pointCCW(point);
    var o1 = orient2d(eq, p1, ep);
    if (o1 === Orientation.COLLINEAR) {
        // TODO integrate here changes from C++ version
        // (C++ repo revision 09880a869095 dated March 8, 2011)
        throw new PointError('poly2tri EdgeEvent: Collinear not supported!', [eq, p1, ep]);
    }

    var p2 = triangle.pointCW(point);
    var o2 = orient2d(eq, p2, ep);
    if (o2 === Orientation.COLLINEAR) {
        // TODO integrate here changes from C++ version
        // (C++ repo revision 09880a869095 dated March 8, 2011)
        throw new PointError('poly2tri EdgeEvent: Collinear not supported!', [eq, p2, ep]);
    }

    if (o1 === o2) {
        // Need to decide if we are rotating CW or CCW to get to a triangle
        // that will cross edge
        if (o1 === Orientation.CW) {
            triangle = triangle.neighborCCW(point);
        } else {
            triangle = triangle.neighborCW(point);
        }
        edgeEventByPoints(tcx, ep, eq, triangle, point);
    } else {
        // This triangle crosses constraint so lets flippin start!
        flipEdgeEvent(tcx, ep, eq, triangle, point);
    }
}

function isEdgeSideOfTriangle(triangle, ep, eq) {
    var index = triangle.edgeIndex(ep, eq);
    if (index !== -1) {
        triangle.markConstrainedEdgeByIndex(index);
        var t = triangle.getNeighbor(index);
        if (t) {
            t.markConstrainedEdgeByPoints(ep, eq);
        }
        return true;
    }
    return false;
}

/**
 * Creates a new front triangle and legalize it
 */
function newFrontTriangle(tcx, point, node) {
    var triangle = new Triangle(point, node.point, node.next.point);

    triangle.markNeighbor(node.triangle);
    tcx.addToMap(triangle);

    var new_node = new Node(point);
    new_node.next = node.next;
    new_node.prev = node;
    node.next.prev = new_node;
    node.next = new_node;

    if (!legalize(tcx, triangle)) {
        tcx.mapTriangleToNodes(triangle);
    }

    return new_node;
}

/**
 * Adds a triangle to the advancing front to fill a hole.
 * @param tcx
 * @param node - middle node, that is the bottom of the hole
 */
function fill(tcx, node) {
    var triangle = new Triangle(node.prev.point, node.point, node.next.point);

    // TODO: should copy the constrained_edge value from neighbor triangles
    //       for now constrained_edge values are copied during the legalize
    triangle.markNeighbor(node.prev.triangle);
    triangle.markNeighbor(node.triangle);

    tcx.addToMap(triangle);

    // Update the advancing front
    node.prev.next = node.next;
    node.next.prev = node.prev;


    // If it was legalized the triangle has already been mapped
    if (!legalize(tcx, triangle)) {
        tcx.mapTriangleToNodes(triangle);
    }

    //tcx.removeNode(node);
}

/**
 * Fills holes in the Advancing Front
 */
function fillAdvancingFront(tcx, n) {
    // Fill right holes
    var node = n.next;
    var angle;
    while (node.next) {
        // TODO integrate here changes from C++ version
        // (C++ repo revision acf81f1f1764 dated April 7, 2012)
        angle = holeAngle(node);
        if (angle > PI_div2 || angle < -(PI_div2)) {
            break;
        }
        fill(tcx, node);
        node = node.next;
    }

    // Fill left holes
    node = n.prev;
    while (node.prev) {
        // TODO integrate here changes from C++ version
        // (C++ repo revision acf81f1f1764 dated April 7, 2012)
        angle = holeAngle(node);
        if (angle > PI_div2 || angle < -(PI_div2)) {
            break;
        }
        fill(tcx, node);
        node = node.prev;
    }

    // Fill right basins
    if (n.next && n.next.next) {
        angle = basinAngle(n);
        if (angle < PI_3div4) {
            fillBasin(tcx, n);
        }
    }
}

/**
 * The basin angle is decided against the horizontal line [1,0]
 */
function basinAngle(node) {
    var ax = node.point.x - node.next.next.point.x;
    var ay = node.point.y - node.next.next.point.y;
    return Math.atan2(ay, ax);
}

/**
 *
 * @param node - middle node
 * @return the angle between 3 front nodes
 */
function holeAngle(node) {
    /* Complex plane
     * ab = cosA +i*sinA
     * ab = (ax + ay*i)(bx + by*i) = (ax*bx + ay*by) + i(ax*by-ay*bx)
     * atan2(y,x) computes the principal value of the argument function
     * applied to the complex number x+iy
     * Where x = ax*bx + ay*by
     *       y = ax*by - ay*bx
     */
    var ax = node.next.point.x - node.point.x;
    var ay = node.next.point.y - node.point.y;
    var bx = node.prev.point.x - node.point.x;
    var by = node.prev.point.y - node.point.y;
    return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

/**
 * Returns true if triangle was legalized
 */
function legalize(tcx, t) {
    // To legalize a triangle we start by finding if any of the three edges
    // violate the Delaunay condition
    for (var i = 0; i < 3; ++i) {
        if (t.delaunay_edge[i]) {
            continue;
        }
        var ot = t.getNeighbor(i);
        if (ot) {
            var p = t.getPoint(i);
            var op = ot.oppositePoint(t, p);
            var oi = ot.index(op);

            // If this is a Constrained Edge or a Delaunay Edge(only during recursive legalization)
            // then we should not try to legalize
            if (ot.constrained_edge[oi] || ot.delaunay_edge[oi]) {
                t.constrained_edge[i] = ot.constrained_edge[oi];
                continue;
            }

            var inside = inCircle(p, t.pointCCW(p), t.pointCW(p), op);
            if (inside) {
                // Lets mark this shared edge as Delaunay
                t.delaunay_edge[i] = true;
                ot.delaunay_edge[oi] = true;

                // Lets rotate shared edge one vertex CW to legalize it
                rotateTrianglePair(t, p, ot, op);

                // We now got one valid Delaunay Edge shared by two triangles
                // This gives us 4 new edges to check for Delaunay

                // Make sure that triangle to node mapping is done only one time for a specific triangle
                var not_legalized = !legalize(tcx, t);
                if (not_legalized) {
                    tcx.mapTriangleToNodes(t);
                }

                not_legalized = !legalize(tcx, ot);
                if (not_legalized) {
                    tcx.mapTriangleToNodes(ot);
                }
                // Reset the Delaunay edges, since they only are valid Delaunay edges
                // until we add a new triangle or point.
                // XXX: need to think about this. Can these edges be tried after we
                //      return to previous recursive level?
                t.delaunay_edge[i] = false;
                ot.delaunay_edge[oi] = false;

                // If triangle have been legalized no need to check the other edges since
                // the recursive legalization will handles those so we can end here.
                return true;
            }
        }
    }
    return false;
}

/**
 * <b>Requirement</b>:<br>
 * 1. a,b and c form a triangle.<br>
 * 2. a and d is know to be on opposite side of bc<br>
 * <pre>
 *                a
 *                +
 *               / \
 *              /   \
 *            b/     \c
 *            +-------+
 *           /    d    \
 *          /           \
 * </pre>
 * <b>Fact</b>: d has to be in area B to have a chance to be inside the circle formed by
 *  a,b and c<br>
 *  d is outside B if orient2d(a,b,d) or orient2d(c,a,d) is CW<br>
 *  This preknowledge gives us a way to optimize the incircle test
 * @param pa - triangle point, opposite d
 * @param pb - triangle point
 * @param pc - triangle point
 * @param pd - point opposite a
 * @return true if d is inside circle, false if on circle edge
 */
function inCircle(pa, pb, pc, pd) {
    var adx = pa.x - pd.x;
    var ady = pa.y - pd.y;
    var bdx = pb.x - pd.x;
    var bdy = pb.y - pd.y;

    var adxbdy = adx * bdy;
    var bdxady = bdx * ady;
    var oabd = adxbdy - bdxady;
    if (oabd <= 0) {
        return false;
    }

    var cdx = pc.x - pd.x;
    var cdy = pc.y - pd.y;

    var cdxady = cdx * ady;
    var adxcdy = adx * cdy;
    var ocad = cdxady - adxcdy;
    if (ocad <= 0) {
        return false;
    }

    var bdxcdy = bdx * cdy;
    var cdxbdy = cdx * bdy;

    var alift = adx * adx + ady * ady;
    var blift = bdx * bdx + bdy * bdy;
    var clift = cdx * cdx + cdy * cdy;

    var det = alift * (bdxcdy - cdxbdy) + blift * ocad + clift * oabd;
    return det > 0;
}

/**
 * Rotates a triangle pair one vertex CW
 *<pre>
 *       n2                    n2
 *  P +-----+             P +-----+
 *    | t  /|               |\  t |
 *    |   / |               | \   |
 *  n1|  /  |n3           n1|  \  |n3
 *    | /   |    after CW   |   \ |
 *    |/ oT |               | oT \|
 *    +-----+ oP            +-----+
 *       n4                    n4
 * </pre>
 */
function rotateTrianglePair(t, p, ot, op) {
    var n1, n2, n3, n4;
    n1 = t.neighborCCW(p);
    n2 = t.neighborCW(p);
    n3 = ot.neighborCCW(op);
    n4 = ot.neighborCW(op);

    var ce1, ce2, ce3, ce4;
    ce1 = t.getConstrainedEdgeCCW(p);
    ce2 = t.getConstrainedEdgeCW(p);
    ce3 = ot.getConstrainedEdgeCCW(op);
    ce4 = ot.getConstrainedEdgeCW(op);

    var de1, de2, de3, de4;
    de1 = t.getDelaunayEdgeCCW(p);
    de2 = t.getDelaunayEdgeCW(p);
    de3 = ot.getDelaunayEdgeCCW(op);
    de4 = ot.getDelaunayEdgeCW(op);

    t.legalize(p, op);
    ot.legalize(op, p);

    // Remap delaunay_edge
    ot.setDelaunayEdgeCCW(p, de1);
    t.setDelaunayEdgeCW(p, de2);
    t.setDelaunayEdgeCCW(op, de3);
    ot.setDelaunayEdgeCW(op, de4);

    // Remap constrained_edge
    ot.setConstrainedEdgeCCW(p, ce1);
    t.setConstrainedEdgeCW(p, ce2);
    t.setConstrainedEdgeCCW(op, ce3);
    ot.setConstrainedEdgeCW(op, ce4);

    // Remap neighbors
    // XXX: might optimize the markNeighbor by keeping track of
    //      what side should be assigned to what neighbor after the
    //      rotation. Now mark neighbor does lots of testing to find
    //      the right side.
    t.clearNeigbors();
    ot.clearNeigbors();
    if (n1) {
        ot.markNeighbor(n1);
    }
    if (n2) {
        t.markNeighbor(n2);
    }
    if (n3) {
        t.markNeighbor(n3);
    }
    if (n4) {
        ot.markNeighbor(n4);
    }
    t.markNeighbor(ot);
}

/**
 * Fills a basin that has formed on the Advancing Front to the right
 * of given node.<br>
 * First we decide a left,bottom and right node that forms the
 * boundaries of the basin. Then we do a reqursive fill.
 *
 * @param tcx
 * @param node - starting node, this or next node will be left node
 */
function fillBasin(tcx, node) {
    if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
        tcx.basin.left_node = node.next.next;
    } else {
        tcx.basin.left_node = node.next;
    }

    // Find the bottom and right node
    tcx.basin.bottom_node = tcx.basin.left_node;
    while (tcx.basin.bottom_node.next && tcx.basin.bottom_node.point.y >= tcx.basin.bottom_node.next.point.y) {
        tcx.basin.bottom_node = tcx.basin.bottom_node.next;
    }
    if (tcx.basin.bottom_node === tcx.basin.left_node) {
        // No valid basin
        return;
    }

    tcx.basin.right_node = tcx.basin.bottom_node;
    while (tcx.basin.right_node.next && tcx.basin.right_node.point.y < tcx.basin.right_node.next.point.y) {
        tcx.basin.right_node = tcx.basin.right_node.next;
    }
    if (tcx.basin.right_node === tcx.basin.bottom_node) {
        // No valid basins
        return;
    }

    tcx.basin.width = tcx.basin.right_node.point.x - tcx.basin.left_node.point.x;
    tcx.basin.left_highest = tcx.basin.left_node.point.y > tcx.basin.right_node.point.y;

    fillBasinReq(tcx, tcx.basin.bottom_node);
}

/**
 * Recursive algorithm to fill a Basin with triangles
 *
 * @param tcx
 * @param node - bottom_node
 */
function fillBasinReq(tcx, node) {
    // if shallow stop filling
    if (isShallow(tcx, node)) {
        return;
    }

    fill(tcx, node);

    var o;
    if (node.prev === tcx.basin.left_node && node.next === tcx.basin.right_node) {
        return;
    } else if (node.prev === tcx.basin.left_node) {
        o = orient2d(node.point, node.next.point, node.next.next.point);
        if (o === Orientation.CW) {
            return;
        }
        node = node.next;
    } else if (node.next === tcx.basin.right_node) {
        o = orient2d(node.point, node.prev.point, node.prev.prev.point);
        if (o === Orientation.CCW) {
            return;
        }
        node = node.prev;
    } else {
        // Continue with the neighbor node with lowest Y value
        if (node.prev.point.y < node.next.point.y) {
            node = node.prev;
        } else {
            node = node.next;
        }
    }

    fillBasinReq(tcx, node);
}

function isShallow(tcx, node) {
    var height;
    if (tcx.basin.left_highest) {
        height = tcx.basin.left_node.point.y - node.point.y;
    } else {
        height = tcx.basin.right_node.point.y - node.point.y;
    }

    // if shallow stop filling
    if (tcx.basin.width > height) {
        return true;
    }
    return false;
}

function fillEdgeEvent(tcx, edge, node) {
    if (tcx.edge_event.right) {
        fillRightAboveEdgeEvent(tcx, edge, node);
    } else {
        fillLeftAboveEdgeEvent(tcx, edge, node);
    }
}

function fillRightAboveEdgeEvent(tcx, edge, node) {
    while (node.next.point.x < edge.p.x) {
        // Check if next node is below the edge
        if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
            fillRightBelowEdgeEvent(tcx, edge, node);
        } else {
            node = node.next;
        }
    }
}

function fillRightBelowEdgeEvent(tcx, edge, node) {
    if (node.point.x < edge.p.x) {
        if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
            // Concave
            fillRightConcaveEdgeEvent(tcx, edge, node);
        } else {
            // Convex
            fillRightConvexEdgeEvent(tcx, edge, node);
            // Retry this one
            fillRightBelowEdgeEvent(tcx, edge, node);
        }
    }
}

function fillRightConcaveEdgeEvent(tcx, edge, node) {
    fill(tcx, node.next);
    if (node.next.point !== edge.p) {
        // Next above or below edge?
        if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
            // Below
            if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
                // Next is concave
                fillRightConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Next is convex
                /* jshint noempty:false */
            }
        }
    }
}

function fillRightConvexEdgeEvent(tcx, edge, node) {
    // Next concave or convex?
    if (orient2d(node.next.point, node.next.next.point, node.next.next.next.point) === Orientation.CCW) {
        // Concave
        fillRightConcaveEdgeEvent(tcx, edge, node.next);
    } else {
        // Convex
        // Next above or below edge?
        if (orient2d(edge.q, node.next.next.point, edge.p) === Orientation.CCW) {
            // Below
            fillRightConvexEdgeEvent(tcx, edge, node.next);
        } else {
            // Above
            /* jshint noempty:false */
        }
    }
}

function fillLeftAboveEdgeEvent(tcx, edge, node) {
    while (node.prev.point.x > edge.p.x) {
        // Check if next node is below the edge
        if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
            fillLeftBelowEdgeEvent(tcx, edge, node);
        } else {
            node = node.prev;
        }
    }
}

function fillLeftBelowEdgeEvent(tcx, edge, node) {
    if (node.point.x > edge.p.x) {
        if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
            // Concave
            fillLeftConcaveEdgeEvent(tcx, edge, node);
        } else {
            // Convex
            fillLeftConvexEdgeEvent(tcx, edge, node);
            // Retry this one
            fillLeftBelowEdgeEvent(tcx, edge, node);
        }
    }
}

function fillLeftConvexEdgeEvent(tcx, edge, node) {
    // Next concave or convex?
    if (orient2d(node.prev.point, node.prev.prev.point, node.prev.prev.prev.point) === Orientation.CW) {
        // Concave
        fillLeftConcaveEdgeEvent(tcx, edge, node.prev);
    } else {
        // Convex
        // Next above or below edge?
        if (orient2d(edge.q, node.prev.prev.point, edge.p) === Orientation.CW) {
            // Below
            fillLeftConvexEdgeEvent(tcx, edge, node.prev);
        } else {
            // Above
            /* jshint noempty:false */
        }
    }
}

function fillLeftConcaveEdgeEvent(tcx, edge, node) {
    fill(tcx, node.prev);
    if (node.prev.point !== edge.p) {
        // Next above or below edge?
        if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
            // Below
            if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
                // Next is concave
                fillLeftConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Next is convex
                /* jshint noempty:false */
            }
        }
    }
}

function flipEdgeEvent(tcx, ep, eq, t, p) {
    var ot = t.neighborAcross(p);
    if (!ot) {
        // If we want to integrate the fillEdgeEvent do it here
        // With current implementation we should never get here
        throw new Error('poly2tri [BUG:FIXME] FLIP failed due to missing triangle!');
    }
    var op = ot.oppositePoint(t, p);

    // Additional check from Java version (see issue #88)
    if (t.getConstrainedEdgeAcross(p)) {
        var index = t.index(p);
        throw new PointError("poly2tri Intersecting Constraints",
                [p, op, t.getPoint((index + 1) % 3), t.getPoint((index + 2) % 3)]);
    }

    if (inScanArea(p, t.pointCCW(p), t.pointCW(p), op)) {
        // Lets rotate shared edge one vertex CW
        rotateTrianglePair(t, p, ot, op);
        tcx.mapTriangleToNodes(t);
        tcx.mapTriangleToNodes(ot);

        // XXX: in the original C++ code for the next 2 lines, we are
        // comparing point values (and not pointers). In this JavaScript
        // code, we are comparing point references (pointers). This works
        // because we can't have 2 different points with the same values.
        // But to be really equivalent, we should use "Point.equals" here.
        if (p === eq && op === ep) {
            if (eq === tcx.edge_event.constrained_edge.q && ep === tcx.edge_event.constrained_edge.p) {
                t.markConstrainedEdgeByPoints(ep, eq);
                ot.markConstrainedEdgeByPoints(ep, eq);
                legalize(tcx, t);
                legalize(tcx, ot);
            } else {
                // XXX: I think one of the triangles should be legalized here?
                /* jshint noempty:false */
            }
        } else {
            var o = orient2d(eq, op, ep);
            t = nextFlipTriangle(tcx, o, t, ot, p, op);
            flipEdgeEvent(tcx, ep, eq, t, p);
        }
    } else {
        var newP = nextFlipPoint(ep, eq, ot, op);
        flipScanEdgeEvent(tcx, ep, eq, t, ot, newP);
        edgeEventByPoints(tcx, ep, eq, t, p);
    }
}

/**
 * After a flip we have two triangles and know that only one will still be
 * intersecting the edge. So decide which to contiune with and legalize the other
 *
 * @param tcx
 * @param o - should be the result of an orient2d( eq, op, ep )
 * @param t - triangle 1
 * @param ot - triangle 2
 * @param p - a point shared by both triangles
 * @param op - another point shared by both triangles
 * @return returns the triangle still intersecting the edge
 */
function nextFlipTriangle(tcx, o, t, ot, p, op) {
    var edge_index;
    if (o === Orientation.CCW) {
        // ot is not crossing edge after flip
        edge_index = ot.edgeIndex(p, op);
        ot.delaunay_edge[edge_index] = true;
        legalize(tcx, ot);
        ot.clearDelunayEdges();
        return t;
    }

    // t is not crossing edge after flip
    edge_index = t.edgeIndex(p, op);

    t.delaunay_edge[edge_index] = true;
    legalize(tcx, t);
    t.clearDelunayEdges();
    return ot;
}

/**
 * When we need to traverse from one triangle to the next we need
 * the point in current triangle that is the opposite point to the next
 * triangle.
 */
function nextFlipPoint(ep, eq, ot, op) {
    var o2d = orient2d(eq, op, ep);
    if (o2d === Orientation.CW) {
        // Right
        return ot.pointCCW(op);
    } else if (o2d === Orientation.CCW) {
        // Left
        return ot.pointCW(op);
    } else {
        throw new PointError("poly2tri [Unsupported] nextFlipPoint: opposing point on constrained edge!", [eq, op, ep]);
    }
}

/**
 * Scan part of the FlipScan algorithm<br>
 * When a triangle pair isn't flippable we will scan for the next
 * point that is inside the flip triangle scan area. When found
 * we generate a new flipEdgeEvent
 *
 * @param tcx
 * @param ep - last point on the edge we are traversing
 * @param eq - first point on the edge we are traversing
 * @param flipTriangle - the current triangle sharing the point eq with edge
 * @param t
 * @param p
 */
function flipScanEdgeEvent(tcx, ep, eq, flip_triangle, t, p) {
    var ot = t.neighborAcross(p);
    if (!ot) {
        // If we want to integrate the fillEdgeEvent do it here
        // With current implementation we should never get here
        throw new Error('poly2tri [BUG:FIXME] FLIP failed due to missing triangle');
    }
    var op = ot.oppositePoint(t, p);

    if (inScanArea(eq, flip_triangle.pointCCW(eq), flip_triangle.pointCW(eq), op)) {
        // flip with new edge op.eq
        flipEdgeEvent(tcx, eq, op, ot, op);
        // TODO: Actually I just figured out that it should be possible to
        //       improve this by getting the next ot and op before the the above
        //       flip and continue the flipScanEdgeEvent here
        // set new ot and op here and loop back to inScanArea test
        // also need to set a new flip_triangle first
        // Turns out at first glance that this is somewhat complicated
        // so it will have to wait.
    } else {
        var newP = nextFlipPoint(ep, eq, ot, op);
        flipScanEdgeEvent(tcx, ep, eq, flip_triangle, ot, newP);
    }
}


// ----------------------------------------------------------------------Exports

exports.triangulate = triangulate;

},{"./advancingfront":46,"./pointerror":48,"./triangle":52,"./utils":53}],51:[function(require,module,exports){
/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 * 
 * All rights reserved.
 * 
 * Distributed under the 3-clause BSD License, see LICENSE.txt
 */

/* jshint maxcomplexity:6 */

"use strict";


/*
 * Note
 * ====
 * the structure of this JavaScript version of poly2tri intentionally follows
 * as closely as possible the structure of the reference C++ version, to make it 
 * easier to keep the 2 versions in sync.
 */

var PointError = require('./pointerror');
var Point = require('./point');
var Triangle = require('./triangle');
var sweep = require('./sweep');
var AdvancingFront = require('./advancingfront');
var Node = AdvancingFront.Node;


// ------------------------------------------------------------------------utils

/* 
 * Initial triangle factor, seed triangle will extend 30% of
 * PointSet width to both left and right.
 */
var kAlpha = 0.3;


// -------------------------------------------------------------------------Edge
/**
 * Represents a simple polygon's edge
 * @param {Point} p1
 * @param {Point} p2
 */
var Edge = function(p1, p2) {
    this.p = p1;
    this.q = p2;

    if (p1.y > p2.y) {
        this.q = p1;
        this.p = p2;
    } else if (p1.y === p2.y) {
        if (p1.x > p2.x) {
            this.q = p1;
            this.p = p2;
        } else if (p1.x === p2.x) {
            throw new PointError('poly2tri Invalid Edge constructor: repeated points!', [p1]);
        }
    }

    if (!this.q._p2t_edge_list) {
        this.q._p2t_edge_list = [];
    }
    this.q._p2t_edge_list.push(this);
};


// ------------------------------------------------------------------------Basin
var Basin = function() {
    this.left_node = null; // Node
    this.bottom_node = null; // Node
    this.right_node = null; // Node
    this.width = 0.0; // number
    this.left_highest = false;
};

Basin.prototype.clear = function() {
    this.left_node = null;
    this.bottom_node = null;
    this.right_node = null;
    this.width = 0.0;
    this.left_highest = false;
};

// --------------------------------------------------------------------EdgeEvent
var EdgeEvent = function() {
    this.constrained_edge = null; // Edge
    this.right = false;
};

// ----------------------------------------------------SweepContext (public API)
/**
 * Constructor for the triangulation context.
 * It accepts a simple polyline (with non repeating points), 
 * which defines the constrained edges.
 * Possible options are:
 *    cloneArrays:  if true, do a shallow copy of the Array parameters 
 *                  (contour, holes). Points inside arrays are never copied.
 *                  Default is false : keep a reference to the array arguments,
 *                  who will be modified in place.
 * @param {Array} contour  array of "Point like" objects with {x,y} (duck typing)
 * @param {Object} options  constructor options
 */
var SweepContext = function(contour, options) {
    options = options || {};
    this.triangles_ = [];
    this.map_ = [];
    this.points_ = (options.cloneArrays ? contour.slice(0) : contour);
    this.edge_list = [];

    // Bounding box of all points. Computed at the start of the triangulation, 
    // it is stored in case it is needed by the caller.
    this.pmin_ = this.pmax_ = null;

    // Advancing front
    this.front_ = null; // AdvancingFront
    // head point used with advancing front
    this.head_ = null; // Point
    // tail point used with advancing front
    this.tail_ = null; // Point

    this.af_head_ = null; // Node
    this.af_middle_ = null; // Node
    this.af_tail_ = null; // Node

    this.basin = new Basin();
    this.edge_event = new EdgeEvent();

    this.initEdges(this.points_);
};


/**
 * Add a hole to the constraints
 * @param {Array} polyline  array of "Point like" objects with {x,y} (duck typing)
 */
SweepContext.prototype.addHole = function(polyline) {
    this.initEdges(polyline);
    var i, len = polyline.length;
    for (i = 0; i < len; i++) {
        this.points_.push(polyline[i]);
    }
    return this; // for chaining
};
// Backward compatibility
SweepContext.prototype.AddHole = SweepContext.prototype.addHole;


/**
 * Add a Steiner point to the constraints
 * @param {Point} point     any "Point like" object with {x,y} (duck typing)
 */
SweepContext.prototype.addPoint = function(point) {
    this.points_.push(point);
    return this; // for chaining
};
// Backward compatibility
SweepContext.prototype.AddPoint = SweepContext.prototype.addPoint;


/**
 * Add several Steiner points to the constraints
 * @param {array<Point>} points     array of "Point like" object with {x,y} 
 */
// Method added in the JavaScript version (was not present in the c++ version)
SweepContext.prototype.addPoints = function(points) {
    this.points_ = this.points_.concat(points);
    return this; // for chaining
};


/**
 * Triangulate the polygon with holes and Steiner points.
 * Do this AFTER you've added the polyline, holes, and Steiner points
 */
// Shortcut method for sweep.triangulate(SweepContext).
// Method added in the JavaScript version (was not present in the c++ version)
SweepContext.prototype.triangulate = function() {
    sweep.triangulate(this);
    return this; // for chaining
};


/**
 * Get the bounding box of the provided constraints (contour, holes and 
 * Steinter points). Warning : these values are not available if the triangulation 
 * has not been done yet.
 * @returns {Object} object with 'min' and 'max' Point
 */
// Method added in the JavaScript version (was not present in the c++ version)
SweepContext.prototype.getBoundingBox = function() {
    return {min: this.pmin_, max: this.pmax_};
};

/**
 * Get result of triangulation
 * @returns {array<Triangle>}   array of triangles
 */
SweepContext.prototype.getTriangles = function() {
    return this.triangles_;
};
// Backward compatibility
SweepContext.prototype.GetTriangles = SweepContext.prototype.getTriangles;


// ---------------------------------------------------SweepContext (private API)

SweepContext.prototype.front = function() {
    return this.front_;
};

SweepContext.prototype.pointCount = function() {
    return this.points_.length;
};

SweepContext.prototype.head = function() {
    return this.head_;
};

SweepContext.prototype.setHead = function(p1) {
    this.head_ = p1;
};

SweepContext.prototype.tail = function() {
    return this.tail_;
};

SweepContext.prototype.setTail = function(p1) {
    this.tail_ = p1;
};

SweepContext.prototype.getMap = function() {
    return this.map_;
};

SweepContext.prototype.initTriangulation = function() {
    var xmax = this.points_[0].x;
    var xmin = this.points_[0].x;
    var ymax = this.points_[0].y;
    var ymin = this.points_[0].y;

    // Calculate bounds
    var i, len = this.points_.length;
    for (i = 1; i < len; i++) {
        var p = this.points_[i];
        /* jshint expr:true */
        (p.x > xmax) && (xmax = p.x);
        (p.x < xmin) && (xmin = p.x);
        (p.y > ymax) && (ymax = p.y);
        (p.y < ymin) && (ymin = p.y);
    }
    this.pmin_ = new Point(xmin, ymin);
    this.pmax_ = new Point(xmax, ymax);

    var dx = kAlpha * (xmax - xmin);
    var dy = kAlpha * (ymax - ymin);
    this.head_ = new Point(xmax + dx, ymin - dy);
    this.tail_ = new Point(xmin - dx, ymin - dy);

    // Sort points along y-axis
    this.points_.sort(Point.compare);
};

SweepContext.prototype.initEdges = function(polyline) {
    var i, len = polyline.length;
    for (i = 0; i < len; ++i) {
        this.edge_list.push(new Edge(polyline[i], polyline[(i + 1) % len]));
    }
};

SweepContext.prototype.getPoint = function(index) {
    return this.points_[index];
};

SweepContext.prototype.addToMap = function(triangle) {
    this.map_.push(triangle);
};

SweepContext.prototype.locateNode = function(point) {
    return this.front_.locateNode(point.x);
};

SweepContext.prototype.createAdvancingFront = function() {
    var head;
    var middle;
    var tail;
    // Initial triangle
    var triangle = new Triangle(this.points_[0], this.tail_, this.head_);

    this.map_.push(triangle);

    head = new Node(triangle.getPoint(1), triangle);
    middle = new Node(triangle.getPoint(0), triangle);
    tail = new Node(triangle.getPoint(2));

    this.front_ = new AdvancingFront(head, tail);

    head.next = middle;
    middle.next = tail;
    middle.prev = head;
    tail.prev = middle;
};

SweepContext.prototype.removeNode = function(node) {
    // do nothing
    /* jshint unused:false */
};

SweepContext.prototype.mapTriangleToNodes = function(t) {
    for (var i = 0; i < 3; ++i) {
        if (!t.getNeighbor(i)) {
            var n = this.front_.locatePoint(t.pointCW(t.getPoint(i)));
            if (n) {
                n.triangle = t;
            }
        }
    }
};

SweepContext.prototype.removeFromMap = function(triangle) {
    var i, map = this.map_, len = map.length;
    for (i = 0; i < len; i++) {
        if (map[i] === triangle) {
            map.splice(i, 1);
            break;
        }
    }
};

/**
 * Do a depth first traversal to collect triangles
 * @param {Triangle} triangle start
 */
SweepContext.prototype.meshClean = function(triangle) {
    // New implementation avoids recursive calls and use a loop instead.
    // Cf. issues # 57, 65 and 69.
    var triangles = [triangle], t, i;
    /* jshint boss:true */
    while (t = triangles.pop()) {
        if (!t.isInterior()) {
            t.setInterior(true);
            this.triangles_.push(t);
            for (i = 0; i < 3; i++) {
                if (!t.constrained_edge[i]) {
                    triangles.push(t.getNeighbor(i));
                }
            }
        }
    }
};

// ----------------------------------------------------------------------Exports

module.exports = SweepContext;

},{"./advancingfront":46,"./point":47,"./pointerror":48,"./sweep":50,"./triangle":52}],52:[function(require,module,exports){
/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 *
 * All rights reserved.
 * 
 * Distributed under the 3-clause BSD License, see LICENSE.txt
 */

/* jshint maxcomplexity:10 */

"use strict";


/*
 * Note
 * ====
 * the structure of this JavaScript version of poly2tri intentionally follows
 * as closely as possible the structure of the reference C++ version, to make it 
 * easier to keep the 2 versions in sync.
 */

var xy = require("./xy");


// ---------------------------------------------------------------------Triangle
/**
 * Triangle class.<br>
 * Triangle-based data structures are known to have better performance than
 * quad-edge structures.
 * See: J. Shewchuk, "Triangle: Engineering a 2D Quality Mesh Generator and
 * Delaunay Triangulator", "Triangulations in CGAL"
 * 
 * @param   a,b,c   any "Point like" objects with {x,y} (duck typing)
 */
var Triangle = function(a, b, c) {
    // Triangle points
    this.points_ = [a, b, c];
    // Neighbor list
    this.neighbors_ = [null, null, null];
    // Has this triangle been marked as an interior triangle?
    this.interior_ = false;
    // Flags to determine if an edge is a Constrained edge
    this.constrained_edge = [false, false, false];
    // Flags to determine if an edge is a Delauney edge
    this.delaunay_edge = [false, false, false];
};

/**
 * For pretty printing ex. <i>"[(5;42)(10;20)(21;30)]"</i>)
 */
var p2s = xy.toString;
Triangle.prototype.toString = function() {
    return ("[" + p2s(this.points_[0]) + p2s(this.points_[1]) + p2s(this.points_[2]) + "]");
};

Triangle.prototype.getPoint = function(index) {
    return this.points_[index];
};
// for backward compatibility
Triangle.prototype.GetPoint = Triangle.prototype.getPoint;

// Method added in the JavaScript version (was not present in the c++ version)
Triangle.prototype.getPoints = function() {
    return this.points_;
};

Triangle.prototype.getNeighbor = function(index) {
    return this.neighbors_[index];
};

/**
 * Test if this Triangle contains the Point object given as parameters as its
 * vertices. Only point references are compared, not values.
 * @return <code>True</code> if the Point object is of the Triangle's vertices,
 *         <code>false</code> otherwise.
 */
Triangle.prototype.containsPoint = function(point) {
    var points = this.points_;
    // Here we are comparing point references, not values
    return (point === points[0] || point === points[1] || point === points[2]);
};

/**
 * Test if this Triangle contains the Edge object given as parameter as its
 * bounding edges. Only point references are compared, not values.
 * @return <code>True</code> if the Edge object is of the Triangle's bounding
 *         edges, <code>false</code> otherwise.
 */
Triangle.prototype.containsEdge = function(edge) {
    return this.containsPoint(edge.p) && this.containsPoint(edge.q);
};
Triangle.prototype.containsPoints = function(p1, p2) {
    return this.containsPoint(p1) && this.containsPoint(p2);
};


Triangle.prototype.isInterior = function() {
    return this.interior_;
};
Triangle.prototype.setInterior = function(interior) {
    this.interior_ = interior;
    return this;
};

/**
 * Update neighbor pointers.
 * @param {Point} p1 Point object.
 * @param {Point} p2 Point object.
 * @param {Triangle} t Triangle object.
 */
Triangle.prototype.markNeighborPointers = function(p1, p2, t) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if ((p1 === points[2] && p2 === points[1]) || (p1 === points[1] && p2 === points[2])) {
        this.neighbors_[0] = t;
    } else if ((p1 === points[0] && p2 === points[2]) || (p1 === points[2] && p2 === points[0])) {
        this.neighbors_[1] = t;
    } else if ((p1 === points[0] && p2 === points[1]) || (p1 === points[1] && p2 === points[0])) {
        this.neighbors_[2] = t;
    } else {
        throw new Error('poly2tri Invalid Triangle.markNeighborPointers() call');
    }
};

/**
 * Exhaustive search to update neighbor pointers
 * @param {Triangle} t
 */
Triangle.prototype.markNeighbor = function(t) {
    var points = this.points_;
    if (t.containsPoints(points[1], points[2])) {
        this.neighbors_[0] = t;
        t.markNeighborPointers(points[1], points[2], this);
    } else if (t.containsPoints(points[0], points[2])) {
        this.neighbors_[1] = t;
        t.markNeighborPointers(points[0], points[2], this);
    } else if (t.containsPoints(points[0], points[1])) {
        this.neighbors_[2] = t;
        t.markNeighborPointers(points[0], points[1], this);
    }
};


Triangle.prototype.clearNeigbors = function() {
    this.neighbors_[0] = null;
    this.neighbors_[1] = null;
    this.neighbors_[2] = null;
};

Triangle.prototype.clearDelunayEdges = function() {
    this.delaunay_edge[0] = false;
    this.delaunay_edge[1] = false;
    this.delaunay_edge[2] = false;
};

/**
 * Returns the point clockwise to the given point.
 */
Triangle.prototype.pointCW = function(p) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (p === points[0]) {
        return points[2];
    } else if (p === points[1]) {
        return points[0];
    } else if (p === points[2]) {
        return points[1];
    } else {
        return null;
    }
};

/**
 * Returns the point counter-clockwise to the given point.
 */
Triangle.prototype.pointCCW = function(p) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (p === points[0]) {
        return points[1];
    } else if (p === points[1]) {
        return points[2];
    } else if (p === points[2]) {
        return points[0];
    } else {
        return null;
    }
};

/**
 * Returns the neighbor clockwise to given point.
 */
Triangle.prototype.neighborCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.neighbors_[1];
    } else if (p === this.points_[1]) {
        return this.neighbors_[2];
    } else {
        return this.neighbors_[0];
    }
};

/**
 * Returns the neighbor counter-clockwise to given point.
 */
Triangle.prototype.neighborCCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.neighbors_[2];
    } else if (p === this.points_[1]) {
        return this.neighbors_[0];
    } else {
        return this.neighbors_[1];
    }
};

Triangle.prototype.getConstrainedEdgeCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.constrained_edge[1];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[2];
    } else {
        return this.constrained_edge[0];
    }
};

Triangle.prototype.getConstrainedEdgeCCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.constrained_edge[2];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[0];
    } else {
        return this.constrained_edge[1];
    }
};

// Additional check from Java version (see issue #88)
Triangle.prototype.getConstrainedEdgeAcross = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.constrained_edge[0];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[1];
    } else {
        return this.constrained_edge[2];
    }
};

Triangle.prototype.setConstrainedEdgeCW = function(p, ce) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        this.constrained_edge[1] = ce;
    } else if (p === this.points_[1]) {
        this.constrained_edge[2] = ce;
    } else {
        this.constrained_edge[0] = ce;
    }
};

Triangle.prototype.setConstrainedEdgeCCW = function(p, ce) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        this.constrained_edge[2] = ce;
    } else if (p === this.points_[1]) {
        this.constrained_edge[0] = ce;
    } else {
        this.constrained_edge[1] = ce;
    }
};

Triangle.prototype.getDelaunayEdgeCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.delaunay_edge[1];
    } else if (p === this.points_[1]) {
        return this.delaunay_edge[2];
    } else {
        return this.delaunay_edge[0];
    }
};

Triangle.prototype.getDelaunayEdgeCCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.delaunay_edge[2];
    } else if (p === this.points_[1]) {
        return this.delaunay_edge[0];
    } else {
        return this.delaunay_edge[1];
    }
};

Triangle.prototype.setDelaunayEdgeCW = function(p, e) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        this.delaunay_edge[1] = e;
    } else if (p === this.points_[1]) {
        this.delaunay_edge[2] = e;
    } else {
        this.delaunay_edge[0] = e;
    }
};

Triangle.prototype.setDelaunayEdgeCCW = function(p, e) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        this.delaunay_edge[2] = e;
    } else if (p === this.points_[1]) {
        this.delaunay_edge[0] = e;
    } else {
        this.delaunay_edge[1] = e;
    }
};

/**
 * The neighbor across to given point.
 */
Triangle.prototype.neighborAcross = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.neighbors_[0];
    } else if (p === this.points_[1]) {
        return this.neighbors_[1];
    } else {
        return this.neighbors_[2];
    }
};

Triangle.prototype.oppositePoint = function(t, p) {
    var cw = t.pointCW(p);
    return this.pointCW(cw);
};

/**
 * Legalize triangle by rotating clockwise around oPoint
 * @param {Point} opoint
 * @param {Point} npoint
 */
Triangle.prototype.legalize = function(opoint, npoint) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (opoint === points[0]) {
        points[1] = points[0];
        points[0] = points[2];
        points[2] = npoint;
    } else if (opoint === points[1]) {
        points[2] = points[1];
        points[1] = points[0];
        points[0] = npoint;
    } else if (opoint === points[2]) {
        points[0] = points[2];
        points[2] = points[1];
        points[1] = npoint;
    } else {
        throw new Error('poly2tri Invalid Triangle.legalize() call');
    }
};

/**
 * Returns the index of a point in the triangle. 
 * The point *must* be a reference to one of the triangle's vertices.
 * @param {Point} p Point object
 * @returns {Number} index 0, 1 or 2
 */
Triangle.prototype.index = function(p) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (p === points[0]) {
        return 0;
    } else if (p === points[1]) {
        return 1;
    } else if (p === points[2]) {
        return 2;
    } else {
        throw new Error('poly2tri Invalid Triangle.index() call');
    }
};

Triangle.prototype.edgeIndex = function(p1, p2) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (p1 === points[0]) {
        if (p2 === points[1]) {
            return 2;
        } else if (p2 === points[2]) {
            return 1;
        }
    } else if (p1 === points[1]) {
        if (p2 === points[2]) {
            return 0;
        } else if (p2 === points[0]) {
            return 2;
        }
    } else if (p1 === points[2]) {
        if (p2 === points[0]) {
            return 1;
        } else if (p2 === points[1]) {
            return 0;
        }
    }
    return -1;
};

/**
 * Mark an edge of this triangle as constrained.<br>
 * This method takes either 1 parameter (an edge index or an Edge instance) or
 * 2 parameters (two Point instances defining the edge of the triangle).
 */
Triangle.prototype.markConstrainedEdgeByIndex = function(index) {
    this.constrained_edge[index] = true;
};
Triangle.prototype.markConstrainedEdgeByEdge = function(edge) {
    this.markConstrainedEdgeByPoints(edge.p, edge.q);
};
Triangle.prototype.markConstrainedEdgeByPoints = function(p, q) {
    var points = this.points_;
    // Here we are comparing point references, not values        
    if ((q === points[0] && p === points[1]) || (q === points[1] && p === points[0])) {
        this.constrained_edge[2] = true;
    } else if ((q === points[0] && p === points[2]) || (q === points[2] && p === points[0])) {
        this.constrained_edge[1] = true;
    } else if ((q === points[1] && p === points[2]) || (q === points[2] && p === points[1])) {
        this.constrained_edge[0] = true;
    }
};


// ---------------------------------------------------------Exports (public API)

module.exports = Triangle;

},{"./xy":54}],53:[function(require,module,exports){
/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 * 
 * All rights reserved.
 * 
 * Distributed under the 3-clause BSD License, see LICENSE.txt
 */

"use strict";

/*
 * Note
 * ====
 * the structure of this JavaScript version of poly2tri intentionally follows
 * as closely as possible the structure of the reference C++ version, to make it 
 * easier to keep the 2 versions in sync.
 */

var EPSILON = 1e-12;

var Orientation = {
    "CW": 1,
    "CCW": -1,
    "COLLINEAR": 0
};

/**
 * Forumla to calculate signed area<br>
 * Positive if CCW<br>
 * Negative if CW<br>
 * 0 if collinear<br>
 * <pre>
 * A[P1,P2,P3]  =  (x1*y2 - y1*x2) + (x2*y3 - y2*x3) + (x3*y1 - y3*x1)
 *              =  (x1-x3)*(y2-y3) - (y1-y3)*(x2-x3)
 * </pre>
 * 
 * @param   pa,pb,pc   any "Point like" objects with {x,y} (duck typing)
 */
function orient2d(pa, pb, pc) {
    var detleft = (pa.x - pc.x) * (pb.y - pc.y);
    var detright = (pa.y - pc.y) * (pb.x - pc.x);
    var val = detleft - detright;
    if (val > -(EPSILON) && val < (EPSILON)) {
        return Orientation.COLLINEAR;
    } else if (val > 0) {
        return Orientation.CCW;
    } else {
        return Orientation.CW;
    }
}

/**
 *  
 * @param   pa,pb,pc,pd   any "Point like" objects with {x,y} (duck typing)
 */
function inScanArea(pa, pb, pc, pd) {
    var oadb = (pa.x - pb.x) * (pd.y - pb.y) - (pd.x - pb.x) * (pa.y - pb.y);
    if (oadb >= -EPSILON) {
        return false;
    }

    var oadc = (pa.x - pc.x) * (pd.y - pc.y) - (pd.x - pc.x) * (pa.y - pc.y);
    if (oadc <= EPSILON) {
        return false;
    }
    return true;
}


// ----------------------------------------------------------------------Exports

module.exports = {
    EPSILON: EPSILON,
    Orientation: Orientation,
    orient2d: orient2d,
    inScanArea: inScanArea
};

},{}],54:[function(require,module,exports){
/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 * 
 * poly2tri.js (JavaScript port) (c) 2009-2013, Poly2Tri Contributors
 * https://github.com/r3mi/poly2tri.js
 * 
 * All rights reserved.
 * 
 * Distributed under the 3-clause BSD License, see LICENSE.txt
 */

"use strict";

/*
 * The following functions operate on "Point" or any "Point like" object 
 * with {x,y} (duck typing).
 */


/**
 * Point pretty printing ex. <i>"(5;42)"</i>)
 * @param   p   any "Point like" object with {x,y} 
 * @returns {String}
 */
function toStringBase(p) {
    return ("(" + p.x + ";" + p.y + ")");
}
function toString(p) {
    // Try a custom toString first, and fallback to own implementation if none
    var s = p.toString();
    return (s === '[object Object]' ? toStringBase(p) : s);
}

/**
 * Compare two points component-wise. Ordered by y axis first, then x axis.
 * @param   a,b   any "Point like" objects with {x,y} 
 * @return <code>&lt; 0</code> if <code>a &lt; b</code>, 
 *         <code>&gt; 0</code> if <code>a &gt; b</code>, 
 *         <code>0</code> otherwise.
 */
function compare(a, b) {
    if (a.y === b.y) {
        return a.x - b.x;
    } else {
        return a.y - b.y;
    }
}

/**
 * Test two Point objects for equality.
 * @param   a,b   any "Point like" objects with {x,y} 
 * @return <code>True</code> if <code>a == b</code>, <code>false</code> otherwise.
 */
function equals(a, b) {
    return a.x === b.x && a.y === b.y;
}


module.exports = {
    toString: toString,
    toStringBase: toStringBase,
    compare: compare,
    equals: equals
};

},{}],55:[function(require,module,exports){
var Vector2 = require('vecmath').Vector2;
var Class = require('klasse');
var lerp = require('interpolation').lerp;

function distanceTo(x1, y1, x2, y2) {
    var dx = x2-x1;
    var dy = y2-y1;
    return Math.sqrt(dx*dx+dy*dy);
}

var tmp1 = new Vector2();
var tmp2 = new Vector2();

var Shape = new Class({

    initialize: function() {
        this.steps = 1;
        this.points = [];

        // If step is not provided to a ***CurveTo function, 
        // then it will be approximated with a very simple distance check
        this.approximateCurves = true;
        this.approximationFactor = 0.5;

        this._move = new Vector2();
        this._start = new Vector2();
        this._hasMoved = false;
        this._newPath = true;
    },


    reset: function() {
        this.points.length = 0;
        this._newPath = true;
        this._hasMoved = false;
        this._move.x = this._move.y = 0;
        this._start.x = this._start.y = 0;
    },

    beginPath: function() {
        this.reset();
    },
    
    moveTo: function(x, y) {
        this._newPath = true;
        this._move.x = x;
        this._move.y = y;
        this._start.x = x;
        this._start.y = y;
        this._hasMoved = true;
    },

    __newPoint: function(nx, ny) {
        this.points.push(new Vector2(nx, ny));
        this._newPath = false;
    },
    
    /** Closes the path by performing a lineTo with the first 'starting' point. 
        If the path is empty, this does nothing. */
    closePath: function(steps) {
        if (this.points.length===0)
            return;
        this.lineTo(this._start.x, this._start.y, steps);
    },
    
    lineTo: function(x, y, steps) {
        //if we are calling lineTo before any moveTo.. make this the first point
        if (!this._hasMoved) {
            this.moveTo(x, y);
            return;
        }

        steps = Math.max(1, steps || this.steps);
        for (var i=0; i<=steps; i++) { 
            if (!this._newPath && i==0)
                continue;
                
            var t = i/steps;   
            var nx = lerp(this._move.x, x, t);
            var ny = lerp(this._move.y, y, t);
            
            this.__newPoint(nx, ny);
        }
        this._move.x = x;
        this._move.y = y; 
    },

    /** Creates a bezier (cubic) curve to the specified point, with the given control points.
    If steps is not specified or is a falsy value, this function will use the default value
    set for this Path object. It will be capped to a minimum of 3 steps. 
    */
    bezierCurveTo: function(x2, y2, x3, y3, x4, y4, steps) {
        //if we are calling lineTo before any moveTo.. make this the first point
        if (!this._hasMoved) {
            this.moveTo(x, y);
            return;
        }
        
        var x1 = this._move.x;
        var y1 = this._move.y;
        
        //try to approximate with a simple distance sum.
        //more accurate would be to use this:
        //http://antigrain.com/research/adaptive_bezier/
        if (!steps) {
            if (this.approximateCurves) {
                var d1 = distanceTo(x1, y1, x2, y2);
                var d2 = distanceTo(x2, y2, x3, y3);
                var d3 = distanceTo(x3, y3, x4, y4);
                steps = ~~((d1 + d2 + d3) * this.approximationFactor);
            } else {
                steps = Math.max(1, this.steps);
            }
        } 
        
        for (var i=0; i<steps; i++) {
            var t = i / (steps-1);
            var dt = (1 - t);
            
            var dt2 = dt * dt;
            var dt3 = dt2 * dt;
            var t2 = t * t;
            var t3 = t2 * t;
            
            var x = dt3 * x1 + 3 * dt2 * t * x2 + 3 * dt * t2 * x3 + t3 * x4;
            var y = dt3 * y1 + 3 * dt2 * t * y2 + 3 * dt * t2 * y3 + t3 * y4;
            
            this.__newPoint(x, y);
        }
        
        this._move.x = x4;
        this._move.y = y4;
    },
    
    /** Creates a quadratic curve to the specified point, with the given control points.
    If steps is not specified or is a falsy value, this function will use the default value
    set for this Path object. It will be capped to a minimum of 3 steps. 
    */
    quadraticCurveTo: function(x2, y2, x3, y3, steps) {
        //if we are calling lineTo before any moveTo.. make this the first point
        if (!this._hasMoved) {
            this.moveTo(x, y);
            return;
        } 
        
        var x1 = this._move.x;
        var y1 = this._move.y;
        
        //try to approximate with a simple distance sum.
        //more accurate would be to use this:
        //http://antigrain.com/research/adaptive_bezier/
        if (!steps) {
            if (this.approximateCurves) {
                var d1 = tmp1.set(x1, y1).distance( tmp2.set(x2, y2) );
                var d2 = tmp1.set(x2, y2).distance( tmp2.set(x3, y3) );
                steps = ~~((d1 + d2) * this.approximationFactor);
            } else {
                steps = Math.max(1, this.steps);
            }
        } 
        
        for (var i=0; i<steps; i++) {
            var t = i / (steps-1);
            var dt = (1 - t);
            var dtSq = dt * dt;
            var tSq = t * t;
            
            var x = dtSq * x1 + 2 * dt * t * x2 + tSq * x3;
            var y = dtSq * y1 + 2 * dt * t * y2 + tSq * y3;
            
            this.__newPoint(x, y);
        }
        
        this._move.x = x3;
        this._move.y = y3;
    },

    calculateBoundingBox: function() {
        var points = this.points;

        var minX = Number.MAX_VALUE,
            minY = Number.MAX_VALUE,
            maxX = -Number.MAX_VALUE,
            maxY = -Number.MAX_VALUE;

        for (var i=0; i<points.length; i++) {
            var p = points[i];

            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }

        return {
            x: minX,
            y: minY,
            width: maxX-minX,
            height: maxY-minY
        };
    },

    contains: function(x, y) {
        var testx = x, testy = y;
        if (typeof x === "object") {
            testx = x.x;
            testy = x.y;
        }

        var points = this.points;
        var nvert = points.length;
        var i, j, c = 0;
        for (i=0, j=nvert-1; i<nvert; j=i++) {
            if ( ((points[i].y>testy) != (points[j].y>testy)) &&
                (testx < (points[j].x-points[i].x) * (testy-points[i].y) / (points[j].y-points[i].y) + points[i].x) ) {
                c = !c;
            }
        }
        return c;
    },


    simplify: function(tolerance, out) {
        var points = this.points,
            len = points.length,
            point = new Vector2(),
            sqTolerance = tolerance*tolerance,
            prevPoint = new Vector2( points[0] );

        if (!out)
            out = new Shape();

        var outPoints = [];
        outPoints.push(prevPoint);

        for (var i=1; i<len; i++) {
            point = points[i];
            if ( point.distanceSq(prevPoint) > sqTolerance ) {
                outPoints.push(new Vector2(point));
                prevPoint = point;
            }
        }
        if (prevPoint.x !== point.x || prevPoint.y !== point.y)
            outPoints.push(new Vector2(point));

        out.points = outPoints;
        return out; 
    }
});

module.exports = Shape;
},{"interpolation":56,"klasse":44,"vecmath":64}],56:[function(require,module,exports){
module.exports=require(19)
},{}],57:[function(require,module,exports){
module.exports=require(24)
},{}],58:[function(require,module,exports){
module.exports=require(25)
},{}],59:[function(require,module,exports){
module.exports=require(26)
},{"./Matrix3":57,"./Vector3":61,"./common":63}],60:[function(require,module,exports){
module.exports=require(27)
},{}],61:[function(require,module,exports){
module.exports=require(28)
},{}],62:[function(require,module,exports){
module.exports=require(29)
},{"./common":63}],63:[function(require,module,exports){
module.exports=require(30)
},{}],64:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./Matrix3":57,"./Matrix4":58,"./Quaternion":59,"./Vector2":60,"./Vector3":61,"./Vector4":62}],65:[function(require,module,exports){

// not implemented
// The reason for having an empty file and not throwing is to allow
// untraditional implementation of this module.

},{}]},{},[2])
(2)
});
;