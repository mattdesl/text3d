define(['Class', 'jquery', 'PIXI', 'TweenLite', 'libjs/utils/Util'],function(Class, $, PIXI, TweenLite, Util){
    var DOMUtil = new Class({

    });

    DOMUtil.setupSprites = function(container, selector) {
        container = container || undefined;
        selector = selector || '[data-sprite]';

        $( selector, container ).each(function(i, val) {
            var item = $(val);

            var tex = PIXI.TextureCache[ item.data('sprite') ];
            if (tex && tex.frame) {
                var frame = tex.frame;

                var retina = Util.support.isRetina;
                var tw = retina ? tex.baseTexture.width/2 : tex.baseTexture.width;
                var th = retina ? tex.baseTexture.height/2 : tex.baseTexture.height;
                var x = retina ? -frame.x/2 : -frame.x;
                var y = retina ? -frame.y/2 : -frame.y;
                var image = $('<div>').css({
                    background: 'url('+tex.baseTexture.source.src+') no-repeat',
                    backgroundPosition: (x)+'px '+(y)+'px',
                    width: retina ? frame.width/2 : frame.width,
                    height: retina ? frame.height/2 : frame.height,
                    backgroundSize: tw+'px '+th+'px',
                });

                item.append(image);
            } else
                console.warn("Could not find PIXI Texture for "+item.data('sprite'));
        });
    };
    DOMUtil.attachTouchFade = function(items) {
        $(items).on('touchstart', function() {
            TweenLite.to( this, 0.5, {
                opacity: 0.6,
                ease: Expo.easeOut
            });
        }).on('touchend', function() {
            TweenLite.to( this, 0.5, {
                opacity: 1,
                ease: Expo.easeOut
            });
        });
    };

    return DOMUtil;
});