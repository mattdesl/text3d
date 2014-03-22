define(['Class', 'ui/BaseSyncCanvas', 'utils/DOMUtil'], function(Class, BaseSyncCanvas, DOMUtil) {

    var LostConnectionScreen = new Class({
        
        Extends: BaseSyncCanvas,

        handleInit: function() {
            BaseSyncCanvas.prototype.handleInit.call(this);

            this.container.css("z-index", 1000);

            this.background = $(this.templateFactory.render('Background'));
            this.background.prependTo($(this.container));
            this.container.hide();

            this.showing = false;
            DOMUtil.setupSprites(this.container);
        },

        setupUI: function() {
            this.parent();
            this.avatar.disconnected();
        },

        animateIn: function() {
            this.parent();
            this.showing = true;
        },

        animateOut: function() {
            this.showing = false;
            TweenLite.to(this.container, 1.0, {
                x: -this.width,
                ease: Expo.easeOut,
                onComplete: this.hideContainer.bind(this, this.container, this.animatedOut.bind(this))
            });
        },
    });

    return LostConnectionScreen;
});