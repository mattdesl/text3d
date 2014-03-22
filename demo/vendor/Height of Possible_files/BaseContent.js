define(['jquery', 'Class', 'libjs/signals/Signal'], function($, Class, Signal){

	var BaseContent = new Class({

		initialize: function( container ) {
			this.parentContainer = container;
			this.onInit = new Signal();
			this.onAnimateIn = new Signal();
			this.onAnimateOut = new Signal();
		},

		hasBeenInitialized: false,
		parentContainer: null,
		container: null,
		x: 0,
		y: 0,
		mouseX: 0,
		mouseY: 0,
		width: 0,
		height: 0,
		initData: null,
		onInit: null,
		onAnimateIn: null,
		onAnimateOut: null,
		_onEnterFrame: null,

		init: function( initData ) {
			this.initData = initData;
			this.animatedIn();
		},

		animateIn: function( delay ) {
			this.animatedIn();
		},

		animateOut: function( delay ) {
			this.animatedOut();
		},

		destroy: function() {
			//if the subclass has defined a container...
			if (this.container){
				this.container.remove();
			}
		},

		position: function( x, y ) {
			this.x = x;
			this.y = y;
			if (this.container) {
				this.container
					.css('position', 'absolute')
					.css('left', x)
					.css('top', y);
			}
		},

		resize: function( width, height ) {
			this.width = width;
			this.height = height;
		},

		addMouseMove: function() {
			$(window).mousemove(this._onMouseMove.bind(this));
		},

		removeMouseMove: function() {
			$(window).mousemove(null);
		},

		createContainer: function( params ) {
			params = params === undefined ? '' : params;

			this.container = $('<div '+ params +'></div>').appendTo( this.parentContainer );

			return this.container;
		},

		//Requires this.container to be non-null ...
		setContainerId: function( containerID ) {
			this.container.attr( 'id', containerID );

			return this.container;
		},
		//Requires this.container to be non-null ...
		setContainerClass: function( containerClass ) {
			this.container.attr( 'class', containerClass );

			return this.container;
		},

		_preventDefault: function(event){
			event.preventDefault();
		},

		initialized: function() {
			this.hasBeenInitialized = true;
			this.onInit.dispatch(this);
		},

		animatedIn: function() {
			this.onAnimateIn.dispatch( this );
		},

		animatedOut: function() {
			this.onAnimateOut.dispatch( this );
		},

		_onMouseMove: function( ev ) {
			var off = this.container.offset();
			this.mouseX = ev.pageX - off.left;
			this.mouseY = ev.pageY - off.top;
		}
		
	});

	return BaseContent;

});