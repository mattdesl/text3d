define(['Class', 
        'PIXI',
        'flick/ui/BaseSprite',
        'flick/CanvasUtil',
        'flick/Vector2', 
        'TweenLite',
        'libjs/signals/Signal',
        'math/lerp',
        'flick/ColorManager'], 
        function(Class, 
                PIXI,
                BaseSprite,
                CanvasUtil,
                Vector2, 
                TweenLite,
                Signal,
                lerp,
                ColorManager) {

    var linkPadH = 20;
    var linkPadV = 15;

    var EndMessage = new Class({

        Extends: PIXI.DisplayObjectContainer,

        initialize: function(width, height) {
            PIXI.DisplayObjectContainer.call(this);

            this.width = width;
            this.height = height;
            this.centerText1 = CanvasUtil.createText("WHAT’S YOUR", CanvasUtil.BRANDON, 44, '#dadcdd', 'bolder');
            this.centerText2 = CanvasUtil.createText("POSSIBLE?", CanvasUtil.BRANDON, 44, '#dadcdd', 'bolder');

            this.subHeader = CanvasUtil.createText("TELL US AT:", CanvasUtil.BRANDON, 16, '#dadcdd', 'bold');
            this.subHeader.alpha = 0.6;

            this.linkContainer = new PIXI.DisplayObjectContainer();
            this.linkText = CanvasUtil.createText("HUMANLYPOSSIBLE.COM", CanvasUtil.BRANDON, 16, '#dadcdd', 'bold');
            this.linkText.position.set(linkPadH/2, linkPadV/2);

            this.linkBorder = new PIXI.Graphics();
            this.linkContainer.width = this.linkText.width+linkPadH;
            this.linkContainer.height = this.linkText.height+linkPadV;

            this.linkContainer.addChild(this.linkBorder);
            this.linkContainer.addChild(this.linkText);

            this.linkContainer.hitArea = new PIXI.Rectangle(0, 0, this.linkContainer.width, this.linkContainer.height);
            this.linkContainer.interactive = true;
            // this.linkContainer.touchstart = this.tweenAlpha.bind(this, this.linkContainer, 0.6);
            // this.linkContainer.touchend = this.linkContainer.touchendoutside = this.tweenAlpha.bind(this, this.linkContainer, 1);
            
            CanvasUtil.attachTouchFade( this.linkContainer );
            this.linkContainer.tap = function() {
                console.log("LINK OUT");
                // window.open('http://humanlypossible.com/');
            }.bind(this);


            this.addChild(this.centerText1);
            this.addChild(this.centerText2);
            this.addChild(this.subHeader);
            this.addChild(this.linkContainer);

            this.resize(width, height);
        },

        tweenAlpha: function(container, alpha) {
            TweenLite.to(container, 0.5, {
                alpha: alpha,
                overwrite: 1,
                ease: Quad.easeOut
            });
        },

        redrawText: function() {
            CanvasUtil.redrawText(this.centerText1);
            CanvasUtil.redrawText(this.centerText2);
            CanvasUtil.redrawText(this.subHeader);
            CanvasUtil.redrawText(this.linkText);

            this.resize(this.width, this.height);
        },

        resize: function(width, height) {
            this.width = width;
            this.height = height;

            this.centerText1.position.set( (width - this.centerText1.width)/2 , 140 );
            this.centerText2.position.set( (width - this.centerText2.width)/2 , this.centerText1.position.y + this.centerText1.height - 20);

            this.subHeader.position.set( (width - this.subHeader.width)/2, this.centerText2.position.y + this.centerText2.height + 40);

            this.linkBorder.clear();
            this.linkBorder.lineStyle(2, 0xdadcdd, 0.1);
            this.linkBorder.drawRect(0, 0, this.linkText.width+ linkPadH, this.linkText.height + linkPadV);
                    
            this.linkContainer.hitArea.width = this.linkContainer.width = this.linkText.width+linkPadH;
            this.linkContainer.hitArea.height = this.linkContainer.height = this.linkText.height+linkPadV;

            this.linkContainer.position.set( (width - this.linkContainer.width)/2, this.subHeader.position.y + this.subHeader.height + 10);
        }, 

    });

    return EndMessage;
});