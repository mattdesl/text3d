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

    var fontSize = 108;

    Glyph.SAVE_CONTOUR = true;
    var text = new Text3D("2", face, fontSize, 8, 3);
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
        resetDuration = 1000;

    var shockParams = new Vector3(10, 0.7, 0.1);
    var mouse = new Vector3();
    var normCoords = new Vector3();




    //setup a camera with 85 degree FOV
    var camera = new PerspectiveCamera(85 * Math.PI/180, width, height);
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
    }, true);

    window.addEventListener("mousedown", function(ev) {
        mouse.x = ev.pageX;
        mouse.y = ev.pageY;


        mouseForce(mouse, true);
    }, true);

    window.addEventListener("touchstart", function(ev) {
        ev.preventDefault();
        mouse.x = ev.changedTouches[0].clientX;
        mouse.y = ev.changedTouches[0].clientY;


        mouseForce(mouse, true);
    }, true);

    window.addEventListener("touchmove", function(ev) {
        ev.preventDefault();
        mouse.x = ev.changedTouches[0].clientX;
        mouse.y = ev.changedTouches[0].clientY;


        mouseForce(mouse, true);
    }, true);

    window.addEventListener("mousemove", function(ev) {
        mouse.x = ev.pageX;
        mouse.y = ev.pageY;

        resetting = false;
        resetTime = 0;

        mouseForce(mouse, true);
    }, true);

    function render() {
        time += 0.01;

        // stats.begin();
        
        world.step(0.1);

        if (resetting) {
            resetTime += 0.1;
            if (resetTime > resetDuration) {
                resetting = false;
            } else {
                for (var i=0; i<world.particles.length; i++) {
                    var p = world.particles[i];
                    var a = resetTime / resetDuration;


                    a = easeOutExpo(resetTime, 0, 1, resetDuration);

                    p.position.lerp(p.original, a);
                    p.velocity.lerp(zero, a);
                    p.acceleration.lerp(zero, a);
                }
            }
        }
            

        rotation += 0.01;
        orbitCamera();

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

        // drawPoints(context, world.particles);
        drawTriangles(context, world.particles, true, false);

        context.restore();

        // stats.end(statsDOM);
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


    function orbitCamera() {
        //orbit our camera a little around center 
        var hr = rotation;

        var x = (Math.cos(hr)) * cameraRadius * 0.5,
            y = (Math.sin(hr*0.25)) * cameraRadius * 0.1;

        // camera.position.y = -20;
        // camera.position.x = x;
        // camera.position.z = z;
        // 
        
        
        camera.position.x = 0;
        camera.position.y = 0;
        camera.position.z = 300;

        //keep the camera looking at centre of world
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0); 

        camera.position.x += width/2;
        camera.position.y += height/2;

        //call update() to create the combined matrix
        camera.update(); 
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

            camera.project(p1, tmp);
            var ox = tmp.x,
                oy = tmp.y;
            context.moveTo(tmp.x, tmp.y);

            camera.project(p2, tmp);
            context.lineTo(tmp.x, tmp.y);

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

            camera.project(pos, tmp);

            context.fillRect(tmp.x-sz/2, tmp.y-sz/2,sz, sz);
        }
    }
};