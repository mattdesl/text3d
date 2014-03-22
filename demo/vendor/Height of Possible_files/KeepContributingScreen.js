define(['Class', 
        'flick/ui/BaseSprite',
        'framework/controllers/mobile/LostConnectionScreen',
        'PIXI', 
        'TweenLite',
        'framework/auth/Facebook', 
        'ui/SyncAvatar',
        'framework/Network',
        'flick/CanvasUtil',
        'utils/DOMUtil',
        'ui/CanvasPreloader',
        'Global'], function(Class, 
                BaseSprite, 
                LostConnectionScreen,
                PIXI, 
                TweenLite,
                Facebook, 
                SyncAvatar,
                Network,
                CanvasUtil,
                DOMUtil,
                CanvasPreloader,
                Global){

    var KeepContributingScreen = new Class({
        
        Extends: LostConnectionScreen,


        handleInit: function() {
            this.button = null;
            
            LostConnectionScreen.prototype.handleInit.call(this);

            this.avatarScale = 0.55;
            this.avatarYOffset = 150;

            this.container.css("z-index", 900);

            DOMUtil.setupSprites(this.container);
        },



        setupUI: function() {
            this.parent();

            this.button = new BaseSprite('mobile-keep-contributing.png');
            this.button.anchor.set(0.5, 0.5);
            
            CanvasUtil.attachTouchFade(this.button);
            this.button.interactive = true;
            this.button.tap = function() {
                this.animateOut();
                Network.goToContribute();
            }.bind(this);


            this.mainContainer.addChild(this.button);

            this.resize(this.width, this.height);
        },

        resize: function(width, height) {
            this.parent(width, height);

            if (this.button) {
                this.button.position.set(this.width/2, this.height/2+20);
            }
        },

        showDisconnect: function() {
            this.parent();

            this.avatar.connected();
        },

        // animateOut: function() {
        //     TweenLite.to(this.container, 1.0, {
        //         x: -this.width,
        //         ease: Expo.easeOut,
        //         onComplete: this.hideContainer.bind(this, this.animatedOut.bind(this))
        //     });
        // },
    });

    return KeepContributingScreen;
});