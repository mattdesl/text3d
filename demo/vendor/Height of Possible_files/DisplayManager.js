define( ['Class', 'libjs/framework/view/BaseContent', 'libjs/signals/Signal' ], function(Class, BaseContent, Signal ){

	var DisplayManager = new Class({

		initialize: function( width, height, contentOverlaps ) {
			this.width = width === undefined ? 980 : width;
			this.height = height === undefined ? 570 : height;
			this._contentOverlaps = contentOverlaps;
			this.onContentStartAnimateIn = new Signal();
			this.onContentAnimatedOut = new Signal();
			// Bind countent out
			this._onContentOutBound = this._onContentOut.bind(this);
			this._onContentOutDestroyBound = this._onContentOutDestroy.bind(this);
			this._onContentInitBound = this._onContentInit.bind(this);
		},

		templateFactory: null,

		onContentStartAnimateIn: null,
		onContentAnimatedOut: null,
		cContent: null,
		nContent: null,
		width: 0,
		height: 0,
		_contentOverlaps: false,
		_prevContent: null,
		delayBetween: 0,

		setContentOverlaps: function( value ) {
			this._contentOverlaps = value;
		},

		changeContent: function( nContent ) {

			if (typeof(nContent.init)!='function' ||
			 	typeof(nContent.animateIn)!='function' ||
			 	typeof(nContent.animateOut)!='function' ||
			 	typeof(nContent.destroy)!='function' ||
			 	typeof(nContent.resize)!='function' ||
			 	typeof(nContent.position)!='function') {
				throw 'DisplayManager required functions not found!';
			}

			if (nContent != this.cContent && nContent != this.nContent) {

				if (this.nContent) {
					if (this.nContent.hasBeenInitialized){
						// Make sure to remove signals
						this.fullyDestroyContent( this.nContent );
					}
				}

				this.nContent = nContent;

				if ( !this.nContent.hasBeenInitialized ) {

					this.nContent.onInit.addOnce(this._onContentInit.bind(this));

					// Set width and height before init
					this.nContent.width = this.width;
					this.nContent.height = this.height;

					var args = Array.prototype.slice.call( arguments, [-(arguments.length-1)] );
					this.nContent.init.apply( this.nContent, args );
					
				} else {

					this._onContentInit();
				}
			}
		},

		fullyDestroyContent: function(content){
			content.onAnimateOut.remove(this._onContentOutBound);
			content.onAnimateOut.remove(this._onContentOutDestroyBound);
			content.onInit.remove(this._onContentInitBound);
			content.destroy();
		},

		clearContent: function() {
			if( this.cContent ) {
				this.cContent.onAnimateOut.addOnce(this._onContentOutDestroyClear.bind(this));
				this.cContent.animateOut( 0 );
			}
		},

		position: function( x, y ) {
			this.x = x;
			this.y = y;

			if (this.nContent !== null && this.nContent.hasBeenInitialized) this.nContent.position( x, y );

			if (this.cContent !== null) this.cContent.position( x, y );
		},

		resize: function(width, height) {
			this.width = width;
			this.height = height;

			if (this.nContent !== null && this.nContent.hasBeenInitialized) this.nContent.resize(width, height);
			if (this.cContent !== null) this.cContent.resize(width, height);
		},

		update: function(){

			// New content
			if (this.nContent && this.nContent.hasBeenInitialized) this.nContent.update();

			// Current content
			if (this.cContent) this.cContent.update();

		},

		_onContentInit: function(content) {
			if (content != this.nContent) return;

			if (this.nContent){
				this.nContent.resize( this.width, this.height );
			}

			if (!this.cContent){
				this._bringInNewContent();
			} else if (this.cContent != content){
				if (this.cContent !== null) {
					if( !this._contentOverlaps ) {
						this.cContent.onAnimateOut.addOnce(this._onContentOutBound);
						this.cContent.animateOut( 0 );
					} else {
						this.cContent.onAnimateOut.addOnce(this._onContentOutDestroyBound);
						this.cContent.animateOut( 0 );

						this._bringInNewContent(this.delayBetween);
					}
				}
			}

		},

		_onContentOut: function( contentToDestroy ) {
			this.fullyDestroyContent( contentToDestroy );
			this.onContentAnimatedOut.dispatch();

			this._bringInNewContent();
		},

		_onContentOutDestroyClear: function( contentToDestroy ) {
			this._onContentOutDestroy( contentToDestroy );
			this.cContent = null;
		},

		_onContentOutDestroy: function( contentToDestroy ) {
			this.fullyDestroyContent( contentToDestroy );
			this.onContentAnimatedOut.dispatch();
		},

		_bringInNewContent: function(delay) {
			console.log("NEW CONTENT")
			delay = delay || 0;
			if (this.nContent) {
				// Make sure to destroy cContent if it's still there
				if (this.cContent && !this.cContent.hasBeenDestroyed){
					this.fullyDestroyContent( this.cContent );
				}
				this.cContent = this.nContent;
				this.cContent.resize( this.width, this.height );
				this.cContent.position( this.x, this.y );
				this.cContent.animateIn( delay );
				this.nContent = null;

				this.onContentStartAnimateIn.dispatch();
			}
		}
	});

	return DisplayManager;

});