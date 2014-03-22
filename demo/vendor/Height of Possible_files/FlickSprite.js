define(['Class',
        'PIXI',
        'flick/ui/BaseSprite', 
        'flick/Vector2', 
        'flick/ColorManager',
        'flick/GrowingRings',
        'flick/CanvasUtil',
        'libjs/utils/Util',
        'TweenLite'], 
        function(Class, 
                PIXI,
                BaseSprite,
                Vector2, 
                ColorManager,
                GrowingRings,
                CanvasUtil,
                Util,
                TweenLite) {

    var tmp = new Vector2();
    var CLIP_DELAY = 4;

    //A simple sprite with position/velocity and a circle hit area
    var FlickSprite = new Class({
        
        Extends: PIXI.MovieClip,

        initialize: 
        function FlickSprite(textures, r, x, y) {

            //'6A-1_SkipFrame0000.png'

            PIXI.MovieClip.call(this, textures);



            if (Util.support.isRetina)
                this.scale = new PIXI.Point(0.5, 0.5);

            this.position = new Vector2(x, y);
            this.velocity = new Vector2();
            this.anchor.set(0.5, 0.5);

            this.radius = r||100;    

            this.hitArea = new PIXI.Circle(0, 0, this.radius);

            this.scaleFactor = 1.0;
            this.defaultScale = this.scale.x * 2.0;
            this.grabScale = (this.defaultScale + 0.05);
            this.scale.set(this.defaultScale * this.scaleFactor, this.defaultScale * this.scaleFactor);

            //This is the "current" (tweening) radius
            this.currentRadius = this.radius;


            this.interactive = true;
            

            // this.scale = 1.0;

            //TODO: use a true 3D position/velocity?
            this.z = 0;

            //physics coefficients, determines gravity and such
            this.physicalRadius = 1;
            this.mass = 0.1;
            this.restitution = -0.5;

            this.Cd = 0.47;  // Dimensionless
            this.rho = 1.3; // kg / m^3 // Air/enironment density
            this.A = Math.PI * this.physicalRadius * this.physicalRadius / (10000); // m^2
            this.ag = 8; // MOON gravity //9.81;  // m / s^2

            this.time = 0;

            this.grabRings = new GrowingRings(50, 3);
            this.grabRings.lineWidth = 4.0;
            this.grabRings.scale.set(0.5, 0.5);
            this.addChild(this.grabRings);

            this.loop = false;
            this.playBound = this.gotoAndPlay.bind(this, 0);
            this.animationSpeed = 0.5;
            
            this.onComplete = this.onClipEnd.bind(this);

            this.playLoop = false;


            
            ///// this is going to need to be refactored to use PIXI
            ///   fully, since we'll be using movie clips.
            // this.sprite = PIXI.Sprite.fromFrame("flick-particle-test.png");
        },

        onClipEnd: function() {
            if (!this.playLoop)
                return;
            TweenLite.killDelayedCallsTo(this.playBound);
            TweenLite.delayedCall(CLIP_DELAY, this.playBound);
        },

        //A "safe" way to stop the loop, without killing the animation abruptly.
        stopLoop: function() {
            this.playLoop = false;
            TweenLite.killDelayedCallsTo(this.playBound);
        },

        //A "safe" way to start the loop, without affecting the current animation.
        //If we are currently playing, the loop will continue with its usual discourse (default delay)
        //Otherwise we will start playback immediately or with the given delay
        startLoop: function(delay) {
            this.playLoop = true;
            if (!this.playing) {
                TweenLite.killDelayedCallsTo(this.playBound);
                if (delay)
                    TweenLite.delayedCall(delay, this.playBound);
                else
                    this.playBound();
            }
        },
        
        reset: function() {
            this.grabRings.stop();
            this.grabRings.kill();
            this.grabRings.reset();
        },

        //Checks if the point is inside the bounding radius 
        contains: function(x, y, radiusScale) {
            radiusScale = typeof radiusScale === "number" ? radiusScale : 1.0;
            var radius = this.radius*radiusScale*this.scaleFactor;

            return this.position.distanceSq( tmp.set(x, y) ) < (radius*radius);
        },

        onGrab: function() {
            TweenLite.to(this.scale, 0.5, {
                x: this.grabScale * this.scaleFactor,
                y: this.grabScale * this.scaleFactor,
                ease: Expo.easeOut,
                overwrite: 1
            });

            TweenLite.killDelayedCallsTo(this.playBound);

            
        },

        startRings: function() {
            this.grabRings.start(3.0);
            TweenLite.to(this.grabRings, 0.5, {
                alpha: 1.0,
                ease: Expo.easeOut
            });
        },

        stopRings: function() {
            this.grabRings.stop();
            TweenLite.to(this.grabRings, 0.5, {
                alpha: 0.0,
                ease: Expo.easeOut
            });
        },

        animateToDefaultScale: function(delay) {
            TweenLite.to(this.scale, 1, {
                delay: delay,
                x: this.defaultScale * this.scaleFactor,
                y: this.defaultScale * this.scaleFactor,
                ease: Expo.easeOut
            });
        },

        onFlick: function(vel, dist) {
            this.animateToDefaultScale();

            // this.grabRings.stop();
        },

        onDrop: function() {
            this.animateToDefaultScale();

            // this.grabRings.stop();
        },

        update: function(dt) {
            this.hitArea.radius = this.radius * this.scaleFactor;

            // we can cap to avoid artifacts with collision.. but not needed yet
            if (dt > 40)
                dt = 40;


            // dt = (1/60); //TODO: use proper delta-time calculation
            // dt = dt || (1000/60);
            // dt = dt/1000;

            dt /= 1000;



            var vx = this.velocity.x,
                vy = this.velocity.y;

            
            //http://burakkanber.com/blog/modeling-physics-javascript-gravity-and-drag/
            // Drag force: Fd = -1/2 * Cd * A * rho * v * v
            var Fx = -0.5 * this.Cd * this.A * this.rho * vx * vx * vx / Math.abs(vx);
            var Fy = -0.5 * this.Cd * this.A * this.rho * vy * vy * vy / Math.abs(vy);

            Fx = (isNaN(Fx) ? 0 : Fx);
            Fy = (isNaN(Fy) ? 0 : Fy);

            // Calculate acceleration ( F = ma )
            var ax = Fx / this.mass;
            var ay = (Fy / this.mass); 


            var frict = 0.96;

            // Integrate to get velocity
            this.velocity.x += ax*dt;
            this.velocity.y += ay*dt;

            this.velocity.x *= frict;
            this.velocity.y *= frict;

            var mksToPixels = 100;

            // Integrate to get position
            this.position.x += this.velocity.x*dt*mksToPixels;
            this.position.y += this.velocity.y*dt*mksToPixels;

            this.grabRings.stroke = ColorManager.theme.foreground.string;
        },

        ////// only for debugging the hit area, now that everything is pixi
        draw: function(context) {
            var transform = this.worldTransform;
            context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);

            context.globalAlpha = 1.0;
            context.beginPath();


            var projectedRadius = this.currentRadius;
            context.arc(this.position.x, this.position.y, projectedRadius, 0, Math.PI*2);
            context.stroke();
            
            context.lineWidth = 2;
            // this.grabRings.draw(context, this.position);
        }, 
    });

    return FlickSprite;
});