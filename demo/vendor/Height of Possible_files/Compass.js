define(['Class', 
        'PIXI',
        'flick/ui/BaseSprite',
        'flick/CanvasUtil',
		'flick/Vector2', 
		'TweenLite',
        'flick/ColorManager'], 
		function(Class, 
                PIXI,
                BaseSprite,
                CanvasUtil,
				Vector2, 
				TweenLite,
                ColorManager) {

    //A simple sprite with position/velocity and a circle hit area
    var Compass = new Class({
        
        Extends: PIXI.DisplayObjectContainer,

        angle: {
            set: function(val) {
                this._angle = val;
                this.sprite.rotation = val;
                this.updateAngle();
            },

            get: function() {
                return this._angle;
            }
        },

        initialize: 
        function Compass() {
            PIXI.DisplayObjectContainer.call(this);
            this.sprite = new BaseSprite('flick-compass.png');
            this.sprite.anchor = new PIXI.Point(0.5,0.5);
            this._angle = 0;

            this.addChild(this.sprite);
            this.width = this.sprite.width;
            this.height = this.sprite.height;

            this.currentAngle = 0;
            this.degrees = CanvasUtil.createText(this.currentAngle, CanvasUtil.BRANDON, 28, "#24262f", 'bold');
            this.addChild(this.degrees);

            this.currentFacing = 'N';
            this.facing = CanvasUtil.createText(this.currentFacing, CanvasUtil.BRANDON, 16, "#24262f", 'bold');
            
            this.addChild(this.facing);

            this.measure = new PIXI.Graphics();
            this.addChild(this.measure);

            this.updateText();
            this.updateAngle();
        },

        updateAngle: function() {
            var dirty = false;

            var deg = this._angle * 180/Math.PI;
            var eps = 1.5;
            deg = Math.round(deg);
            // if (deg < 0)
            //     deg = 360 + deg;
            if ( Math.abs(this.currentAngle - deg) > eps ) {
                dirty = true;
                this.currentAngle = deg;    
                this.degrees.setText(this.currentAngle);
            }
            
            var oldFace = this.currentFacing;

            var low = 20,
                mid = 5;
            if (deg < -low) {
                this.currentFacing = 'NW';
            } else if (deg >= -mid && deg <= mid) {
                this.currentFacing = 'N';
            } else if (deg > low) {
                this.currentFacing = 'NE';
            }

            if (oldFace !== this.currentFacing)
                this.facing.setText(this.currentFacing);

            if (dirty)
                this.updateText();
        },

        redrawText: function() {
            CanvasUtil.redrawText(this.facing);
            CanvasUtil.redrawText(this.degrees);
            this.updateText();
        },

        updateText: function() {
            this.degrees.updateText();
            this.facing.updateText();

            this.degrees.position.x = Math.round(-this.sprite.width/2 - this.degrees.width - 5);
            this.degrees.position.y = Math.round(-this.degrees.height + 10);

            this.facing.position.x = Math.round(-this.sprite.width/2 - this.facing.width - 5);
            this.facing.position.y = 0;
        },
    });

    return Compass;
});