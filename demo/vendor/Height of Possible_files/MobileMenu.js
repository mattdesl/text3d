define(['Class', 
	'framework/controllers/BaseController', 
	'framework/auth/Facebook',
    'flick/dom/OverlayCard',
        'framework/templates/mobile/_compiledTemplates',
    'libjs/framework/view/HandlebarsTemplateFactory',
	'PIXI',
	 'Global',
	 'utils/DOMUtil'], function(Class, BaseController, Facebook, OverlayCard, templates, HandlebarsTemplateFactory, PIXI, Global, DOMUtil){

	var MobileMenu = new Class({
		
		Extends: BaseController,

		init: function(template, data){
			this.parent(template, data);

			//setup any dom sprites
			DOMUtil.setupSprites(this.container);

			this.closeButton = $('.mobile-menu-close', this.container);

			DOMUtil.attachTouchFade($('.mobile-menu-item', this.container));
			DOMUtil.attachTouchFade(this.closeButton);

			this.closeButton.on('touchstart', function() {
				Global.framework.go('flickScreen');
			});

			this.onCloseOverlayBound = this.onCloseOverlay.bind(this);

			$('.mobile-menu-about', this.container).on('touchstart', function() {
				Global.framework.go('about');
			}.bind(this));

			$('.mobile-menu-signout', this.container).on('touchstart', function() {
	            this.overlay.onClosing.remove(this.onCloseOverlayBound);
	            this.overlay.onClosing.addOnce(this.onCloseOverlayBound);

				this.overlay.show();
	            this.overlay.bg('#002343');
	            this.overlay.animateIn(0.0);
			}.bind(this));
			
			var src = Facebook.user.data.id ? Facebook.profilePhotoURL(150, 150) : "img/temp_profile.jpg";
			$('.overlay-profile', this.container).attr("src", src);
			$('.mobile-menu-header', this.container).text(Facebook.user.data.first_name);
			this.container.hide();




            var templateFactory = new HandlebarsTemplateFactory(templates);

            var stateData = [
                { 
                    flip: false,
                    template: 'WelcomeCard', //<--- may need to change
                    header: 'ARE YOU SURE?',
                    name: this.name,
                    subHeader: 'ARE YOU SURE YOU WANT TO SIGN OUT?',
                    body: '',
                    animation: ''
                },
            ];
			this.overlay = new OverlayCard(stateData, templateFactory, this.width, this.height, 'SignOutPanel');
            $("body").append(this.overlay);

            this.overlay.hideProfile();
            this.overlay.hide();

            $("#signout-yes", this.overlay).on('touchstart', function() {
            	console.log("SIGNOUT!");
				this.overlay.animateOut();
			}.bind(this));

			
			$("#signout-no", this.overlay).on('touchstart', function() {
				this.overlay.animateOut();
			}.bind(this));
            	
        	DOMUtil.attachTouchFade($(".signout-button"));

			this.initialized();
		},

		onCloseOverlay: function() {
			this.overlay.animateOut();
		},

		resize: function(width, height) {
			this.parent(width, height);
			this.overlay.resize(width, height);
		},

		destroy: function() {
			this.overlay.destroy();
			this.overlay.detach();
		},

		animateOut: function() {
			TweenLite.to(this.container, .5, {
				x: -this.width,
				ease: Expo.easeOut,
				onComplete: this.animatedOut.bind(this)
			});
		},

		animateIn: function() {
			this.container.show();
			TweenLite.fromTo(this.container, 1.0, {
				x: -this.width,
			}, {
				x: 0,
				delay: this.initData.animateInDelay,
				ease: Expo.easeOut,
				onComplete: this.animatedIn.bind(this)
			});
		},

	});

	return MobileMenu;
});