define(['Class', 
        'PIXI',
        'flick/Vector2',
        'flick/FlickSprite',
        'flick/ParticleSprite',
        'flick/FlickManager',
        'flick/GrowingRings',
        'flick/Themes',
        'flick/Color',
        'flick/ColorManager',
        'flick/ShotIndicator',
        'flick/ui/BackButton',
        'flick/ui/Compass',
        'flick/ui/HeightMeter',
        'flick/ui/BaseSprite',
        'flick/ui/TutorialText',
        'flick/ui/EndMessage',
        'flick/ui/ColorChangeUI',
        'ui/SyncAvatar',
        'math/lerp',
        'Global',
        'flick/controllers/BaseFlickController',
        'libjs/utils/Util',
        'framework/auth/Facebook', 
        'framework/Network',
        'framework/config/Settings',
        'flick/CanvasUtil',
        'flick/ParticleChooser',
        'flick/dom/OverlayCard'], 
        function(Class, 
                 PIXI,
                 Vector2,
                 FlickSprite,
                 ParticleSprite,
                 FlickManager,
                 GrowingRings,
                 Themes,
                 Color,
                 ColorManager,
                 ShotIndicator,
                 BackButton,
                 Compass,
                 HeightMeter,
                 BaseSprite,
                 TutorialText,
                 EndMessage,
                 ColorChangeUI,
                 SyncAvatar,
                 lerp,
                 Global,
                 BaseFlickController,
                 Util,
                 Facebook,
                 Network,
                 Settings,
                 CanvasUtil,
                 ParticleChooser,
                 OverlayCard){

    var tmp = new Vector2();
    var tmp2 = new Vector2();
    var DELAY_SHOW_TEXT = 3.5;
    var INITIAL_Y = -25;


    var BACKGROUND_TOP = Color.fromHex('#24262f');
    var BACKGROUND_BOTTOM = Color.fromHex('#18191c');
    
    var States = {
        SWIPE: "SWIPE",
        TAP: "TAP",
        FLICK: "FLICK"
    };

    var FlickGame = new Class({
        
        Extends: BaseFlickController,


        init: function(template){
            this.parent(template);

                
            //the header and back button are always fixed
            this.setupFixedUI();

            //Contains all the content like particle / shooting UI
            //This gets animated out when we see the End of Event message..
            this.contentContainer = new PIXI.DisplayObjectContainer();
            this.contentContainer.hitArea = new PIXI.Rectangle(0,0, this.width, this.height);
            this.displayContainer.addChild(this.contentContainer);

            this.idleRings = new GrowingRings(200, 4);
            this.idleRings.alpha = 0.3;
            this.contentContainer.addChild(this.idleRings);

            this.enableShotIndicatorBound = this.enableShotIndicator.bind(this);

            this.particles = new Array(6);
            for (var i=0; i<this.particles.length; i++) {

                // var textures = [ PIXI.Texture.fromFrame( (1)+'.png' ) ];
                var textures = [];

                for (var j=0; j<=30; j+=2) {
                    textures.push( PIXI.Texture.fromFrame('12-Obj-B-LightBG+A_'+(j<10?('0'+j):j)+'.png') );
                }

                this.particles[i] = new ParticleSprite(textures);
            }
            
            this.particleContainer = new PIXI.DisplayObjectContainer();
                
            this.endMessageOpen = false;

            this.particleChooser = new ParticleChooser(this.particles, this.width, this.height);
            this.particleContainer.addChild(this.particleChooser.shadowContainer);
            this.particleContainer.addChild(this.particleChooser);

            this.chooserYOff = INITIAL_Y;


            this.particleChooser.position.y = this.chooserYOff;
            this.particleChooserYTween = {
                y: this.chooserYOff
            };

            this.particleChooser.onSwipeStart.add(this.onParticleChooseStart.bind(this));
            this.particleChooser.onSwipeEnd.add(this.onParticleChooseEnd.bind(this));
            // this.particleChooser.onSwipeUpdate.add(this.onParticleChooseUpdate.bind(this));
            this.particleChooser.onSnapEnd.add(this.onCompleteSelection.bind(this));
            this.particleChooser.onParticleChange.add(this.onParticleChange.bind(this));

            this.flickSprite = this.particles[0];
            
            this.flickManager = new FlickManager(this.flickSprite, this.width, this.height);
            this.flickManager.floating = true;

            this.setupEvents(this.flickManager);
            this.setupShootUI();
            this.setupEndUI();
            // this.setupDOM();

            this.contentContainer.addChild(this.particleContainer);

            this.hasTouched = false;
            this.time = 0;

            this.tappingSprite = false;
            this.lastTapPosition = new Vector2();

            this.state = States.SWIPE;

            this.shotIndicator = new ShotIndicator(500, 4);
            this.contentContainer.addChild(this.shotIndicator);

            //ugly hack so we can tween ShotIndicator angle and alpha independently
            this.shotIndicatorTween = {
                value: 0
            };

            this.shotOffset = { //we will tween this ourselves..
                value: 0,
            };

            this.selectionUITween = {
                alpha: 1.0
            };

            this.deviceRotation = {
                x: 0,
                y: 0,
                z: 0,

                //normalized in range -1..1
                nx: 0,
                ny: 0,
                nz: 0,
            };

            this.flickCount = 0;
            this.reset();
            this.initialized();

            this.timerTap = 0;
            this.timerTapDelay = 300;

            //Ugly hack to ensure that the font is correctly sized & drawn...
            TweenLite.delayedCall(0.5, this.redrawText.bind(this));
            TweenLite.delayedCall(3.0, this.redrawText.bind(this)); //just incase we have a really shitty internet

            // TweenLite.delayedCall(3.0, this.animateInEndMessage.bind(this));
        },

        redrawText: function() {
            this.tutorialText.redrawText();

            CanvasUtil.redrawText(this.header);
            this.updateHeaderPosition();

            this.endMessage.redrawText();
        },

        resetThrow: function() {
            this.flickManager.reset();
            this.flickSprite.reset();

        },

        reset: function(ignoreSync) {
            this.particleChooser.stopAllRings();

            TweenLite.killDelayedCallsTo(this.enableShotIndicatorBound);
            
            this.flickManager.enabld = false;
            this.flickManager.floating = true;
            this.shotIndicatorTween.value = 0;
            this.idleRings.visible = false;

            // if (this.tutorialFinished) {
            //     this.tutorialOpen = false;
            // }
            // this.tutorialText.reset();

            this.resetThrow();

            this.flickSprite.scaleFactor = 1;
            this.flickSprite.animateToDefaultScale();
            this.colorPickerDragging = false;

            this.state = States.SWIPE;

            this.hasTouched = false;

            this.flickManager.resetFloat();

            //Kill the rings
            this.shotIndicator.stop();
            this.shotIndicator.kill();

            this.idleRings.stop();
            this.idleRings.kill();

            TweenLite.to(this.shotIndicatorTween, 0.5, {
                value: 0.0,
                overwrite: 1,
            });

            TweenLite.to(this.idleRings, this.shotIndicator, 0.25, {
                alpha: 0.0,
                overwrite: 1
            });


            TweenLite.to(this.header.position, 0.5, {
                y: this.headerPositionY,
                overwrite: 1,
                ease: Expo.easeOut,
            });

            TweenLite.to(this, 0.5, {
                chooserYOff: INITIAL_Y,
                ease: Expo.easeOut,
                overwrite: 1,
            });

            if (!this.ignoreSync)
                this.animateInSyncAvatar(.2);
                         
            this.selectionUI.visible = true;
            TweenLite.to([this.particleChooser.shadowContainer, this.selectionUITween], 0.5, {
                alpha: 1,
                delay: 1.0,
                overwrite: 1,
            });

            TweenLite.to(ColorManager, 0.5, {
                value: 0.0,
                overwrite: 1,
                ease: Expo.easeOut
            });
        },

        animateInEndMessage: function() {
            this.reset(true);

            this.endMessageOpen = true;
            this.particleChooser.enabled = false;

            //Animate out the main content
            TweenLite.to(this.contentContainer.position, 1.0, {
                x: -this.width,
                ease: Expo.easeOut,
                onComplete: this.setVisibility.bind(this, this.contentContainer, false)
            });

            this.endContainer.visible = true;
            TweenLite.fromTo(this.endContainer.position, 1.0, {
                x: this.width,
            }, {
                x: 0,
                ease: Expo.easeOut
            });

            //If we are in the At Home experience, make sure the back
            //button is not visible
            if (!Settings.isEvent) {
                this.animateOutBackButton()
            }

            if (this.syncAvatar) {
                if (this.state == States.FLICK) {
                    this.syncAvatar.alpha = 0.0;
                } else {
                    //If we're not flicking, then just assume
                    //it will slide nicely to the left
                }
            }
        },

        animateInBackButton: function(delay) {
            this.backButton.visible = true;
            TweenLite.to(this.backButton.position, 1.0, {
                x: this.backButtonXOff,
                delay: delay,
                ease: Expo.easeOut
            });
        },

        animateOutBackButton: function(delay) {
            TweenLite.to(this.backButton.position, .5, {
                x: this.backButtonXHide,
                ease: Expo.easeOut,
                delay: delay,
                onComplete: this.setVisibility.bind(this, this.backButton, false)
            });
        },


        setupFixedUI: function() {
            this.header = CanvasUtil.createText("THE ART OF POSSIBLE", CanvasUtil.BRANDON, 16, '#dadcdd', 'bolder')
            this.header.alpha = 0.6;
            this.displayContainer.addChild(this.header);

            this.backButton = new BackButton();  //= new BaseSprite('flick-back.png');
            this.backButton.interactive = true;
            var pad = 80;
            this.backButton.hitArea = new PIXI.Rectangle(-pad, -pad, this.backButton.width + pad*2, this.backButton.height + pad*2);
            this.backButton.tap = this.onBackButton.bind(this);

            this.backButtonXOff = 20;
            this.backButtonXHide = -(this.backButton.width+20);

            CanvasUtil.attachTouchFade(this.backButton);

            var bx;
            if (Settings.isEvent) {
                bx = this.backButtonXOff;
            } else {
                this.backButton.visible = false;
                bx = this.backButtonXHide;
            }
            this.backButton.position.set(bx, 25);
            
            this.displayContainer.addChild(this.backButton);

        },

        setupEndUI: function() {
            this.endContainer = new PIXI.DisplayObjectContainer();
            this.displayContainer.addChild(this.endContainer);

            this.endMessage = new EndMessage(this.width, this.height);
            this.endContainer.addChild(this.endMessage);


            this.endContainer.visible = false;
        },

        setupShootUI: function() {
            this.tutorialText = new TutorialText(this.width, this.height);
            this.tutorialOpen = true;
            this.tutorialFinished = false;

            this.contentContainer.addChild(this.tutorialText);
            this.tutorialText.onFinished.add(function() {
                this.tutorialText.visible = false;
                this.tutorialOpen = false;
            }.bind(this));




            //if we're at home, show the sync avatar
            if (!Settings.isEvent) {
                var src = Facebook.user.data.id ? Facebook.profilePhotoURL(150, 150) : "img/temp_profile.jpg";
                this.syncAvatar = new SyncAvatar(src);
                this.syncAvatar.connected(false);
                this.syncAvatar.scale.set(0.5, 0.5);

                this.contentContainer.addChild(this.syncAvatar);
            }

            this.selectionUI = new ColorChangeUI();
            this.contentContainer.addChild(this.selectionUI);

            this.selectionUI.touchstart = this.colorPickerTouchStart.bind(this);
            this.selectionUI.touchmove = this.colorPickerTouchMove.bind(this);
            this.selectionUI.touchend = this.colorPickerTouchEnd.bind(this);
            this.selectionUI.touchendoutside = this.colorPickerTouchEnd.bind(this);
        },

        destroy: function() {
            if (window.DeviceOrientationEvent) 
                window.removeEventListener("deviceorientation", this._deviceOrientationEvent);

            this.shotIndicator.destroy();

            this.manager.canvas.unbind('touchstart', this._onTouchStart);
            this.manager.canvas.unbind('touchmove', this._onTouchMove);
            this.manager.canvas.unbind('touchend', this._onTouchEnd);

            // Network.onConnect.remove( this._onNetworkConnect );
            // Network.onOtherDeviceJoined.remove( this._onOtherDeviceJoined );
            this.parent();
        },

        animateInSyncAvatar: function(delay) {
            if (this.syncAvatar) {
                this.syncAvatar.position.x = this.syncAvatarX + this.syncAvatar.radius*2 + 50;

                TweenLite.to(this.syncAvatar.position, 1.0, {
                    x: this.syncAvatarX,
                    ease: Expo.easeOut,
                    delay: delay
                });
                TweenLite.to(this.syncAvatar, 0.5, {
                    alpha: 1,
                    delay: delay
                });
                // this.manager.overlay.onClosing.addOnce(function() {
                    
                // }.bind(this));
                    
            }
        },

        animateOutSyncAvatar: function(delay) {
            if (this.syncAvatar) {
                TweenLite.to(this.syncAvatar.position, 0.5, {
                    x: this.syncAvatarX + this.syncAvatar.radius*2 + 50,
                    ease: Expo.easeOut,
                    delay: delay
                });
                TweenLite.to(this.syncAvatar, 0.5, {
                    alpha: 0.0,
                    delay: (delay||0)+.1
                });
            }
        },

        animateInContent: function() {
            this.animateInSyncAvatar(.8);
            
            if (!Settings.hasSeenTutorial) {
                Settings.hasSeenTutorial = true;
                this.tutorialText.next();
            } else {
                this.tutorialText.visible = false;
            }
            this.animateInParticle(0.4);
            
            this.selectionUI.visible = true;
            this.selectionUI.animateIn(0.5);
        },

        animateInParticle: function(delay) {
            this.particleChooser.visible = true;
            this.particleChooser.enabled = false;
            TweenLite.fromTo(this.particleChooser.position, 1.0, {
                x: this.width*1.5
            }, {
                x: 0,
                delay: delay,
                ease: Expo.easeOut,
                onComplete: this.particleChooser.makeEnabled.bind(this.particleChooser)
            });

            TweenLite.fromTo(this.particleChooser.shadowContainer.position, 1.0, {
                x: this.width*1.5
            }, {
                x: 0,
                delay: delay,
                ease: Expo.easeOut,
            });
        },

        animateIn: function() {
            //notify tutorial has started
            if (Network.isConnected) {
                Network.tutorialStarted();    
            } else {
                this.addSignal( Network.onConnect, function() {
                    Network.tutorialStarted();
                }, true );
            }

            this.particleChooser.visible = false;
                
            this.selectionUI.visible = false;

            if (this.manager.showingOverlay) {
                this.manager.onOverlayClosed.addOnce(this.animateInContent.bind(this));
            } else
                this.animateInContent();

            this.animatedIn();
        },

        animateOut: function() {
            this.animatedOut();
            //TweenLite.delayedCall(4.0, this.aniamtedOut.bind(this));
        },

        resize: function(width, height) {
            this.parent(width, height);
            this.contentContainer.hitArea.width = width;
            this.contentContainer.hitArea.height = height;

            this.flickManager.resize(width, height);
            
            this.particleChooser.resize(width, height);

            // this.flickManager.origin.copy(this.flickSprite.position);
            this.flickManager.origin.set(width/2, height/2);

            //set the origin based on the current particle chooser position
            // this.flickManager.origin.copy(this.particleChooser.getCurrent().position);

            // this.heightMeter.position.x = this.width - (15 + this.heightMeter.dotSize); //should be 15px off
            // this.heightMeter.position.y = this.height - this.heightMeter.height - 40 - 20; //should be 20px fof

            // this.compass.position.x = this.width - this.compass.width/2 - 15;
            // this.compass.position.y = this.compass.height/2 + 15;

            this.tutorialText.position.set( 
                        20 - 2, 
                        Math.round(80) );
            this.tutorialText.resize(width, height);

            // this.backButton.position.set( this.width - this.backButton.width - 10, 10 );

            this.selectionUI.position.set(
                0,
                this.height - 70 + this.selectionUI.radius
            );

            this.updateHeaderPosition();

            this.endMessage.resize(width, height);

            if (this.syncAvatar) {
                this.syncAvatarX = this.width - this.syncAvatar.scale.x * this.syncAvatar.radius*2 - 20;
                this.syncAvatar.position.set(
                    this.syncAvatarX,
                    this.height - this.syncAvatar.scale.y * this.syncAvatar.radius*2 - 20
                );
            }

            //set it to the float position
            // this.setFloatShadowPos();
        },

        updateHeaderPosition: function() {
            this.headerPositionY = 21;
            this.header.position.set(
                this.width - this.header.width - 20,
                this.headerPositionY
            );
        },

        draw: function(context, dt) {
            this.time += 0.01;

            this.timerTap += dt;
            // this.handleTouchTimer();

            this.flickSprite = this.particles[this.particleChooser.getIndex()];
            // this.flickSprite = this.particles[0];
            this.flickManager.flickSprite = this.flickSprite;

            this.flickManager.update(dt);

            //we use a separate object so we can easily overwrite/kill 
            //the tweens for the ColorChooserUI timeline
            this.selectionUI.alpha = this.selectionUITween.alpha;
            this.selectionUI.update();
            // this.particleChooser.update(dt);

            this.idleRings.position.copy( this.flickSprite.position );
            this.shotIndicator.position.copy( this.flickSprite.position );
            this.idleRings.stroke = ColorManager.theme.foreground.string;

            context.fillStyle = 'white';
            context.strokeStyle = 'white';
            
            var offsetDistance = 150;
            var target = tmp2.set(this.width/2 + this.shotOffset.value*offsetDistance, 0);
            this.shotIndicator.visible = (!this.flickManager.flicking && this.shotIndicatorTween.value > 0);
            this.shotIndicator.alpha = this.shotIndicatorTween.value;
            this.shotIndicator.target = target;

            TweenLite.to(this.particleChooserYTween, 1, {
                y: this.chooserYOff + (this.flickManager.floatOffset * 8),
                overwrite: 1
            });
            this.particleChooser.position.y = this.particleChooserYTween.y;

            // this.particleContainer.position.x = Math.sin(this.time)*200;
            // this.colorDebug.text(this.particleChooser.getIndex() +" - "+this.particleChooser.getNormalizedValue().toFixed(2) );
        },


        // setState: function(state) {
        //     this.state = state;

        //     if (state == States.SWIPE) {

        //     } else if (state == States.TAP) {

        //     } else if (state == States.FLICK) {

        //     }
        // },


        onFirstTouch: function() {
            this.enableShotIndicator();
        },

        finishTutorial: function() {
            if (!this.tutorialFinished) {
                this.tutorialFinished = true;
                console.log("Tutorial completed");
                Network.tutorialCompleted();
            }
            this.tutorialText.next();
        },

        enableShotIndicator: function() {
            this.finishTutorial();
            
            TweenLite.to(this.shotIndicatorTween, 1.0, {
                value: 1.0,
                overwrite: 1,
                // delay: inDelay
            });
            this.flickSprite.startRings();
        },

        enableFlickMode: function() {
            this.idleRings.visible = true;

            this.idleRings.start(5.0, null, 1.0);
            this.shotIndicator.start(7.0);
            this.flickManager.enabled = true;
            this.hasTouched = false;
        },

        onSpriteTap: function(force) {
            // console.log("STATE:", this.state, "OPEN?", this.tutorialOpen)
            if (force || (this.state === States.TAP || this.state === States.SWIPE)) {
                if (this.state === States.SWIPE && this.tutorialOpen)
                    this.tutorialText.next();
                this.state = States.FLICK;

                this.flickSprite.gotoAndPlay(0);
                this.flickManager.floating = false;

                // this.flickSprite.scaleFactor = 0.85;
                // TweenLite.to(this.flickSprite.scale, 0.2, {
                //     x: (this.flickSprite.defaultScale+0.5) * this.flickSprite.scaleFactor,
                //     y: (this.flickSprite.defaultScale+0.5) * this.flickSprite.scaleFactor, 
                //     ease: Expo.easeOut,
                //     overwrite: 1
                // });
                // this.flickSprite.animateToDefaultScale(0.25);

                TweenLite.to(this, 0.2, {
                    chooserYOff: 0,
                    ease: Expo.easeOut,
                    overwrite: 1,
                    onComplete: this.enableFlickMode.bind(this)
                });

                var shotIndicatorDelay = this.tutorialOpen ? 3 : 1.5;

                TweenLite.delayedCall(shotIndicatorDelay, this.enableShotIndicatorBound);

                this.tutorialText.next();

                TweenLite.to([this.particleChooser.shadowContainer, this.selectionUITween], 0.5, {
                    alpha: 0.0,
                    overwrite: 1,
                    onComplete: this.setVisibility.bind(this, this.selectionUI, false)
                });

                var tapIndex = this.particleChooser.getIndex();

                ColorManager.setNextThemeIndex(tapIndex);
                TweenLite.to(ColorManager, 1.0, {
                    value: 1.0,
                    // delay: 1.,
                    overwrite: 1
                });

                TweenLite.to(this.header.position, 0.5, {
                    y: -this.header.height - 50,
                    overwrite: 1,
                    ease: Expo.easeOut
                });


                this.flickSprite.gotoAndPlay(0);

                if (!Settings.isEvent) {
                    this.animateInBackButton();
                }

                this.animateOutSyncAvatar(.3);
            }            
        },

        onBackButton: function() {
            this.finishTutorial();
            if (this.state == States.FLICK && !this.endMessageOpen) {
                this.reset();
                if (!Settings.isEvent) 
                    this.animateOutBackButton();
            } else if (Settings.isEvent) {
                console.log("Back to event experience...");    
                Global.framework.go('menu', { animateInDelay: 0.5 });
            }
        },


        ////////////////////////////////////
        /// Particle Selection UI Events
        ////////////////////////////////////
        
        colorPickerTouchStart: function(ev) {
            this.colorPickerDragging = true;
            this.colorPickerTouchMove(ev);
        },

        colorPickerTouchMove: function(ev) {
            if (!this.colorPickerDragging)
                return;

            this.onParticleChooseStart();

            var perc = this.selectionUI.valueFromGlobal(ev.global.x / this.manager.ratio);
            
            TweenLite.to([this.particleChooser, this.selectionUI], 0.5, {
                value: perc,
                ease: Expo.easeOut,
                overwrite: 1
            });
        },

        colorPickerTouchEnd: function(ev) {
            var perc = Math.max(0, Math.min(1, ev.global.x / this.width));
            perc = this.particleChooser.roundedValue(perc);

            this.particleChooser.kill();
            var result = this.particleChooser.snap();

            var next = this.particleChooser.getIndex(result);

            TweenLite.to(this.selectionUI, 0.5, {
                ease: Expo.easeOut,
                overwrite: 1,
                value: this.selectionUI.fromIndex(next)
            });
        },  

        ////////////////////////////////////
        /// Particle Swiping Events
        ////////////////////////////////////
        
        onParticleChooseStart: function() {
            this.flickManager.enabled = false;
            this.particleChooser.stopAllLoops(); //stop all particle loops
            this.particleChooser.kill();
            this.particleChooser.startSelection();
        },

        onParticleChooseUpdate: function(dirLeft) {
            // this.updateSelectionUI(false);
        },

        //called when the particle selection is finished, and we can 
        //go back to floating..
        onCompleteSelection: function() {
            this.particleChooser.endSelection();
            this.flickManager.enabled = true;
            this.flickManager.resetFloat();
        },

        onParticleChooseEnd: function() {
            this.particleChooser.kill();
            var result = this.particleChooser.snap();

            var next = this.particleChooser.getIndex(result);
            TweenLite.to(this.selectionUI, 0.5, {
                ease: Expo.easeOut,
                overwrite: 1,
                value: this.selectionUI.fromIndex(next)
            });
        },

        onParticleChange: function() {
            if ( this.state === States.SWIPE && this.tutorialOpen ) {
               this.tutorialText.next();
               this.state = States.TAP;
            }
        },


        ////////////////////////////////////
        /// Input Events
        ////////////////////////////////////

        setupEvents: function(flick) {
            var sprite = this.flickSprite;

            //save these so we can remove them on destroy
            this._onTouchStart = this.onTouchStart.bind(this);
            this._onTouchEnd = this.onTouchEnd.bind(this);
            this._onTouchMove = this.onTouchMove.bind(this);

            this.contentContainer.interactive = true;
            this.contentContainer.touchstart = this._onTouchStart;

            // this.manager.canvas.bind('touchstart', this._onTouchStart);
            this.manager.canvas.bind('touchmove', this._onTouchMove);
            this.manager.canvas.bind('touchend', this._onTouchEnd);

            flick.onDrop = this.onDrop.bind(this);
            flick.onGrab = this.onGrab.bind(this);
            flick.onFlick = this.onFlick.bind(this);

            this._deviceOrientationEvent = this.deviceOrientationEvent.bind(this);

            if (window.DeviceOrientationEvent) 
                window.addEventListener("deviceorientation", this._deviceOrientationEvent, false);
        },

        onTouchStart: function(ev) {
            //jQuery handles canvas resizing correctly, but not PIXI?
            ev.global.x/=this.manager.ratio;
            ev.global.y/=this.manager.ratio;
            var pos = this.flickManager.pos(ev);
                

            tmp2.set(pos.x, pos.y-this.chooserYOff); //nasty
            var hit = this.flickManager.hitTest(tmp2);


            this.lastTouchEvent = ev;

            //When we are in the tutorial mode, we want the user to
            //go through it step-by-step. If they TAP the particle
            //when in the SWIPE mode, it does nothing.
            //
            //On subsequent returns to "SWIPE TO SELECT" (where there is no text),
            //we want the user to be able to seamlessly swipe OR tap to start the experience.
            //This way there is no jarring middle step or 'double tap' if they want to use the same particle.
            if (this.state !== States.FLICK) { //Tutorial is open
                if (hit) {
                    this.tappingSprite = true;
                    this.lastTapPosition = new Vector2(tmp2.x, tmp2.y + this.chooserYOff);
                } else {
                    this.particleChooser.swipeStart(pos);
                }
            } else {
                this.flickManager.flickStart(ev);
            }

            this.timerTap = 0;
            
        },
        onTouchEnd: function(ev) {
            if (this.tappingSprite) {
                this.tappingSprite = false;
                this.onSpriteTap();
            } else {
                this.colorPickerDragging = false;
                this.flickManager.flickEnd(ev);

                var pos = this.flickManager.pos(ev);
                this.particleChooser.swipeEnd(pos);
            }
            // console.log((this.particleChooser._value*Math.PI*2) * 180/Math.PI, this.particleChooser.getIndex());
        },

        // handleTouchTimer: function() {

        //     var ev = this.lastTouchEvent;




        //     //if we've held it down for longer than our delay
        //     if (this.tappingSprite && ev) {
        //         var pos = this.flickManager.pos(ev);
        //         var dist = this.lastTapPosition.distance(pos);

        //         var valid = this.timerTap > this.timerTapDelay;

        //         if (dist > 15 && Math.abs(this.lastTapPosition.y - pos.y) > 55) {
        //             console.log(Math.abs(this.lastTapPosition.y - pos.y))
        //             valid = true;
        //         }

        //         if (valid) {
        //             this.timerTap = 0;
        //             this.tappingSprite = false;

        //             this.flickManager.flickStart(ev);
        //             // this.flickManager.flickMove(ev);
        //             this.particleChooser.swipeMove(pos);
        //             console.log("FLICK!!", this.state)

        //             //Swipe Start; hide away the tutorial text...
        //             if (this.state !== States.FLICK) {
        //                 // this.tutorialText.next();
        //                 this.state = States.FLICK;

        //                 this.onSpriteTap(true);
        //             }
        //         }
        //     }
        //     return dist || null;
        // },

        onTouchMove: function(ev) {
            var pos = this.flickManager.pos(ev);

            this.lastTouchEvent = ev;
            // var dist = this.handleTouchTimer();


            if (this.tappingSprite) {
                //if we moved more than the minimum distance...
                if (this.lastTapPosition.distance(pos) > 15) {
                    this.tappingSprite = false;
                    this.particleChooser.swipeStart(pos);

                    //Swipe Start; hide away the tutorial text...
                    if (this.state === States.SWIPE) {
                        this.tutorialText.next();
                        this.state = States.TAP;
                    }
                }
            } else {
                this.flickManager.flickMove(ev);
                this.particleChooser.swipeMove(pos);

                //Swipe Start; hide away the tutorial text...
                if (this.state === States.SWIPE) {
                    this.tutorialText.next();
                    this.state = States.TAP;
                }
            }
                
        },

        onDrop: function() {
            this.flickSprite.onDrop();
        },
        onGrab: function() {
            this.flickSprite.onGrab();
            // TweenLite.killDelayedCallsTo(this.animateInIntroBound);

            if (!this.hasTouched) {
                this.hasTouched = true;
                this.onFirstTouch();
            }
        },
        onFlick: function(direction, distance) {
            this.flickSprite.onFlick(direction, distance);

            var index = this.particleChooser.getIndex();
            console.log("Shooting..", index)

                
            if (Network.isConnected) {
                //var params = [ direction.x, direction.y, distance, index ];
                var angleRoll = Math.atan2(direction.y, direction.x);
                var anglePitch = this.deviceRotation.x;
                var params = [ angleRoll, anglePitch, distance, index ];
                Network.shoot(params);
                // Network.shoot({ x: direction.x, y: direction.y, distance: distance });
            }


            this.flickCount++;
            if (this.flickCount > 2)
                TweenLite.delayedCall(1.5, this.animateInEndMessage.bind(this));
            else
                TweenLite.delayedCall(1.5, this.resetThrow.bind(this));
        },

        deviceOrientationEvent: function(ev) {
            //The up/down tilt            
            var a = ev.beta * Math.PI/180; //deg to rad
            this.deviceRotation.x = a;

            var min = (20 * Math.PI/180);
            var max = (60 * Math.PI/180);
            a = Math.max(0.0, Math.min(1.0, (a - min)/(max - min) ));
            
            this.deviceRotation.nx = a; // 0.0 to 1.0
            a = lerp(min, max, a);

            //Tilt left/right
            var b = ev.gamma * Math.PI/180; 
            this.deviceRotation.z = a;
            min = -50 * Math.PI/180;
            max = 50 * Math.PI/180;
            b = Math.max(0.0, Math.min(1.0, (b - min)/(max - min) ));
            b = b * 2 - 1;

            this.deviceRotation.nz = b; // -1.0 to 1.0

            TweenLite.killTweensOf(this.shotIndicator);
            TweenLite.killTweensOf(this.shotOffset);
            TweenLite.to(this.shotIndicator, 0.5, {
                overwrite: 1,
                ease: Expo.easeOut,
                angle: a,
            });

            TweenLite.to(this.shotOffset, 0.5, {
                overwrite: 1,
                ease: Expo.easeOut,
                value: b
            });

            var off = 7;

            //parallax X axis has a bit more range than our shot indicator
            min = (-35 * Math.PI/180);
            max = (35 * Math.PI/180);
            a = this.deviceRotation.x;
            a = Math.max(0.0, Math.min(1.0, (a - min)/(max - min) ));
            
            // TweenLite.to(this.introContainer.position, 1.0, {
            //     x: this.deviceRotation.nz * off,
            //     y: a * off,
            //     overwrite: 1,
            //     ease: Expo.easeOut
            // })
        },


        //Util
        setVisibility: function(container, visible) {
            container.visible = visible;
        },

    });

    return FlickGame;
});