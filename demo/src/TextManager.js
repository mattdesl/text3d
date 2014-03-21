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

///////
///GET RID OF THESE FOR PRODUCTION
var Preset0 = JSON.parse( fs.readFileSync( __dirname + '/presets/ImFly.json', 'utf8') );

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
        this.options = this.toDefaults(options);
        this.text = text;

        this.TweenLite = TweenLite;

        this.world = new World();

        this.camera = new OrthographicCamera();

        this.face = util.getFace('uni sans bold');
        this.webGLRenderer = null;
        this.scale = 1.0;
        this.position = new Vector3(0, 0, 0);

        this._finishTweenReset = this.finishTweenReset.bind(this);
        this._startTweenReset = this.startTweenReset.bind(this);

        this.glyphData = [];

        this.create();

        this.setupUI();
    },

    resetOptions: function() {
        this.options = {};
        this.toDefaults(this.options);
    },

    uiRecreate: function() {

    },

    setupUI: function() {
        var gui = new dat.GUI({
            load: Preset0
        });
        gui.remember(this.options);
        // gui.useLocalStorage = false;

        var mesh = gui.addFolder('Text Mesh');
        mesh.add(this.options, 'fill');
        // mesh.add(this.options, 'fontSize', 12, 150);
        mesh.add(this.options, 'steps', 3, 30);
        mesh.add(this.options, 'simplify', 0, 50);
        mesh.add(this, 'create');
        mesh.open();

        var physics = gui.addFolder('Physics');
        physics.add(this.options, 'spinStrength', 0, 30);
        physics.add(this.options, 'mouseStrength', 0, 30);
        physics.add(this.options, 'mouseRadius', 0, 30);
        physics.add(this.options, 'minMouseMotion', 0, 5);
        physics.add(this.options, 'rigidness', 0.0, 0.2);
        physics.open();

        var reset = gui.addFolder('Reset Animation');
        reset.add(this.options, 'resetDuration', 0, 4);
        reset.add(this.options, 'resetDelay', 0, 4);
        // reset.add(this.options, 'resetDelayIncrement', 0, .2);
        reset.add(this.options, 'resetLinear');
        reset.add(this.options, 'resetWhileIdle');
        reset.add(this.options, 'resetByDistance');
        reset.open();


    },

    toDefaults: function(options) {
        options.style = typeof options.style === "number" ? options.style : 0;
        options.spinStrength = typeof options.spinStrength === "number" ? options.spinStrength : 10;
        options.mouseStrength = typeof options.mouseStrength === "number" ? options.mouseStrength : 5;
        options.mouseRadius = typeof options.mouseRadius === "number" ? options.mouseRadius : 15;
        options.minMouseMotion = typeof options.minMouseMotion === "number" ? options.minMouseMotion : 2;
        options.resetLinear = !!options.resetLinear;
        options.resetDuration = typeof options.resetDuration === "number" ? options.resetDuration : 1;
        options.resetDelay = typeof options.resetDelay === "number" ? options.resetDelay : .5;
        options.resetDelayIncrement = typeof options.resetDelayIncrement === "number" ? options.resetDelayIncrement : .05;
        options.resetWhileIdle = typeof options.resetWhileIdle === "boolean" ? options.resetWhileIdle : true;
        options.resetByDistance = typeof options.resetByDistance === "boolean" ? options.resetByDistance : true;
        options.rigidness = typeof options.rigidness === "number" ? options.rigidness : 0.0;

        options.fill = typeof options.fill === "boolean" ? options.fill : true;

        this.fontSize = options.fontSize || 50;
        this.snap = typeof options.snap === "number" ? options.snap : 0.995;

        options.snap = this.snap;
        options.fontSize = this.fontSize;
        options.steps = typeof options.steps === "number" ? options.steps : 10;
        options.simplify = typeof options.simplify === "number" ? options.simplify : 50;
        return options;
    },

    create: function() {
        var text = this.text;

        var options = this.options;
        this.toDefaults(this.options);

        var steps = ~~options.steps;

        if (typeof options.simplify === "number") {
            if (options.simplify === 0)
                simplify = 0;
            else
                simplify = this.fontSize/Math.max(10, ~~options.simplify)
        } else
            simplify = this.fontSize/50;

        Glyph.SAVE_CONTOUR = false;


        this.text = text;
        this.textMesh = new Text3D(text, this.face, this.fontSize, steps, simplify);
        


        this.mouse = new Vector3();
        this.lastMouse = new Vector3();
        
        this.color = { r: 0, g: 0, b: 0, a: 1 };

        this.world.particles.length = 0;
        this.world.addText3D(this.textMesh);
        
        if (this.webGLRenderer)
            this.webGLRenderer.setup(this.world.particles);

        this.width = this.textMesh.bounds.maxX-this.textMesh.bounds.minX;
        this.height = this.textMesh.bounds.maxY-this.textMesh.bounds.minY;


        this.glyphData.length = 0;
        for (var i=0; i<this.textMesh.glyphs.length; i++) {
            this.glyphData[i] = {
                mouseOver: false,
                tween: 0.0,
                resetting: false,
            };
        }

        //destroy the text contour object to free up some memory
        this.textMesh.destroy();

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
        var world = this.world;

        world.step(dt);

        this._resolveTweens();
        this._updateKillTweens();

        var options = this.options;

        if (options.style === 0)
            this._updateMouseInteractions();
        else if (options.style === 1)
            this._updateMouseInteractions2();
        else if (options.style === 2)
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

                for (var k=0; k<p.constraints.length; k++) {
                    var c = p.constraints[k];
                    c.restingDistance = lerp(c.restingDistance, c.originalRestingDistance, a);
                    c.stiffness = lerp(c.stiffness, c.originalStiffness, a);
                }
            }
        }
    },

    _createRandomForces: function() {
        var world = this.world;

        for (var i=0; i<world.particles.length; i++) {
            

            var scale = this.options.spinStrength;
            tmp.random();
            tmp.z = 0;
            tmp.x *= scale;
            tmp.y *= scale;

            world.particles[i].finalPosition.add(tmp);
        }
    },

    _updateKillTweens: function() {
        var mouse = this.mouse;

        var mouseMove = (mouse.distance(this.lastMouse) > 2);

        for (var i=0; i<this.textMesh.glyphs.length; i++) {
            var gData = this.glyphData[i];

            var g = this.textMesh.glyphs[i];
            var b = g.bounds;

            var withinGlyph = mouse.x > b.minX && mouse.x < b.maxX && mouse.y > b.minY && mouse.y < b.maxY
                
            if (!mouseMove && this.options.resetWhileIdle) {
                gData.mouseOver = false;
                this._addTween(i, this.options.resetDelay);
                continue;
            }

            var dist = mouse.distance(tmp.set( b.minX+ (b.maxX-b.minX)/2, b.minY + (b.maxY-b.minY)/2 ));

            if (dist < this.options.mouseRadius) {
                // if (gData.tweening)
                this.TweenLite.killTweensOf( gData );
                gData.mouseOver = true;
                gData.tweening = false;
                gData.resetting = false;
                gData.tween = 0;


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

    _addTween: function(i, startDelay) {
        startDelay = startDelay||0;

        var gData = this.glyphData[i];
        var options = this.options;


        if (options.resetByDistance) {
            var mouse = this.mouse;
            var glyph = this.textMesh.glyphs[i];
            var b = glyph.bounds;

            var dist = mouse.distance(tmp.set( b.minX+ (b.maxX-b.minX)/2, b.minY + (b.maxY-b.minY)/2 ));    

            startDelay += dist / ( this.screenLength ) ;

        } else {
            startDelay += ( i * options.resetDelayIncrement);
        }
        //console.log("BY DIST", options.resetByDistance)

        if (!gData.mouseOver && !gData.tweening) {
            gData.tweening = true;
            gData.resetting = false;

            // this._saveGlyph(i);
            this.TweenLite.to( gData, options.resetDuration, {
                overwrite: 1,
                tween: 1.0,
                ease: options.resetLinear ? Linear.easeNone : Expo.easeOut,
                delay: startDelay + options.resetDelay,
                onStart: this._startTweenReset,
                onStartParams: [ i ],
                onComplete: this._finishTweenReset,
                onCompleteParams: [ i ]
            });
        }
    },

    _updateGlyphHitTest: function() {
        var options = this.options;

        //Any remaining glyphs that aren't tweening, and aren't under mouse, just tween them 
        //after a short delay
        var delay = 0;
        for (var i=0; i<this.textMesh.glyphs.length; i++) {
            this._addTween(i, delay);
            // delay += options.resetDelayIncrement;
        }

        this._updateKillTweens();
    },

    _updateMouseInteractions: function() {
        var mouse = this.mouse,
            lastMouse = this.lastMouse,
            world = this.world,
            width = this.camera.viewportWidth,
            height = this.camera.viewportHeight;

        var options = this.options;
        var mousePush = options.mouseStrength;
        var mousePushThreshold = options.mouseRadius;

        var strength = options.spinStrength;
        tmp3.copy( mouse );
        tmp3.sub( lastMouse );
        tmp3.normalize();
        tmp3.scale(mousePush);

        var mouseMoved = mouse.distance(lastMouse) > options.minMouseMotion;

        // if (options.resetWhileIdle && !mouseMoved)
        //     return;

        var explode = true;
        for (var i=0; i<world.particles.length; i++) {
            var p = world.particles[i];

            var pDist = p.position.distance(mouse);
            if ( pDist < mousePushThreshold) {
                if (mouseMoved) {
                    p.velocity.add(tmp3);
                }
            }

            if (pDist < mousePushThreshold/2) {
                force.random();
                // force.z = 0;


                var dist = this._normalizedDistanceFromMouse(p);
                if (dist < 0.5) {
                    var power = lerp(strength, 0, dist);
                    force.scale( power );

                    force.z = 0;

                    // if (options.rigid) {
                    //     p.position.add(force);
                    // }
                    p.velocity.add(force);


                    // for (var j=0; j<p.constraints.length; j++) {
                    //     p.constraints[j].stiffness = 0.01;
                    //     p.constraints[j].restingDistance -= lerp(15, 0, dist);
                    //     // p.constraints[j].restingDistance = Math.max(5, p.constraints[j].restingDistance);
                    // }
                        
                } else if (dist > 20) {
                    
                }                
            } else if (options.rigidness > 0) {
                var a = options.rigidness;
                p.position.lerp(p.original, a);
                p.velocity.lerp(zero, a);
                p.acceleration.lerp(zero, a);

                // if (pDist < mousePushThreshold*4) {
                //     for (var j=0; j<p.constraints.length; j++) {
                //         p.constraints[j].stiffness = 0.05;
                //         // p.constraints[j].restingDistance -= .5;
                //         // p.constraints[j].restingDistance = Math.max(5, p.constraints[j].restingDistance);
                //     }
                // }
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

        this.screenLength = Math.sqrt(width*width + height*height);
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

    renderCanvas: function(context) {
        // fill = typeof fill === "boolean" ? fill : true;
        // noIntersect = typeof noIntersect === "boolean" ? noIntersect : false;

        var fill = this.options.fill;
        var noIntersect = false;

        var style = "rgba("+ ~~(this.color.r*255)+","+ ~~(this.color.g*255) +","+ ~~(this.color.b*255) + "," + this.color.a +")";
        if (fill)
            context.fillStyle = style;
        else
            context.strokeStyle = style;

        drawTriangles(context, this.world.particles, this.camera, fill, noIntersect);
    },

    destroy: function() {
        this.world.particles.length = 0;
        this.text = null;
        this.world = null;
        this.webGLRenderer = null;
        this.camera = null;
        this.face = null;
    },

    renderWebGL: function() {
        var lines = !this.options.fill;
        if (this.webGLRenderer) {
            this.webGLRenderer.render(this.width, this.height, 
                        this.world.particles, this.camera, this.color, lines);
        }
    },
});


module.exports = TextManager;


// renderer = new TextRenderer("STORYTELLING.\nCRAFT.\nEXPLOSIONS.", glContext);
// renderer.update();
// renderer.draw();

