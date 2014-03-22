




var domready = require('domready');
require('raf.js');

// var cloth = require('./cloth.js');
// var text = require('./text.js');


var TextManager = require('./TextManager');


var WebGLContext = require('kami').WebGLContext;


domready(function() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = "absolute";
    canvas.style.top = 0;
    canvas.style.left = 0;

    document.body.appendChild(canvas);

    var webgl = true;
    var useAA = true;

    var context;

    if (webgl) {
        context = new WebGLContext(width, height, canvas, {
            antialias: true
        });
    } else 
        context = canvas.getContext("2d");  

    var textManager = new TextManager("STORYTELLING.\nCRAFT. TECHNOLOGY.", {
        fontSize: 50,
        // simplify: 50,
        // steps: 30,
    }, TweenLite, dat);
    textManager.resize(width, height);
    if (webgl)
        textManager.initWebGL(context.gl, useAA);

    textManager.style = 0;

    function resize(ev) {
        var TARGET_WIDTH = 1024;
        var TARGET_HEIGHT = 768;

        var width = window.innerWidth;
        var height = window.innerHeight;

        // var scale = width > height ? width/TARGET_WIDTH : height/TARGET_HEIGHT;
        var scale = width / TARGET_WIDTH;

        if (webgl) {
            context.resize(width, height);
        } else {
            canvas.width = width;
            canvas.height = height;
        }

        //set new window size
        textManager.resize(width, height);

        //update camera matrices
        textManager.scale = scale;
        textManager.setPosition( (width-textManager.width*scale)/2, (height-textManager.height*scale)/2 )
        textManager.updateCamera();
    }
    resize();
    textManager.onCreated = resize;

    window.addEventListener("resize", resize);


    window.addEventListener("keydown", function(ev) {
        textManager.resetAll();
    }, true);


    window.addEventListener("touchstart", function(ev) {
        ev.preventDefault();
        var x = ev.changedTouches[0].clientX;
        var y = ev.changedTouches[0].clientY;
        textManager.onTouchStart(x, y);
    }, true);

    window.addEventListener("touchmove", function(ev) {
        ev.preventDefault();
        var x = ev.changedTouches[0].clientX;
        var y = ev.changedTouches[0].clientY;
        textManager.onTouchMove(x, y);

    }, true);

    window.addEventListener("mousedown", function(ev) {
        textManager.onTouchStart(ev.clientX, ev.clientY);
    }, true);

    window.addEventListener("mousemove", function(ev) {
        textManager.onTouchMove(ev.clientX, ev.clientY);
    }, true);



    requestAnimationFrame(render);
    function render() {
        requestAnimationFrame(render);

        textManager.update(0.1);

        // textManager.color.r = 1;
            
        
        if (webgl) {
            var gl = context.gl;
            gl.clearColor(1,1,1,1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            textManager.renderWebGL();
        } else {
            context.clearRect(0, 0, width, height);
            textManager.renderCanvas(context);
        } 
            
    }

});


