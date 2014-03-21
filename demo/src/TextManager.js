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
var vert = fs.readFileSync( __dirname + '/shaders/text.vert', 'utf8' );
var frag = fs.readFileSync( __dirname + '/shaders/text.frag', 'utf8' );
var fxaa = fs.readFileSync( __dirname + '/shaders/fxaa.frag', 'utf8' );

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

        this.TweenLite = TweenLite;

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
        this.glyphData[index].tweening = true;
        this.glyphData[index].tween = 0;
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
                // if (gData.tweening)
                this.TweenLite.killTweensOf( gData );
                gData.mouseOver = true;
                gData.tweening = false;
                gData.resetting = false;
                gData.tween =0;


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

                // this._saveGlyph(i);
                this.TweenLite.to( gData, 1.0, {
                    overwrite: 1,
                    tween: 1.0,
                    ease: Expo.easeOut,
                    delay: 1.0 + (i*.01),
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

        var explodeThreshold = 30;
        var strength = 3;
        tmp3.copy( mouse );
        tmp3.sub( lastMouse );
        tmp3.normalize();
        tmp3.scale(mousePush);

        var mouseMoved = mouse.distance(lastMouse) > 2;

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

