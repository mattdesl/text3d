define(['Class', 
        'PIXI',
		'flick/Vector2', 
		'TweenLite',
        'flick/ColorManager',
        'libjs/utils/Util'], 
		function(Class, 
                PIXI,
				Vector2, 
				TweenLite,
                ColorManager,
                Util) {

    //A simple sprite with position/velocity and a circle hit area
    var BaseSprite = new Class({
        
        Extends: PIXI.Sprite,

        initialize: 
        function BaseSprite(textureKey) {
            PIXI.Sprite.call(this, PIXI.Texture.fromImage(textureKey));

            if (Util.support.isRetina)
                this.scale = new PIXI.Point(0.5, 0.5);
        },
    });

    return BaseSprite;
});