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



    var BackButton = new Class({

        Extends: PIXI.Graphics, 

        initialize: function() {
            PIXI.Graphics.call(this);
            this.width = 30;
            this.height = 12;

            this.updateBound = this.update.bind(this);
            ColorManager.onValueChange.add(this.updateBound);

            this.update();
        },

        destroy: function() {
            ColorManager.onValueChange.remove(this.updateBound);

        },

        asRGB: function(color) {
            return (color.r << 16) | (color.g << 8) | (color.b);
        },

        // animateIn: function() {

        // },

        _renderCanvas: function(session) {
            session.context.lineJoin = 'miter';
            session.context.lineCap = 'square';

            PIXI.Graphics.prototype._renderCanvas.call(this, session);
        },

        update: function() {
            var fg = this.asRGB( ColorManager.theme.foreground );

            var lineWidth = 2;

            this.clear();
            // this.lineStyle(2, fg);
            this.beginFill(fg);
            // this.drawRect(0, 0, this.width, this.height);
            this.drawRect(0, Math.floor(this.height/2 - lineWidth/2), this.width, lineWidth);
            this.endFill();

            var left = 2;
            var off = Math.floor(this.height/2);
            this.lineStyle(2, fg);

            

            this.moveTo(off - left, 0);
            this.lineTo(-left, off);

            this.lineTo(-left + off, this.height);

        },
    });

    return BackButton;
});