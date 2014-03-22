define(['Class', 
        'PIXI',
        'framework/config/Settings',
        'flick/BaseCanvasController',
        'flick/Vector2',
        'flick/FlickSprite',
        'flick/FlickManager',
        'flick/GrowingRings',
        'flick/Themes',
        'flick/Color',
        'flick/ColorManager',
        'flick/ShotIndicator',
        'flick/ui/BaseSprite',
        'math/lerp',
        'jquery',
        'libjs/framework/Framework',
        'libjs/signals/Signal',
        'framework/auth/Facebook', 
        'handlebars',
        'framework/templates/mobile/_compiledTemplates',
        'libjs/framework/view/HandlebarsTemplateFactory',
        'flick/controllers/FlickGame',
        'flick/dom/OverlayCard',
        'flick/dom/RotateScreen',
        'utils/URLParamUtils',
        'ui/CanvasPreloader',
        'framework/Network'], 
        function(Class, 
                 PIXI,
                 Settings,
                 BaseCanvasController,
                 Vector2,
                 FlickSprite,
                 FlickManager,
                 GrowingRings,
                 Themes,
                 Color,
                 ColorManager,
                 ShotIndicator,
                 BaseSprite,
                 lerp,
                 $,
                 Framework,
                 Signal,
                 Facebook,
                 handlebars,
                 templates,
                 HandlebarsTemplateFactory,
                 FlickGame,
                 OverlayCard,
                 RotateScreen,
                 URLParamUtils,
                 CanvasPreloader,
                 Network) {

    var GAME = 'game';
    
	var FlickScreen = new Class({
		
		Extends: BaseCanvasController,

		init: function(template){
			this.parent(template);

            this.onCloseOverlayBound = this.onCloseOverlay.bind(this);

            //signal for sub-controllers
            this.onOverlayClosed = new Signal();
            this.showingOverlay = false;

            var templateFactory = new HandlebarsTemplateFactory(templates);

            var controllers = {
                'game': FlickGame,
            };

            var routes = [];
            for (var k in controllers) {
                routes.push({
                    name: k,
                    url: '/',
                    controller: k,
                    updateURL: false
                });
            }

            this.framework = new Framework(this.container, templateFactory, controllers);

            // INIT framework
            this.framework.passToContstructors( templateFactory, this );
            this.framework
                .init()
                .stateMachine
                    .states(routes)
                    .defaultState(GAME);

            //Alias 'go' function
            this.go = this.framework.go.bind(this.framework);

            this.renderer = new PIXI.CanvasRenderer(this.width, this.height, this.canvas[0], true, 30, 12);
            this.renderer.clearBeforeRender = false;
            this.stage = new PIXI.Stage();

            this.mainContainer = new PIXI.DisplayObjectContainer();
            this.stage.addChild(this.mainContainer);
            
            //setup our events
            this.setupEvents(this.flickManager);
                
            //setup debugging UI (fps meter)
            this.setupDebugGUI();

            // COnnect to socket server
            this.addSignal(Network.onConnect, function(){
                Network.joinCanvas();
            }.bind(this));
            Network.connect();

            this.name = "";
            this.facebookID = "";

            if (Facebook.user && Facebook.user.data) {
                this.name = Facebook.user.data.first_name || "";
                this.facebookID = Facebook.user.data.id || "";
            }

            if (!this.name){
                this.name = (URLParamUtils.urlParam("name")||"");
            }
            if (!this.name) {
                this.name = (URLParamUtils.urlParam("name")||"");
                //split after space
                if (this.name) 
                    this.name = decodeURIComponent(this.name).trim().split(/\s+/)[0];
            }
            if (!this.facebookID){
                this.facebookID = (URLParamUtils.urlParam("id")||"");
                Facebook.user.data.id = this.facebookID;
            }
                
            this.name = this.name.toUpperCase();
            Facebook.user.data.first_name = this.name;
            
            var stateData = [
                { 
                    flip: true,
                    template: 'WelcomeCard',
                    header: 'GOOD EVENING',
                    name: this.name,
                    subHeader: 'WELCOME TO THE ART <div>OF POSSIBLE</div>',
                    body: '',
                    animation: ''
                },
                // { 
                //     template: 'TutorialCard',
                //     header: 'FLICK UP TO THROW',
                //     body: 'Tilt the device to aim.',
                //     animation: ''
                // },
                // { 
                //     template: 'TutorialCard',
                //     header: 'SWIPE LEFT AND RIGHT',
                //     body: 'to navigate the 12 different particles.',
                //     animation: ''
                // }
            ];

            this.overlay = new OverlayCard(stateData, templateFactory, this.width, this.height);
            $("body").append(this.overlay);

            var pic = "/img/temp_profile.jpg";
            if (this.facebookID) {
                //test ID: 67563683055
                pic = "http://graph.facebook.com/"+this.facebookID+"/picture?width=150&height=150";
                //"http://graph.facebook.com/67563683055/picture?type=large";
            }   
            $(".overlay-profile", this.overlay).hide().load(function() {
                $(this).fadeIn(200);
                // console.warn("LOADED!")
            }).attr("src", pic);

            // this.rotateScreen = new RotateScreen(this.width, this.height);
            // $("body").append(this.rotateScreen);
            

                
            var isEvent = URLParamUtils.urlParam("isEvent");
            if (typeof isEvent === "boolean") { //if specified, override default
                Settings.isEvent = isEvent;
            }
            Settings.isEvent = isEvent;

            this.container.hide();
            this.overlay.hide();
            this.initialized();

            this.framework.go(GAME);
            // if (CanvasPreloader.hasLoaded)
            //     this.framework.go(GAME);
            // else
            //     this.preloader.onComplete.addOnce(this.framework.go.bind(this.framework, GAME));

            // this.load();

            //start the canvas rendering..
            this.start();
        },

        //Adds a PIXI.DisplayObjectContainer if it doesn't already exist as a child
        addChild: function(child) {
            if (this.mainContainer.children.indexOf(child) === -1)
                this.mainContainer.addChild(child);
        },

        //Removes a PIXI.DisplayObjectContainer if it exists in the main container
        removeChild: function(child) {
            if (this.mainContainer.children.indexOf(child) !== -1)
                this.mainContainer.removeChild(child);
        },

        //gui for debugging / prototyping
        setupDebugGUI: function() {
            // this.fpsCounter = $("<span>").text("FPS - 60").css({
            //     position: "absolute",
            //     bottom: 50,
            //     left: 0,
            //     width: 70,
            //     textAlign: 'right',
            //     fontFamily: 'sans-serif',
            //     color: "rgba(0,0,0,1.0)",
            //     padding: 5,
            //     background: 'white',
            //     zIndex: 100
            // }).appendTo($("body"))
            //   .hide();
        },

        setupEvents: function() {
            // this._onOrientationChange = this.onOrientationChange.bind(this);
            // $(window).bind('orientationchange', this._onOrientationChange);

            this.updateBackgroundGradientBound = this.updateBackgroundGradient.bind(this);
            ColorManager.onValueChange.add(this.updateBackgroundGradientBound);
        },

        resize: function(width, height) {
            this.parent(width, height);
           
            this.framework.resize(width, height);
            this.updateBackgroundGradient();

            this.renderer.width = this.canvas[0].width;
            this.renderer.height = this.canvas[0].height;

            this.mainContainer.scale.x = this.ratio;
            this.mainContainer.scale.y = this.ratio;

            this.overlay.resize(width, height);
        },

        onCloseOverlay: function() {
            // this.manager.blurring = false;

            //Get the RGB of the current theme's background...
            
            TweenLite.to(this.canvas, 1.0, {
                scale: 1.0,
                rotationX: 0,
                ease: Expo.easeOut,
            });

            this.overlay.animateOut();

            this.onOverlayClosed.dispatch();
            this.showingOverlay = false;
            
            // this.colorDebug.fadeIn();
        },
        
        animateIn: function() {
            this.container.show();
            TweenLite.fromTo(this.container, 1.0, {
                alpha: 0.0,
            }, {
                alpha: 1.0,
                ease: Quad.easeOut,
                onComplete: Settings.hasSeenWelcome ? this.animatedIn.bind(this) : undefined,
            });

            if (!Settings.hasSeenWelcome) {
                this.showingOverlay = true;
                this.animateInOverlay();
            } else
                this.showingOverlay = false;
            
        },

        animateOut: function() {
            this.animatedOut();
            //this.overlay.animateOut(0, this.animatedOut.bind(this));
            


            // this.overlay.animateOut();

            // TweenLite.to(this.container, 2.0, {
            //     x: this.width,
            //     ease: Expo.easeOut,
            //     onComplete: this.animatedOut.bind(this)
            // });

            // TweenLite.to(this.container, 1.0, {
            //     alpha: 0.0,
            //     // rotationX: -20,
            //     // transformPerspective: 1000,
            //     ease: Quad.easeOut,
            //     onComplete: this.animatedOut.bind(this)
            // });
        },

        animateInOverlay: function(delay) {
            delay = delay||0;

            Settings.hasSeenWelcome = true;

            this.overlay.show();
            this.overlay.bg( ColorManager.theme.gradient0.string );

            this.overlay.onClosing.remove(this.onCloseOverlayBound);
            this.overlay.onClosing.addOnce(this.onCloseOverlayBound);
            
            //This should be put into FlickScreen so it can be used regardless of section.
            // TweenLite.fromTo(this.canvas, 1.0, {
            //     // transformPerspective: 1000,
            // }, {
            //     scale: 0.95,
            //     delay: 0.1,
            //     // rotationX: -20,
            //     // transformPerspective: 1000,
            //     ease: Expo.easeOut,
            // });
            // 
            
            this.overlay.animateIn(delay, this.animatedIn.bind(this));
        },

        updateBackgroundGradient: function() {
            var x = this.width*0.15;
            var y = this.height*0.95;
            var gsc = this.height*1.0;

            // console.log("NEW BG")
            this.gradientBG = this.context.createRadialGradient(x, y, 0, x, y, gsc);
            this.gradientBG.addColorStop(0, ColorManager.theme.gradient0.string);
            this.gradientBG.addColorStop(1, ColorManager.theme.gradient1.string);

            this.overlay.bg( ColorManager.theme.gradient0.string );
        },

        destroy: function() {
            var cur = this.framework.displayManager.cContent;
            if (cur) {
                cur.destroy();
            }

            this.overlay.destroy();
            this.overlay.detach();
            ColorManager.onValueChange.remove(this.updateBackgroundGradientBound);
            this.parent();
        },
        
        drawScene: function(context, dt) {
            //draw canvas gradient...
            context.fillStyle = this.gradientBG;
            context.fillRect(0, 0, this.width, this.height);

            var curSection = this.framework.displayManager.cContent;
            if (curSection)
                curSection.draw(context, dt);
            
            this.renderer.context = context;
            this.renderer.render(this.stage);
        },  

        draw: function(context, dt) {
            ColorManager.update();
            

            this.drawScene(context, dt);    

            //update debug DOM elements
            // this.fpsCounter[0].innerText = "FPS - "+this.fps;
        },
	});

	return FlickScreen;
});