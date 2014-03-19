var domready = require('domready');
require('raf.js');

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
// var stats = require('stats');

var OrthographicCamera = require('cam3d').OrthographicCamera;
var PerspectiveCamera = require('cam3d').PerspectiveCamera;


module.exports = function() {
    var width = window.innerWidth,
        height = 500;

    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = "absolute";
    canvas.style.top = 0;
    canvas.style.left = 0;

    document.body.appendChild(canvas);

    var context = canvas.getContext("2d");  



    var statsDOM = document.createElement("span");
    statsDOM.style.position = "absolute";
    statsDOM.style.top = "0";
    statsDOM.style.left = "0";
    statsDOM.innerHTML= "FPS";
    document.body.appendChild(statsDOM);

    requestAnimationFrame(render);

    var face = util.getFace('uni sans bold');

    var fontSize = 127;

    Glyph.SAVE_CONTOUR = false;
    var simp = Math.max(1, fontSize/50);

    var text = new Text3D("CRAFT.\nTECHNOLOGY.\nEXPLOSIONS.", face, fontSize, 10, 3);
    console.log(text.text.length);

    //Give each char a "Config"
    //This is only useful for problematic fonts that
    //use unusual winding rules (e.g. Uni Sans)


    var tmp = new Vector3();
    var tmp2 = new Vector3();
    var tmp3 = new Vector3();

    var deform = new Matrix4();

    var time = 0;
    var resetting = false,
        resetTime = 0,
        resetDuration = 10;

    var shockParams = new Vector3(10, 0.7, 0.1);
    var mouse = new Vector3();
    var lastMouse = new Vector3();
    var normCoords = new Vector3();




    //setup a camera with 85 degree FOV
    // var camera = new PerspectiveCamera(85 * Math.PI/180, width, height);
    var camera = new OrthographicCamera();
    camera.setToOrtho(false, width, height);
    // camera.setToOrtho(false, fontSize, fontSize / width/height);

    var cameraRadius = 150,
        rotation = 0;

    // window.addEventListener("mousemove", function(ev) {
    //     mouse.x = ev.clientX;
    //     mouse.y = ev.clientY;
    // }, false);
    
    var world = new World();
    world.addText3D(text);


    world.floor = height;

    //destroy the text object to free up some memory
    text.destroy();

    var zero = new Vector3();

    function easeOutExpo (t, b, c, d) {
        return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
    };

    window.addEventListener("keydown", function(ev) {
        resetTime = 0;
        resetting = true;
        savePosition();
    }, true);

    window.addEventListener("mousedown", function(ev) {
        mouse.x = ev.pageX;
        mouse.y = ev.pageY;


        // mouseForce(mouse, true);
    }, true);

    window.addEventListener("touchstart", function(ev) {
        ev.preventDefault();
        mouse.x = ev.changedTouches[0].clientX;
        mouse.y = ev.changedTouches[0].clientY;


        // mouseForce(mouse, true);
    }, true);

    window.addEventListener("touchmove", function(ev) {
        ev.preventDefault();
        mouse.x = ev.changedTouches[0].clientX;
        mouse.y = ev.changedTouches[0].clientY;


        // mouseForce(mouse, true);
    }, true);

    window.addEventListener("mousemove", function(ev) {
        mouse.x = ev.pageX;
        mouse.y = ev.pageY;

        // resetting = false;
        // resetTime = 0;



        // mouseForce(mouse, true);
    }, true);


    function savePosition() {
        for (var i=0; i<world.particles.length; i++) {
            var p = world.particles[i];
            p.lastPosition.copy(p.position);
        }   
    }


    function render() {
        time += 0.01;

        // stats.begin();
            
        world.step(0.1);

        if (resetting) {
            var a = resetTime / resetDuration;
            a = easeOutExpo(resetTime, 0, 1, resetDuration);

            if (a > 0.995) //snap to edge
                a = 1;

            resetTime += 0.1;
            if (resetTime > resetDuration) {
                resetting = false;

                resetTime = 0;
            } else {
                var moreToReset = false;
 
                for (var i=0; i<world.particles.length; i++) {
                    var p = world.particles[i];

                    p.position.copy(p.lastPosition).lerp(p.original, a);
                    p.velocity.lerp(zero, a);
                    p.acceleration.lerp(zero, a);
                }
            }
            
        }

        updateMouseInteractions();
            
        // var a = 0.005;
        // for (var i=0; i<world.particles.length; i++) {
        //     var p = world.particles[i];
            
        //     p.position.lerp(p.original, a);
        //     p.velocity.lerp(zero, a);
        //     p.acceleration.lerp(zero, a);
        // }

        rotation += 0.01;
        // orbitCamera();

        requestAnimationFrame(render);

        context.clearRect(0, 0, width, height);

        context.fillStyle = 'black';
        // context.fillRect(0, 0, 12, 12);

        context.save();
        
         // -1 * pointScale);
        // ctx.translate(0, -1 * face.ascender);
        // context.translate(0, 100)

        context.translate(0, 0);

        // for (var i=0; i<text.glyphs.length; i++)
        //     drawGlyph(context, text.bounds, text.glyphs[i], false, deformAmount);

        
        drawTriangles(context, world.particles, true, false);
        
        context.fillStyle = 'blue';
        // drawPoints(context, world.particles);

        context.restore();

        context.fillStyle = 'black';
        context.fillRect( text.bounds.minX, text.bounds.minY, 5, 5 );
        context.fillRect( text.bounds.maxX, text.bounds.maxY, 5, 5 );

        for (var i=0; i<text.glyphs.length; i++) {
            var g = text.glyphs[i];

            context.fillStyle = 'red';
            context.fillRect( g.bounds.minX, g.bounds.minY, 4, 4 );
            context.fillRect( g.bounds.maxX, g.bounds.maxY, 4, 4 );            
        }



        // stats.end(statsDOM);
    }

    var lastMouse = new Vector3();

    function updateMouseInteractions() {
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
    }

    function mouseForce(mouse, explode) {
        var force = new Vector3();

        // if (explode)
        //     world.gravity.y = 1;

        for (var i=0; i<world.particles.length; i++) {
            var p = world.particles[i];

            force.random();
            // force.z = 0;

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

            var strength = explode ? 7 : 5;
            var power = lerp(strength, 0.0, dist);
            force.scale( power );

            force.z = 0;

            //scale force by distance from mouse..
            // tmp.scale( mouse.distance(p.position) );

            if (explode) {
                p.velocity.add(force);
            } else {
                for (var j=0; j<p.constraints.length; j++) {
                    p.constraints[j].stiffness = 0.1;
                    p.constraints[j].restingDistance -= power*0.25;
                    p.constraints[j].restingDistance = Math.max(5, p.constraints[j].restingDistance);
                }
            }
            // p.velocity.add(force);
        }
    }

    //draws the particles as a triangle list
    function drawTriangles(context, particles, fill, noIntersect) {

        context.beginPath();
        for (var j=0; j<particles.length; j+=3) {
            var p1 = particles[j].position,
                p2 = particles[j+1].position,
                p3 = particles[j+2].position;

            if (noIntersect)
                context.beginPath();

            tmp.set(p1);
            // camera.project(p1, tmp);
            var ox = tmp.x,
                oy = tmp.y;
            context.moveTo(tmp.x, tmp.y);

            tmp.set(p2);
            // camera.project(p2, tmp);
            context.lineTo(tmp.x, tmp.y);

            tmp.set(p3);
            // camera.project(p3, tmp);
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
};