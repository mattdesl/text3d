define(['Class', 'PIXI', 'preloadjs', 'libjs/signals/Signal'], function(Class, PIXI, preloadjs, Signal){

	var Preloader = new Class({

		manifest: null,

		pixiManifest: null,
		createJSManifest: null,

		pixiLoader: null,
		createJSLoader: null,

		onComplete: null,
		onProgress: null, // Not hooked up right now
		onError: null,

		initialize: function(manifestArr){
			this.onComplete = new Signal();
			this.onProgress = new Signal();
			this.onError = new Signal();

			this.manifest = manifestArr;
			if (this.manifest && this.manifest.length){
				for (var i = 0, len = this.manifest.length; i < len; i += 1) {
					var item = this.manifest[i];
					var url = item.url;
					if (url){
						var ext = this.getExtension(url);
						switch(ext){
							case 'json':
								this.addJSON(url);
								break;
							case 'png':
							case 'jpg':
							case 'jpeg':
							case 'gif':
								this.addImage(url);
								break;
						}
					}
				}
			} else {
				console.warn('Preload manifest is empty');
			}
		},

		start: function(){
			// Load PIXI first
			this.loadPIXI();
		},

		loadPIXI: function(){
			// Load PIXI first
			if (this.pixiManifest && this.pixiManifest.length){
				this.pixiLoader = new PIXI.AssetLoader(this.pixiManifest);
				this.pixiLoader.addEventListener('onComplete', function(){
					this.loadCreateJS();
				}.bind(this));
				this.pixiLoader.load();
			} else {
				this.loadCreateJS();
			}
		},

		loadCreateJS: function(){
			if (this.createJSManifest){
				this.createJSLoader = new preloadjs.LoadQueue(this.createJSManifest);
				// this.createJSLoader.addEventListener('progress', function() {
				// 	console.log("TEST", arguments);
				// });
				this.createJSLoader.addEventListener('complete', function(){
					this.onComplete.dispatch();
				}.bind(this));
				this.createJSLoader.load();
			} else {
				this.onComplete.dispatch();
			}
		},

		addJSON: function(url){
			if (!this.pixiManifest){ this.pixiManifest = []; }
			this.pixiManifest.push(url);
		},

		addImage: function(url){
			if (!this.createJSManifest) { this.createJSManifest = []; }
			this.createJSManifest.push( url );
		},

		// utiles
		getExtension: function(filename){
			return filename.split('.').pop();
		}

	});

	return Preloader;

});