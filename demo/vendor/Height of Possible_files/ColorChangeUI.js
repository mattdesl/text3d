define(['Class', 
        'PIXI',
		'flick/Vector2', 
		'TweenLite',
        'flick/ColorManager',
        'math/lerp',
        'math/smoothstep',
        'libjs/utils/Util',
        'libjs/signals/Signal'], 
		function(Class, 
                PIXI,
				Vector2, 
				TweenLite,
                ColorManager,
                lerp,
                smoothstep,
                Util,
                Signal) {

    var COUNT = 6;

    //A simple sprite with position/velocity and a circle hit area
    var ColorChangeUI = new Class({
        
        Extends: PIXI.DisplayObjectContainer,

        initialize: 
        function ColorChangeUI() {
            PIXI.DisplayObjectContainer.call(this);

            

            this.radius = 19.0;
            this.bigRadius = 19.0;
            this.smallRadius = 4.0;
            this.spacing = 30;

            this.interactive = true;
            this.buttonMode = true;

            this.startX = 42;
            this.hitArea = new PIXI.Rectangle(this.startX - this.bigRadius, -this.bigRadius, 
                            (this.spacing*(COUNT-1)) + this.bigRadius*2, this.bigRadius*2);

            this.bigCircle = {
                scale: 1.0,
                alpha: 1.0,
            };

            this.circles = [];
            for (var i=0; i<COUNT; i++) {
                this.circles[i] = {
                    alpha: 1.0,
                    scale: 1.0,
                };
            };

            this.lineAnimation = {
                value: 1.0
            };

            this.g = new PIXI.Graphics();

            this.value = 0.0;
            this.time = 0;
            this.update();


            this.addChild(this.g);
        },

        animateIn: function(delay) {
            var dur = 1.0;

            TweenLite.fromTo(this.lineAnimation, dur, {
                value: 0.0
            }, {
                value: 1.0,
                delay: delay,
                ease: Expo.easeOut
            });

            var circDelay = 0.0;
            for (var i=0; i<COUNT; i++) {
                TweenLite.fromTo(this.circles[i], dur, {
                    scale: 0.0
                }, {
                    scale: 1.0,
                    delay: delay + circDelay,
                    ease: Bounce.easeOut
                });
                circDelay += 0.05;
            }

            TweenLite.fromTo(this.bigCircle, dur, {
                scale: 0.0
            }, {
                scale: 1.0,
                delay: delay + circDelay + 0.2,
                ease: Bounce.easeOut
            });
        },

        fromIndex: function(index) {
            return this.roundedValue(index / COUNT);
        },

        roundedValue: function(value) {
            var E = 1000;
            var rval = (1/(COUNT-1))*E;
            var perc = value * E;
            return (rval * Math.ceil( perc / rval )) / E;
        },

        valueFromGlobal: function(x) {
            var xStart = this.startX;
            var barWidth = (this.spacing*(COUNT-1));
            x = Math.max(0, x-xStart);
            return Math.max(0, Math.min(1, x / barWidth));

            // x = Math.max(0, (x - this.hitArea.x));
            // return Math.max(0, Math.min(1, x / this.hitArea.width));
        },

        _renderCanvas: function(session) {
            session.context.lineJoin = 'miter';
            session.context.lineCap = 'square';

            PIXI.DisplayObjectContainer.prototype._renderCanvas.call(this, session);
        },

        update: function() {
            // this.time += 0.05;
            // this.value = Math.sin(this.time/4.)/2.+0.5;

            this.g.clear();

            var xStart = this.startX;
            var barWidth = (this.spacing*(COUNT-1));
            var bigCircleX = xStart + (this.value * barWidth);

            // var anim = Math.sin(this.time)/2.0+0.5;

            var anim = this.lineAnimation.value;

            // this.g.lineStyle(4, 0x24262f);
            // this.g.drawCircle(xoff, 0, this.bigRadius);

            var lineXOff = xStart - this.smallRadius/2 - this.spacing/4;
            var curBarWidth = (xStart+barWidth)*anim;

            this.g.beginFill(0xdadcdd, 0.2);
            var firstLineWidth = Math.max(0, Math.min(lineXOff, curBarWidth));

            this.g.drawRect(0, -1, Math.floor(firstLineWidth), 2);
            this.g.endFill();
            
            // this.g.beginFill(0xffffff, 0.2);
            // this.g.drawRect(0, this.hitArea.y, curBarWidth, this.hitArea.height);
            // this.g.endFill();

            var xoff = xStart;
            lineXOff = xStart + this.smallRadius/2 + this.spacing/4;


            for (var i=0; i<COUNT; i++) {
                var circ = this.circles[i];

                var dx = bigCircleX-xoff;
                // var alpha = Math.abs(bigCircleX-xoff) / this.bigRadius;
                
                var len = Math.sqrt(dx*dx);

                var alpha = 1.-Math.max(0, Math.min(1, len / (this.bigRadius)));

                var scaleAlpha = 1.-Math.max(0, Math.min(1, len / (this.bigRadius*3)));

                //now that alpha is in 0..1 range we can use it to adjust size too
                var scale = lerp(1, 1.5, scaleAlpha);

                //clamp the alpha so it isn't completely invisible
                alpha = Math.min(1, alpha+0.6);

                var sz = this.smallRadius * scale;

                if (i<COUNT-1) {
                    this.g.lineStyle(0);
                    this.g.beginFill(0xdadcdd, 0.2);

                    //fix the dash size based on animation
                    var boxWidth = (this.spacing/2 - 4);
                    boxWidth = Math.max(0, Math.min(boxWidth, (curBarWidth)-(lineXOff)));

                    this.g.drawRect(Math.floor(lineXOff), -1, Math.floor(boxWidth), 2);
                    this.g.endFill();
                    lineXOff += this.spacing;
                }   


                this.g.lineStyle(3, 0xdadcdd, alpha * circ.alpha);
                this.g.drawCircle(xoff, 0, sz * circ.scale );

                xoff += this.spacing;
            }

            this.g.lineStyle(3, 0xdadcdd, this.bigCircle.alpha);
            this.g.drawCircle(bigCircleX, 0, this.bigRadius * this.bigCircle.scale);
        },
    });

    return ColorChangeUI;
});