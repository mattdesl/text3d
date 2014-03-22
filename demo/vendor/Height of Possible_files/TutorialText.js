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

    var TutorialText = new Class({
        
        Extends: PIXI.DisplayObjectContainer,

        initialize: 
        function TutorialText(width, height) {
            PIXI.DisplayObjectContainer.call(this);
            this.width = width;
            this.height = height;
            this.cards = [];

            this.onFinished = new Signal();

            var data = [
                { 
                    title: "STEP 1",
                    text1: "SWIPE TO",
                    text2: "BROWSE"
                },
                {
                    title: "STEP 2",
                    text1: "TAP TO",
                    text2: "CHOOSE"
                },
                {
                    title: "STEP 3",
                    text1: "FLICK TO",
                    text2: "CREATE"
                }
            ];

            for (var i=0; i<data.length; i++) {
                var c = this.addCard(
                                data[i].title, 
                                data[i].text1,
                                data[i].text2 );
                c.container.visible = false;
                this.cards.push( c );
            }
            this.finished = false;
            this.index = -1;

            this.updateColorsBound = this.updateColors.bind(this);
            ColorManager.onValueChange.add(this.updateColorsBound);
        },

        destroy: function() {
            ColorManager.onValueChange.remove(this.updateColorsBound);
        },

        redrawText: function() {
            for (var i=0; i<this.cards.length; i++) {
                var c = this.cards[i];
                CanvasUtil.redrawText(c.text1);
                CanvasUtil.redrawText(c.text2);

                //update positions as size may have changed
                c.text2.position.y = c.text1.position.y + c.text1.height - 20;
            }
        },

        resize: function(width, height) {
            this.width = width;
            this.height = height;
        },

        reset: function() {
            this.finished = false;
            if (this.index >= 0)
                this.animateOutCard(this.index);
            this.index = -1;
        },

        next: function() {
            if (this.finished)
                return;

            if (this.index >= 0) {
                var fun = null;
                if (this.index === this.cards.length-1)
                    fun = this.onFinished.dispatch.bind(this.onFinished);
                this.animateOutCard(this.index, 0, fun);
            }

            this.index++;
            if (this.index > this.cards.length-1) {
                this.index = this.cards.length-1;
                this.finished = true; 
                return;
            }
            this.animateInCard(this.index, 0.4);
        },

        hideContainer: function(c, callback) {
            c.visible = false;
            if (callback)
                callback();
        },

        animateOutCard: function(index, delay, onComplete) {
            var c = this.cards[index];

            TweenLite.to(c.container.position, 1.0, {
                x: -this.width,
                delay: delay,
                ease: Expo.easeOut,
                overwrite: 1,
                onComplete: this.hideContainer.bind(this, c.container, onComplete)
            })
        },

        updateColors: function() {
            var fg = ColorManager.theme.foreground.string;
            for (var i=0; i<this.cards.length; i++) {
                var c = this.cards[i];

                this.setColor(c.text1, fg);
                this.setColor(c.text2, fg);
            }
        },

        setColor: function(text, color) {
            text.style.fill = color;
            text.setStyle(text.style);
            // text.updateText();
        },

        animateInCard: function(index, delay, onComplete) {
            var c = this.cards[index];

            c.container.visible = true;
            TweenLite.fromTo(c.container.position, 1.0, {
                x: -this.width,
            }, {
                x: 0,
                delay: delay,
                ease: Expo.easeOut,
                onComplete: onComplete
            });
        },

        addCard: function(title, text1str, text2str) {
            var container = new PIXI.DisplayObjectContainer();
            this.addChild(container);

            // var stepHeader = new PIXI.DisplayObjectContainer();
            // container.addChild(stepHeader);

            // var text = CanvasUtil.createText(title, CanvasUtil.BRANDON, 16, '#24262f', 'bold');
            
            // var border = new PIXI.Graphics();
            // border.lineStyle(2, '#24262f', 0.1);
            // var padh = 20, padv = 15;
            // border.drawRect(0, 0, text.width+ padh, text.height + padv);
            
            // text.position.set(padh/2, padv/2);
            
            // stepHeader.addChild(border);
            // stepHeader.addChild(text);

            // stepHeader.width = text.width+padh;
            // stepHeader.height = text.height+padv;


            text1 = CanvasUtil.createText(text1str, CanvasUtil.BRANDON, 44, '#dadcdd', 'bolder');
            text2 = CanvasUtil.createText(text2str, CanvasUtil.BRANDON, 44, '#dadcdd', 'bolder');
            container.addChild(text1);
            container.addChild(text2);
            
            text1.position.y = 0;
            text2.position.y = text1.position.y + text1.height - 20;

            return {
                container: container,
                // titleContainer: stepHeader,

                // title: text,
                text1: text1,
                text2: text2
            };
        }

    });

    return TutorialText;
});