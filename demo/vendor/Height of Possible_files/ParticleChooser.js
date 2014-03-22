define(['Class',
        'PIXI',
        'flick/ui/BaseSprite', 
        'flick/Vector2', 
        'flick/Themes',
        'flick/GrowingRings',
        'flick/CanvasUtil',
        'libjs/utils/Util',
        'math/lerp',
        'TweenLite',
        'libjs/signals/Signal',
        'flick/FlickSprite'], 
        function(Class, 
                PIXI,
                BaseSprite,
                Vector2, 
                Themes,
                GrowingRings,
                CanvasUtil,
                Util,
                lerp,
                TweenLite,
                Signal,
                FlickSprite) {

    var DIST = 150;
    var tmp = {x:0, y:0, z:0};
    var tmp2 = new Vector2();

    //Takes into account 3D positioning and shadow.
    var ParticleChooser = new Class({

        Extends: PIXI.DisplayObjectContainer,

        //a list of ParticleSprites...
        initialize: function(particles, width, height) {
            PIXI.DisplayObjectContainer.call(this);

            this.particles = particles;

            this.onParticleChange = new Signal();
            this.onSwipeStart = new Signal();
            this.onSwipeEnd = new Signal();
            this.onSwipeUpdate = new Signal();
            this.onSnapEnd = new Signal();

            this.width = width;
            this.height = height;

            //The angle in RADIANS 
            this._value = 0;
            this.lastIndex = 0;
            this.index = 0;
            
            for (var i=0; i<particles.length; i++) {
                // var txt = new PIXI.Text(i+": "+Themes[i].key);
                // particles[i].addChild(txt);

                this.addChild(particles[i]);
                particles[i].position.set(width/2, height/2);
                particles[i].visible = i === this.index;
            }

            this.shadowContainer = new PIXI.DisplayObjectContainer();

            this.shadows = [];
            this.shadowAlpha = 0.25;
            this.shadowScale = new Vector2(0.65, 0.175);
            for (var i=0; i<particles.length; i++) {
                var s = new BaseSprite('flick-particle-shadow.png');
                s.anchor.set(0.5, 0.5);

                this.shadowContainer.addChild(s);

                s.scale = this.shadowScale.clone();

                this.shadows[i] = s;
            }

            this.swiping = false;
            this.lastPos = new Vector2();

            // this.value = 0.5;
            this.time = 0;
            this.animating = false;
            this.onParticleChange.dispatch();   


            // for (var i=0; i<this.particles.length; i++) {
                // var cc = this.getIndex( this.roundedValue(this._value) )
                // var vis = cc===i;
                // this.particles[i].visible = vis;
                // this.shadows[i].visible = vis;
            // }
            
            // TweenLite.to(this, 1.0, {
            //     delay: 2,
            //     value: this.roundedValue(0.01),
            //     onComplete: this.onFinishAnimating.bind(this),
            //     onStart: this.onStartAnimating.bind(this)
            // });
    
            this._enabled = true;
            this.update();
        },

        value: {
            set: function(val) {

                var steps = this.particles.length;
                //distance between steps, in radians
                var f = (Math.PI*2) / steps;

                //the amount we want to rotate
                var endAngle = Math.PI*2-f;

                val *= endAngle;
                val = val % (Math.PI*2);
                if (val < 0)
                    val += Math.PI*2;

                this._value = val / endAngle;

                this.update();
            },
            get: function() {
                return this._value;
            }
        },

        makeEnabled: function() {
            this.enabled = true;
        },

        enabled: {
            set: function(val) {
                this._enabled = val;
                this.update();
            },
            get: function() {
                return this._enabled;
            }
        },

        startSelection: function() {
            this.animating = true;
            this.animateIn();
        },

        endSelection: function() {
            this.animating = false;
        },

        resize: function(width, height) {
            this.width = width;
            this.height = height;

            // this.position.set(width/2, height/2);
        },

        getCurrent: function() {
            return this.particles[ this.index ];
        },

        kill: function() {
            TweenLite.killTweensOf(this);
        },

        handleSnapEnd: function(onComplete) {
            this.onSnapEnd.dispatch();
            if (onComplete)
                onComplete();
        },

        roundedValue: function(value) {
            value = typeof value === "number" ? value : this._value;

            var steps = this.particles.length;
            //distance between steps, in radians
            var f = (Math.PI*2) / steps;

            //the amount we want to rotate
            var endAngle = Math.PI*2-f;
            
            value = value * endAngle
            var t = f * Math.round( value / f);
            return t / endAngle;
        },


        getNormalizedValue: function(value) {
            value = typeof value === "number" ? value : this._value;

            //returns a value between 0 and 1 for the spinner

            var steps = this.particles.length;





            var f = (Math.PI*2) / steps;
            var endAngle = Math.PI-f;
            var t = -Math.PI + (value * endAngle);

            var cs = Math.cos(t - Math.PI/2),
                sn = Math.sin(t - Math.PI/2),
                ang = Math.atan2(cs, sn);

            var e = Math.PI;
            // value = (ang + e) / (e * 2);
            return value;
            


            // for (var i=0; i<steps; i++) {
            //     // t = f * Math.round( t / f );

            //     var cs = Math.cos(t - Math.PI/2),
            //         sn = Math.sin(t - Math.PI/2);
        },

        getIndex: function(value) {
            value = typeof value === "number" ? value : this._value;
            value = this.getNormalizedValue(value);

            var newIdx;

            // value = this.roundedValue(value);
            if (value < 0 || value > 1) {

                newIdx = Math.round(Math.abs(value) * (this.particles.length-1)) % this.particles.length;    

                // newIdx = (Math.abs(Math.round(value * (this.particles.length-1) )) % this.particles.length); 
            } else {
                newIdx = Math.round(value * (this.particles.length-1) );    
            }
            
            return newIdx;
        },

        //Snaps the current tween to its rounded state..
        snap: function(onComplete, duration, delay, ease, onUpdate) {
            duration = typeof duration==="number" ? duration : 0.35;

            var rounded = this.roundedValue(this._value);
            TweenLite.to(this, duration, {
                value: rounded,
                delay: delay||0,
                overwrite: 1,
                ease: ease||Expo.easeOut,
                onUpdate: onUpdate,
                onComplete: this.handleSnapEnd.bind(this, onComplete)
            });

            return rounded;
        },

        onParticleAnimatedOut: function(index) {
            this.particles[index].visible = false;
            this.shadows[index].visible = false;
            // this.update(1, true);
        },

        animateOut: function() {
            
        },


        stopAllRings: function() {
            for (var i=0; i<this.particles.length; i++) {
                this.particles[i].stopRings();
            }
        },

        stopAllLoops: function() {
            for (var i=0; i<this.particles.length; i++) {
                this.particles[i].stopLoop();
            }
        },

        //Animates in all the particles aside from the one being chosen
        animateIn: function() {
            
        },

        swipeStart: function(pos) {
            this.animating = true;
            this.lastPos.copy(pos);
            this.swiping = true;

            this.onSwipeStart.dispatch();
        },

        swipeEnd: function(pos) {
            var wasSwiping = this.swiping;
            this.lastPos.copy(pos);
            this.swiping = false;
            this.animating = false;
            if (wasSwiping) {
                this.onSwipeEnd.dispatch();
            }
        },

        swipeMove: function(pos) {
            if (this.swiping) {
                var dx = (pos.x - this.lastPos.x);
                //todo: clamp max for large screens
                var newVal = (this._value - dx/50);
                    

                TweenLite.to(this, 0.5, {
                    overwrite: 1,
                    value: newVal
                });
                    

                this.lastPos.copy(pos);

                this.onSwipeUpdate.dispatch(dx > 0);
            }
        },

        update: function() {
            var newIdx = this.getIndex();
            
            var step = (1/(this.particles.length));
            var edge0 = newIdx / (this.particles.length-1); //this.roundedValue(this._value);


            var steps = this.particles.length;

            var x = this.width/2,
                y = 0,
                radius = this.width;

            var f = (Math.PI*2) / steps;
            var endAngle = Math.PI*2-f;
            var t = -Math.PI + (this._value * endAngle);
            
            for (var i=0; i<steps; i++) {
                var cs = Math.cos(t - Math.PI/2),
                    sn = Math.sin(t - Math.PI/2);

                var nx = x + cs * radius,
                    ny = y + sn * radius;

                var p = this.particles[i];
                var alpha = (sn/2+0.5);
                var scale = p.defaultScale * (alpha * alpha);
                // scale = Math.min(scale, p.defaultScale);

                p.position.x = nx;

                // console.log(i, newIdx);

                p.alpha = alpha;
                
                p.scale.set(scale * p.scaleFactor, scale * p.scaleFactor);

                var s = this.shadows[i];
                var sc = 0.75 * alpha;

                s.alpha = alpha * this.shadowAlpha; 
                s.position.set( this.particles[i].x , this.height/2 + 100 );
                s.scale.set(this.shadowScale.x * sc, this.shadowScale.y * sc);


                var vis = alpha > 0.05;

                if (!this._enabled) {
                    vis = i === newIdx;
                }

                p.visible = vis;
                s.visible = vis;

                t -= f;

                //var edge1 = edge0 + step;
                //var x = this._value;
                //var a = Math.max(0, Math.min(1, (x - edge0)/(edge1 - edge0)));  

                //a = a > 0.5 ? (1-a) : a;
                // this.particles[i].alpha =  1 -  a;


                //only show those left/right of our particle
                //var d = i - newIdx;
                // this.particles[i].visible = true; //Math.abs(d) <= 1;
                // this.particles[i].position.x = 0;

                // this.particles[i].position.x = this.width/2 + (d * a * 600);

                // this.particles[i].position.x = this.width/2 + (d * a * 600);


            }
        },
    });

    return ParticleChooser;
});