define(['Class', 'libjs/framework/view/BaseContent'], function(Class, BaseContent){

	var BaseController = new Class({
		
		Extends: BaseContent,

		templateFactory: null,

		initialize: function(container, templateFactory){
			this.templateFactory = templateFactory;
			this.parent( container );
		},

		init: function(templateName, data){

			this.initData = data;

			var template = '';
			if (templateName){
				template = this.templateFactory.render(templateName, data);
			}
			
			this.container = $('<div class="section">'+template+'</div>');
			this.container.css({
				width: this.width,
				height: this.height,
				position: 'absolute',
				top: 0,
				left: 0
			});

			if (this.parentContainer){
				this.parentContainer.append( this.container );
			}

		},

		// Add and keep track of signals for easy removal
		addSignal: function(signal, handler, once){
			if (!this._addedSignals) this._addedSignals = [];
			var signalObj = {
				signal: signal,
				handler: handler
			};
			if (once === true){
				signalObj.signal.addOnce( signalObj.handler );
			} else {
				signalObj.signal.add( signalObj.handler );
			}
			this._addedSignals.push( signalObj );
		},

		removeAddedSignals: function(){
			// Remove signals
			if (this._addedSignals && this._addedSignals.length){
				for (var i = 0, len = this._addedSignals.length; i < len; i += 1) {
					var signalObj = this._addedSignals[i];
					signalObj.signal.remove( signalObj.handler );
				}
			}
		},

		resize: function( width, height ){

			this.parent(width, height);

			if (this.container){
				this.container.css({
					width: width,
					height: height
				});
			}

		},

		destroy: function(){
			this.removeAddedSignals();
			this.parent();
		}

	});

	return BaseController;

});