define(['Class', 'framework/controllers/BaseController', 
	'framework/Network', 'utils/DOMUtil', 'ui/SlideUp',
	'ui/BaseSyncCanvas', 'framework/auth/Facebook', 'Global'], function(Class, BaseController, 
		Network, DOMUtil, SlideUp,
		BaseSyncCanvas, Facebook, Global){

	var HomeController = new Class({
		
		Extends: BaseController,

		//Will also act as the "FB Error" page.

		init: function(template, data){
			
			this.parent(template, data);

			Facebook.onServersideLoggedIn.add(function(){
				// console.log('Global: ', Global);

				
				Global.framework.go('connectToDesktop');
				
			});

			this.button = this.container.find('#fb-login-but');
			this.button.on('click', function(){
				Facebook.loginServerside();
			});

			DOMUtil.setupSprites(this.container);
			DOMUtil.attachTouchFade(this.button);




			this.initialized();

		},

		animateIn: function() {

			SlideUp.animate( $(".home-header", this.container), { delay: 0.0, } );

			var items = $(".home-hero > div", this.container);
			SlideUp.animate( items, { delay: 0.2, } );

			items = $(".home-body > div", this.container);
			SlideUp.animate( items, { delay: 0.4 } );

			SlideUp.animate( this.button, { delay: 1.0, onComplete: this.animatedIn.bind(this) } )
		},

		// animateOut: function() {
		// 	TweenLite.to(this.container, 0.5, {
		// 		x: this.width,
		// 		ease: Expo.easeOut
		// 	});
		// },

		animateOut: function() {
			SlideUp.animate( $(".home-body > div", this.container), { 
				onComplete: this.animatedOut.bind(this) ,
				reverse: true,
			});
		},

	});

	return HomeController;

});