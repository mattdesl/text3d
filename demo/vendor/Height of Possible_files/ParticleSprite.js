define(['Class',
        'PIXI',
        'flick/ui/BaseSprite', 
        'flick/Vector2', 
        'flick/GrowingRings',
        'flick/CanvasUtil',
        'libjs/utils/Util',
        'TweenLite',
        'flick/FlickSprite'], 
        function(Class, 
                PIXI,
                BaseSprite,
                Vector2, 
                GrowingRings,
                CanvasUtil,
                Util,
                TweenLite,
                FlickSprite) {


    //Takes into account 3D positioning and shadow.
    var ParticleSprite = new Class({

        Extends: FlickSprite,

        initialize: function(textures) {
            FlickSprite.call(this, textures);

            this.shadow = new BaseSprite('flick-particle-shadow.png');
            this.shadow.alpha = 0.20;
            this.shadowAlpha = this.shadow.alpha;
            this.shadow.anchor.set(0.5, 0.5);

            //we'll use a Vector2 type for lerp utils
            this.shadow.scale = new Vector2(0.65, 0.175);

            //our max and min shadow scales..
            this.minShadowScale = this.shadow.scale.clone();
            this.maxShadowScale = this.shadow.scale.clone().scale(1.45);
            
            this.shadow.position.y = 100;

            // this.addChild(this.shadow);
        },

        updateTransform: function() {
            FlickSprite.prototype.updateTransform.call(this);

        },  
    });

    return ParticleSprite;
});