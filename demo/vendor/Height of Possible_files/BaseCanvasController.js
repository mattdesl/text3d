define(['Class', 
        'framework/controllers/BaseController',
        'ui/CanvasPreloader'], 
        function(Class, 
                 BaseController,
                 CanvasPreloader){


    ////// DEBUG FPS COUNT
    var startTime = 0;
    var msSum = 0;
    var frames = 0;
    var prevTime = 0;
    var isFPS = true;


    //creates a new canvas, adds it to the container, and sets 
    //up the requestAnimationFrame render loop.
	var BaseCanvasController = new Class({
		
		Extends: BaseController,

		init: function(template, data) {
            //sets up container based on parent
			this.parent(template, data);

            this.container.removeClass("section").addClass("canvas-section");
            
            // If data has a canvas selector defined, use that
            if (data && data.canvasSelector){
                this.canvas = $(data.canvasSelector);
            } else {
                this.canvas = $('<canvas>').appendTo(this.container);
            }

            this.context = this.canvas[0].getContext("2d");
            this.canvas[0].width = this.width;
            this.canvas[0].height = this.height;

            //The ratio for retina rendering
            this.ratio = 1.0;

            this.then = Date.now();
            this.fps = 60;
            this.avgMS = 0;
            
            this.animationFrameID = null;
            this.renderBound = this.render.bind(this);
            this.rendering = false;

            this.start();

            // this.preventScroll = function(ev) {
            //     ev.preventDefault();
            // }.bind(this);
            // $(window).bind('touchmove touchstart', this.preventScroll);
		},

        start: function() {
            this.rendering = true;
            this.then = Date.now();
            this.animationFrameID = requestAnimationFrame(this.renderBound);
        },

        stop: function() {
            this.rendering = false;
            if (this.animationFrameID) {
                cancelAnimationFrame(this.animationFrameID);
                this.animationFrameID = null;
            }
        },

        destroy: function() {
            this.stop();
            
            $(window).unbind('touchmove touchstart', this.preventScroll);
            this.parent();
        },

        render: function() { 
            if (!this.rendering)
                return;

            var now = Date.now();
            var dt = (now - this.then);

            var ms = Math.max(0, dt)
            frames++;

            if (this.then > prevTime + 1000) {
                var fps = Math.round((frames * 1000) / (this.then - prevTime));
                var avgMS = (msSum / frames)
                
                this.fps = fps;
                this.avgMS = avgMS;

                msSum = 0;
                prevTime = this.then;
                frames = 0;
            }

            this.then = now;
            
            requestAnimationFrame(this.renderBound);

            var context = this.context;

            context.clearRect(0, 0, this.width*this.ratio, this.height*this.ratio);

            //scale the context based on our retina ratio..
            context.save();
            context.scale(this.ratio, this.ratio);

            this.draw(context, dt);

            //restore back to original scale for next frame
            context.restore();


        },

        //The draw function that subclasses can implement..
        draw: function(context) {

        },

        resize: function(width, height) {
            this.parent(width, height);
            
            if (this.canvas){
                this.canvas[0].width = width;
                this.canvas[0].height = height;
                //now that we've changed canvas size, we need to fix it for retina again...
                this.setupRetina();
            }
        },

        setupRetina: function() {
            //Useful article on the subject:
            //http://www.html5rocks.com/en/tutorials/canvas/hidpi/
            
            var canvasEl = this.canvas[0],
                context = this.context;

            // finally query the various pixel ratios
            var devicePixelRatio = window.devicePixelRatio || 1;

            var backingStoreRatio = context.webkitBackingStorePixelRatio ||
                                context.mozBackingStorePixelRatio ||
                                context.msBackingStorePixelRatio ||
                                context.oBackingStorePixelRatio ||
                                context.backingStorePixelRatio || 1;

            var ratio = devicePixelRatio / backingStoreRatio;

            // upscale the canvas if the two ratios don't match
            if (devicePixelRatio !== backingStoreRatio) {
                var oldWidth = canvasEl.width;
                var oldHeight = canvasEl.height;

                canvasEl.width = oldWidth * ratio;
                canvasEl.height = oldHeight * ratio;

                canvasEl.style.width = oldWidth + 'px';
                canvasEl.style.height = oldHeight + 'px';
            }
            this.ratio = ratio;
        },

	});

	return BaseCanvasController;
});