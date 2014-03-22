define([ 'Class', 'libjs/framework/view/DisplayManager', 'libjs/globals/globals', 'libjs/signals/Signal', 'libjs/framework/StateMachine'], function( Class, DisplayManager, globals, Signal, StateMachine ) {

	var Framework = new Class( {

		onInit: null,
		onSectionChange: null,
		displayContainer: null,
		displayManager: null,
		dataToPass: null,

		initialize: function( displayContainer, templateFactory, controllers, width, height ) {

			this.onInit = new Signal();
			this.onSectionChange = new Signal();

			this.displayContainer = displayContainer;
			this.controllers = controllers;

			if (templateFactory){
				this.templateFactory = templateFactory;
			}

			this.displayManager = new DisplayManager( width, height );

			this.stateMachine = new StateMachine();
			this.go = this.stateMachine.go.bind(this.stateMachine);

			this._setup();

		},

		init: function() {
			console.warn('Framework.init() has been deprecated, init happens during initialization');
			return this;
		},

		passToContstructors: function() {
			this.dataToPass = Array.prototype.slice.call( arguments );
			this.dataToPass.splice( 0, 0, this.displayContainer );
		},

		resize: function( width, height ) {

			this.displayContainer.css({
				width: width,
				height: height
			});
			this.displayManager.resize( width, height );

			return this;
		},

		_setup: function() {

			this.onInit.dispatch();

			this.stateMachine.onStateChanged.add( this._onStateChange.bind(this) );

		},

		_onStateChange: function( state ) {

			var controllerClass = this.controllers[ state.controller ];

			if ( controllerClass ) {

				// Get template
				var template = null;
				if (this.templateFactory && state.template){
					// Render the template in each controller
					// template = this.templateFactory.render( state.template, state.data );
				}
				//Instantiate a new object and pass the data to the contructor from dataToPass
				//This looks funky cause we need to do an apply with the data to pass array
				if( this.dataToPass && this.dataToPass.length ) {
					var nObj = Object.create( controllerClass.prototype );
					controllerClass.apply( nObj, this.dataToPass );
					this.displayManager.changeContent( nObj, state.template, state.params );
				} else {
					this.displayManager.changeContent( new controllerClass( this.displayContainer ), state.template, state.params );
				}

			} else {

				console.error('Controller class not found: ', state.controller);

			}

		}

	});

	return Framework;
});