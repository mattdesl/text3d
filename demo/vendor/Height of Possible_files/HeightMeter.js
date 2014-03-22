define(['Class', 
        'PIXI',
        'flick/ui/BaseSprite',
        'flick/CanvasUtil',
        'flick/Vector2', 
        'TweenLite',
        'math/lerp',
        'flick/ColorManager'], 
        function(Class, 
                PIXI,
                BaseSprite,
                CanvasUtil,
                Vector2, 
                TweenLite,
                lerp,
                ColorManager) {

    var TEXT_XOFF = -25;
    var TEXT_YOFF = 0;
    var ARROW_YOFF = 2;

    //A simple sprite with position/velocity and a circle hit area
    var HeightMeter = new Class({
        
        Extends: PIXI.DisplayObjectContainer,

        value: {
            set: function(val) {
                this._value = val;
                this.update(val);
            },

            get: function() {
                return this._value;
            }
        },

        initialize: 
        function HeightMeter(minHeight, maxHeight) {
            PIXI.DisplayObjectContainer.call(this);

            this.minHeight = minHeight||12;
            this.maxHeight = maxHeight||64;

            this.dots = new PIXI.Graphics();
            this.snaps = [];

            var numDots = 8;
            this.dots.beginFill(0x24262f);
            var sz = 5, pad = 20+sz/2, y = 0;
            for (var i=0; i<numDots; i++) {
                this.dots.drawRect(0, y, sz, sz);
                this.snaps.push( y );
                y += pad;
            }

            this.width = 40;
            this.height = y-pad+sz;

            //normalize the snap values
            for (var i=0; i<this.snaps.length; i++)
                this.snaps[i] /= this.height;

            this.dotSize = sz;

            this.dots.endFill();
            this.addChild(this.dots);

            this.lastVal = 0;

            this.arrow = new BaseSprite('flick-height-arrow.png');
            this.addChild(this.arrow);

            this.arrow.anchor.set(0.5, 0.5);
            this.arrow.position.x = -15;

            this.number = CanvasUtil.createText('0', CanvasUtil.BRANDON, 13, "#24262f", "bolder");
            this.addChild(this.number);
            

            this.meters = CanvasUtil.createText('METERS', CanvasUtil.BRANDON, 9, "#24262f", "bold");
            this.addChild(this.meters);
            this.meters.position.x = Math.round(TEXT_XOFF - this.meters.width);

            this.animating = false;
            this._value = 0.0;
            this.update(this._value);
        },

        onAnimatedIn: function() {
            this.animating = false;
        },

        onAnimatedOut: function() {
            this.visible = false;
            this.animating = false;
        },

        animateIn: function() {
            this.visible = true;
            this.animating = true;
            this.alpha = 0.0;
            TweenLite.to(this, 1.0, {
                alpha: 1.0,
                overwrite: 1,
                onComplete: this.onAnimatedIn.bind(this)
            });
        },

        animateOut: function() {
            this.animating = true;
            TweenLite.to(this, 1.0, {
                alpha: 0.0,
                overwrite: 1,
                onComplete: this.onAnimatedOut.bind(this)
            });
        },

        redrawText: function() {
            CanvasUtil.redrawText(this.number);
            CanvasUtil.redrawText(this.meters);
            this.number.position.x = Math.round(TEXT_XOFF - this.number.width);
            this.meters.position.x = Math.round(TEXT_XOFF - this.meters.width);

            this.update(this._value);
        },

        //Updates with a normalized value between 0..1
        update: function(value) {
            value = Math.max(0.0, Math.min(1.0, value||0));
            this._value = value;

            value = 1.0 - value;

            // value = this.nearestSnap(value);

            var mixed = lerp(this.minHeight, this.maxHeight, (1-value));
            var newVal = Math.round(mixed);
            if (newVal !== this.lastVal) {
                this.number.setText( newVal );
                this.number.updateText();
                this.lastVal = newVal;
            }
            
            this.arrow.position.y = Math.min(this.height - ARROW_YOFF, value*this.height + ARROW_YOFF);
            this.number.position.x = Math.round(TEXT_XOFF - this.number.width);

            var yoff = 5;
            this.number.position.y = Math.round(this.arrow.position.y - this.number.height/2 - yoff);
            this.meters.position.y = Math.round(this.number.position.y + this.number.height - 4);
            //Snap to dot?
        },
        
        nearestSnap: function(value) {
            var minDist = Number.MAX_VALUE;
            var minSnap = value;
            for (var i=0; i<this.snaps.length; i++) {
                var s = this.snaps[i];
                var d = Math.abs(value - s);
                if (d < minDist) {
                    minDist = d;
                    minSnap = s;
                }
            }
            return minSnap;
        },
    });

    return HeightMeter;
});