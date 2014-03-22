require([
    'jquery',
    'libjs/framework/Framework',
    'handlebars',
    'framework/templates/mobile/_compiledTemplates',
    'libjs/framework/view/HandlebarsTemplateFactory',
    'framework/controllers/MobileControllers',
    'framework/controllers/mobile/Preloader',
    'framework/controllers/mobile/LostConnectionScreen',
    'framework/controllers/mobile/KeepContributingScreen',
    'framework/controllers/mobile/MobileMenu',
    'framework/states/mobileStates',
    'framework/auth/Facebook',
    'framework/config/Dev',
    'framework/Network',
    'framework/assets/manifests/mobileManifestAtHome',
    'flick/dom/RotateScreen',
    'Global'
], function (
    $,
    Framework,
    handlebars,
    templates,
    HandlebarsTemplateFactory,
    MobileControllers,
    Preloader,
    LostConnectionScreen,
    KeepContributingScreen,
    MobileMenu,
    mobileStates,
    Facebook,
    Dev,
    Network,
    mobileManifestAtHome,
    RotateScreen,
    Global
) {


    $(function(){
        var templateFactory = new HandlebarsTemplateFactory(templates);

        //The background remains static behind all the different views
        var background = templateFactory.render("Background");
        $("body").append(background);

        //This will force the loading of the rotate screen BG image.
        //So maybe we should preload it somewhere..?
        var rotateScreen = new RotateScreen( templateFactory, windowWidth, windowHeight );

        var sectionContainer = $("#container");

        //Some overlays that appear over all content.
        var keepContributingScreen = new KeepContributingScreen($("body"), templateFactory);

        var lostConnectionScreen = new LostConnectionScreen($("body"), templateFactory);
        
        var framework = new Framework(sectionContainer, templateFactory, MobileControllers);
        
        $(window).on('resize', resizeHandler);

        // BEGIN resise
        var windowWidth = 0;
        var windowHeight = 0;
        function resizeHandler(){
            windowWidth = $(window).width();
            windowHeight = $(window).height();


            framework.resize( windowWidth, windowHeight );
            rotateScreen.resize( windowWidth, windowHeight );
            lostConnectionScreen.resize( windowWidth, windowHeight );
            keepContributingScreen.resize( windowWidth, windowHeight );
        }
        resizeHandler();
        // END resize

        // INIT framework
        framework.passToContstructors( templateFactory );
        framework
            .init()
            .resize(windowWidth, windowHeight)
            .stateMachine
                .states(mobileStates)
                .defaultState('home');
        // END INIT framework

        // Expose to the world
        Global.framework = framework;


        //unspecified manifest defaults to the "full" (for Event experience)
        var mainPreloader = new Preloader();

        //Load the initial stuff
        mainPreloader.manifest = mobileManifestAtHome;
        
        mainPreloader.onComplete.add(function() {
            keepContributingScreen.init('KeepContributing');
            lostConnectionScreen.init('LostConnection');

            // initialize watch hash
            framework.stateMachine.watchHash((ENV!='development'));

            if (ENV == 'development' && Dev.initialMobileState){
                framework.go(Dev.initialMobileState);
            } else if (ENV == 'development') { 
                framework.go('flickScreen');
            }

        });

        mainPreloader.init();



        

        //Handle the "Connection Lost" overlay
        Network.onOtherDeviceJoined.add(function() {
            console.log("Other device joined");
            if (lostConnectionScreen.showing) {
                Network.thisDeviceSyncComplete();    
            }
            lostConnectionScreen.animateFullSync(0, 
                lostConnectionScreen.animateOut.bind(lostConnectionScreen)
            );
        });
        Network.onOtherDeviceDisconnected.add(function() {
            console.log("Other device disconnected");
            lostConnectionScreen.showDisconnect();
        });



        //Handle the "Keep Contributing" overlay
        Network.onOtherDeviceLeftContribute.add(function() {
            keepContributingScreen.showDisconnect(); 
        });
        Network.onOtherDeviceEnteredContribute.add(function() {
            keepContributingScreen.animateOut();
        });



        $("body").append(keepContributingScreen);
        $("body").append(lostConnectionScreen);
        $("body").append(rotateScreen);



        //Here's how we can handle "scroll to start" (to hide iOS 7 bar)
        //   1. If iOS 7 is detected, we show a "Scroll to Start" page with a long height.
        //   2. Once the user scrolls past Y threshold, we lock scrolling by using a preventDefault
        //      on window. We also scrollTo the Y threshold to ensure we're anchored at the top.
        //   3. On window orientation change, we scroll back to the top. Then repeat from step 1. 

        //The tricky thing will be positioning the rest of the content accordingly; since
        //everything needs to be offset by exactly Y amount. And there are probably some edge cases
        //where something will break; and then EVERYTHING will look shitty.

        $(window).bind('orientationchange', function() {
            resizeHandler();

            if ( Math.floor(Math.abs(window.orientation)) === 90 ) {
                rotateScreen.animateIn();
            } else {
                rotateScreen.animateOut();
            }
        });

		// Check initial window orientation
		if (window.DeviceOrientationEvent && typeof window.orientation === "number") {
            if ( Math.floor(Math.abs(window.orientation)) === 90 )
                rotateScreen.animateIn();
        }

    });

});
