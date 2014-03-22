define(['Class',
        'jquery',
        'libjs/signals/Signal',
        'TweenLite',
        'PIXI',
        'libjs/utils/Util'], 
        function(Class, 
                 $,
                 Signal,
                 TweenLite,
                 PIXI,
                 Util) {

    var TEXT_WIDTH = 601;
    var TEXT_HEIGHT = 422;

    var RotateScreen = new Class({

	   	//make it a jQuery object
   		Extends: $.fn.init,

   		initialize: function(templateFactory, width, height) {
   			$.fn.init.call(this, "<div>");

            this.width = width;
            this.height = height;

            this.css({
                backgroundColor: 'black',
                width: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 1000,
                height: "100%"
            });
            // this.image = $("<img>", {
            //     src: FlickPreloader.ROTATE_SCREEN
            // }).css({
            //     width: "100%",
            //     height: "100%"
            // }).appendTo(this);   
            
            var data = {

            };

            this.html( templateFactory.render('RotateScreen', data) );

            // TweenLite.set($(".rotate-screen-content", this), { scale: 0.5, transformOrigin: "top center" });
            this.resize(width, height);

            this.textImage = null;

            this.hide();
            this.showing = false;

            // this.animateIn();
   		},

        animateIn: function() {
            if (this.showing)
                return;

            this.on('touchstart', function(ev) {
                ev.preventDefault();
            });

            // if (this.textImage === null) {
            //     var ratio = Util.support.isRetina ? 2 : 1;

            //     this.textImage = $("<img>", {
            //         src: FlickPreloader.ROTATE_SCREEN_TEXT
            //     }).css({
            //         position: 'absolute',
            //         width: TEXT_WIDTH/2,
            //         height: TEXT_HEIGHT/2,
            //         left: (this.width/2-TEXT_WIDTH/4/ratio),
            //         top: (this.height/2-TEXT_HEIGHT/4/ratio)
            //     }).appendTo(this);                  

            //     if (Util.support.isRetina) {
            //         TweenLite.set(this.textImage, {
            //             scale: 0.5,
            //             transformOrigin: "top left"
            //         });
            //     }
            // }

            this.showing = true;
            this.show();
            TweenLite.fromTo(this, 0.25, {
                y: -Math.max(this.width, this.height),
                x: 0,
            }, {
                y: 0,
                overwrite: 1,
                ease: Expo.easeOut
            });
        },

        onAnimatedOut: function() {
            this.hide();
            this.showing = false;
        },

        animateOut: function() {
            this.showing = false;

            this.off('touchstart');
            
            TweenLite.to(this, 0.5, {
                y: -Math.max(this.width, this.height),
                ease: Expo.easeOut,
                overwrite: 1,
                onComplete: this.onAnimatedOut.bind(this)
            });
        },

        // setImage: function(imgUrl) {
        //     this.image.attr("src", FlickPreloader.ROTATE_SCREEN).appendTo(this);
        // },

        resize: function(width, height) {
            this.width = width;
            this.height = height;

            
            var ratio = Util.support.isRetina ? 2 : 1;
            // if (this.textImage) {
                // this.textImage.css({
                //     left: (this.width/2-TEXT_WIDTH/2/ratio),
                //     top: (this.height/2-TEXT_HEIGHT/2/ratio)
                // });


                // if (Util.support.isRetina) {
                //     TweenLite.set(this.textImage, {
                //         scale: 0.5,
                //         transformOrigin: "top left"
                //     });
                // }
            // }
        },

   });

   return RotateScreen;
});