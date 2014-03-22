define(['Class', 'flick/Vector2', 'PIXI', 'TweenLite'], function(Class, Vector2, PIXI, TweenLite) {

    var tmp = new Vector2();

    //A simple sprite with position/velocity and a circle hit area
    var GrowingRings = new Class({

        Extends: PIXI.DisplayObjectContainer,
        
        initialize: 
        function GrowingRings(radius, ringCount) {
            PIXI.DisplayObjectContainer.call(this);

            this.visible = true;
            this.renderable = true;
            this.position = new Vector2();

            this.rings = [];

            for (var i=0; i<ringCount; i++) {
                this.rings.push({
                    alpha: 1,
                    scale: 0,
                    radius: radius||10
                });
            }

            this.alpha = 1.0;
            this.lineWidth = 1.0;
            this.stroke = 'black';
            this.looping = true;
        },

        start: function(duration, delayStep, startDelay) {
            this.looping = true;
            this.animate(duration, delayStep, startDelay);
        },

        stop: function() {
            this.looping = false;
        },

        kill: function(duration, delayStep) {
            duration = typeof duration === "number" ? duration : 0.3;

            var rdur = this.rings.length===0 ? 0 : duration/this.rings.length; //avoid div by 0
            
            var delay = 0;
            delayStep = typeof delayStep === "number" ? delayStep : rdur/2;

            this.stop();
            for (var i=this.rings.length-1; i>=0; i--) {
                var r = this.rings[i];
                TweenLite.to(r, duration, {
                    alpha: 0.0,
                    overwrite: 1,
                    delay: delay
                });
                delay += delayStep;
            }
        },

        animate: function(duration, delayStep, startDelay) {
            var delay = 0;
            duration = duration||0;
            startDelay = startDelay||0;

            var rdur = this.rings.length===0 ? 0 : duration/this.rings.length; //avoid div by 0
            
            delayStep = typeof delayStep === "number" ? delayStep : rdur;

            for (var i=0; i<this.rings.length; i++) {
                var r = this.rings[i];



                this.animateRing(r, duration, delay + startDelay);
                delay += delayStep
            }
        },

        animateRing: function(r, duration, startDelay) {
            if (!this.looping)
                return;
            r.scale = 0;
            r.alpha = 1;
            startDelay = startDelay||0;

            TweenLite.killTweensOf(r);
            TweenLite.to(r, duration, {
                scale: 1.0,
                alpha: 0.0,
                delay: startDelay,
                // ease: ease,
                overwrite: 1,
                onComplete: this.animateRing.bind(this, r, duration, 0)
            });
        },

        reset: function() {
            for (var i=0; i<this.rings.length; i++) {
                var r = this.rings[i];
            	TweenLite.killTweensOf(r);
                r.alpha = 1.0;
                r.scale = 0.0;
            }
            this.looping = true;
        },

        _renderCanvas: function(renderSession) {
            // if the sprite is not visible or the alpha is 0 then no need to render this element
            if(this.visible === false || this.alpha === 0)
                return;
            var context = renderSession.context;
            this.draw(context, this.position);
        },

        draw: function(context, pos) {
            if (this.alpha === 0 || !this.visible)
                return;

            var transform = this.worldTransform;
            context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);

            for (var i=0; i<this.rings.length; i++) {
                var r = this.rings[i];
                if (r.alpha === 0 || r.scale === 0)
                    continue;
                context.strokeStyle = this.stroke;
                context.lineWidth = this.lineWidth;
                context.globalAlpha = r.alpha * this.alpha;
                context.beginPath();
                context.arc(0, 0, r.radius * r.scale, 0, Math.PI*2);
                context.stroke();
            }
        },
    });

    return GrowingRings;
});