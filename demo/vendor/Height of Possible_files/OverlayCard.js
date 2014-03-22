define(['Class',
        'jquery',
        'libjs/signals/Signal',
        'TweenLite'], 
        function(Class, 
                 $,
                 Signal,
                 TweenLite) {

    var WELCOME_YOFF = 100;
    var DEFAULT_YOFF = 100;



    var OverlayCard = new Class({

        Extends: $.fn.init,

        initialize: 
        function OverlayCard(stateData, templateFactory, width, height, type) {
            $.fn.init.call(this, "<div>");
            
            this.stateData = stateData;

            this.width = width;
            this.height = height;

            this.templateFactory = templateFactory;

            var templateData = { 
                next: 'CREATE NOW',
                states: []
            };
            for (var i=0; i<this.stateData.length; i++) {
                var st = this.stateData[i];
                templateData.states.push( this.templateFactory.render(st.template, st) );
            }

            //Build each state.
            this.html( this.templateFactory.render(type || 'OverlayPanel', templateData) );


            //A semi-transparent color fill background for our overlay...
            this.background = $("<div>").css({
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%"
            }).prependTo(this);
            

            this.css({
                position: 'absolute',
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 10
            });

            //hide all states...
            this.states = $('.overlay-content', this);
            this.states
                    .hide() //hide all states
                    .first().show(); //show first



            this.currentState = 0;

            // if (stateData[0].flip && stateData[1]) {
            //     TweenLite.set(this.states.eq(1), {
            //         // rotationY: -180,
                    
            //     });
            // }

            //Called when the user is on the last page of the tutorial
            //and clicks "GOT IT!" to start...
            this.onClosing = new Signal();

            this.nextButton = $('#tutorial-next', this);
            // this.nextButton.on('touchstart', this.handleNextClick.bind(this));
            $(".overlay-footer", this).on('touchstart', this.handleNextClick.bind(this));

            this._onModalClick = this.onModalClick.bind(this);
            this.bind('touchstart', this._onModalClick);

            this._preventDefault = this.preventDefault.bind(this);
            this.panel = $('.overlay-panel', this).bind('touchstart', this._preventDefault);

            this.resize(this.width, this.height);
        },

        handleNextClick: function(ev) {
            
            //if we've reached the end... user wants to start playing
            if (this.currentState >= this.states.length-1) {
                this.currentState = this.states.length-1;
                this.onClosing.dispatch();
            } 
            //otherwise we are just jumping to next page.
            else {
                this.nextState();
            }
        }, 

        resize: function(width, height) {
            this.width = width;
            this.height = height;

            var capHeight = Math.min(365, height-110);
            $('.overlay-card').css({
                // minHeight: capHeight,
                // maxHeight: capHeight
            })
        },

        bg: function(rgba) {
            return this.background.css("background", rgba);
        },

        animateIn: function(delay, onComplete) {
            this.show();
            this.css("pointer-events", "auto");

            TweenLite.fromTo(this.background, 1.0, {
                alpha: 0.0
            }, {
                alpha: 0.8,
                delay: delay
            });


            TweenLite.fromTo(this.panel, 1.0, {
                y: this.height*1.0,
                rotationX: 85,
                transformPerspective: 1000,
            }, {
                delay: delay,
                y: 0,
                marginTop: (this.currentState===0 && this.stateData[0].flip) ? WELCOME_YOFF : DEFAULT_YOFF,
                rotationX: 0,
                onComplete: onComplete,
                ease: Expo.easeOut,
            });
        },

        onFinishAnimating: function(onComplete) {
            this.hide();

            if (onComplete)
                onComplete();
        },

        animateOut: function(delay, onComplete) {
            this.css("pointer-events", "none");

            TweenLite.to(this.background, 0.5, {
                alpha: 0.0,
                delay: delay
            });

            TweenLite.to(this.panel, 1.0, {
                y: this.height*1.5,
                delay: delay,
                onComplete: this.onFinishAnimating.bind(this, onComplete),
                ease: Expo.easeOut,
            });
        },

        preventDefault: function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
        },

        onModalClick: function() {
            this.onClosing.dispatch();
        },

        destroy: function() {
            this.nextButton.off('touchstart');
            this.unbind('touchstart', this._onModalClick);
            $('.overlay-panel', this).unbind('touchstart', this._preventDefault);
        },

        onFlipMidpoint: function(hideEl, showEl) {
            hideEl.hide();
            showEl.show();
        },

        updateFlip: function() {
            
        },

        hideProfile: function() {
            return $(".overlay-profile-container", this).hide();
        },

        nextState: function() {
            if (this.currentState === this.states.length -1)
                return;

            var cur = this.states.eq(this.currentState);
            var next = this.states.eq(this.currentState + 1);

            var shouldFlip = this.stateData[this.currentState].flip;
            if (shouldFlip) {
                this.reachedMidpoint = false;
                TweenLite.to(this.panel, 0.5, {
                    scaleX: -1,
                    rotationY: 180,
                    onUpdate: this.updateFlip.bind(this),
                    marginTop: DEFAULT_YOFF,
                    ease: Expo.easeOut,
                });
                TweenLite.to(cur, 0.5/5, {
                    scaleX: 0,
                    ease: Expo.easeOut,
                    onComplete: this.onFlipMidpoint.bind(this, cur, next)
                });
                var profile = $(".overlay-profile", this).css("backface-visibility", "hidden");
                TweenLite.to(profile, 0.5, {
                    rotationY: 180,
                    ease: Expo.easeOut,
                });
            } else {
                TweenLite.to(cur, 0.5, {
                    x: -this.width,
                    ease: Expo.easeOut,
                    // onComplete: 
                });

                next.show();
                TweenLite.fromTo(next, 0.5, {
                    x: this.width
                }, {
                    x: 0,
                    ease: Expo.easeOut
                });
            }

                

            this.currentState++;
        },
    });

    return OverlayCard;

});