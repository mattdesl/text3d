define(['Class', 'framework/controllers/BaseController', 'Global', 'framework/assets/Preloader', 'framework/assets/manifests/mobileManifest', 'libjs/signals/Signal'], function(Class, BaseController, Global, Preloader, mobileManifest, Signal){

	var PreloaderController = new Class({
		
		Extends: BaseController,

		initialize: function(container, factory) {
			this.parent(container, factory);

			//default manifest...
			this.manifest = mobileManifest;

			this.onComplete = new Signal();
		},

		init: function(template, data){
			this.parent(template, data);
			this.initialized();
			console.log("LOADING MANIFEST", this.manifest);
			var preloader = new Preloader(this.manifest || mobileManifest);
			preloader.onComplete.addOnce( this.onCompleteHandler.bind(this) );
			preloader.start();
		},

		onCompleteHandler: function(){
			console.log('preload complete');

			this.onComplete.dispatch();
			this.next();
		},

		next: function(){
			if (this.initData && this.initData.next)
				Global.framework.go(this.initData.next);
		}

	});

	return PreloaderController;

});