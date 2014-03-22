define([], function(){

	function Signal() {
		this._signalID = "signal" + Signal.nextSignalID;
		this._addOnceList = {};
		this._listeners = [];

		Signal.nextSignalID++;

		//this ensures that an infinite recursion wont happen
		if (arguments.length === 0) {
			this.onListenerAdded = new Signal(false);
			this.onListenerRemoved = new Signal(false);
		}
	}

	Signal.nextSignalID = 0;
	Signal.nextListenerID = 0;
	Signal.prototype.countListeners = 0;
	Signal.prototype._signalID = 0;
	Signal.prototype._addOnceList = null;
	Signal.prototype._listeners = null;
	Signal.prototype._dispatchStopped = false;
	Signal.prototype.onListenerAdded = null;
	Signal.prototype.onListenerRemoved = null;

	Signal.prototype.addOnce = function(listener, target) {
		this.add(listener, target);

		this._addOnceList[listener.listenerIDX[this._signalID]] = true;
	};

	Signal.prototype.add = function(listener, target) {
		if (listener.listenerIDX === undefined) {
			listener.listenerID = Signal.nextListenerID++;
			listener.listenerIDX = {};
			listener.targets = {};
		}

		if (listener.listenerIDX[ this._signalID ] === undefined) {
			listener.listenerIDX[ this._signalID ] = this._listeners.length;
			listener.targets[ this._signalID ] = target;

			this._listeners[this._listeners.length] = listener;

			this.countListeners++;

			if (this.onListenerAdded !== null) this.onListenerAdded.dispatch();
		}
	};

	Signal.prototype.remove = function(listener) {
		if (typeof(listener)!='undefined' && this._checkHasId(listener)) {
			var delIDX = listener.listenerIDX[ this._signalID ];

			//delete the listener
			this._listeners.splice(delIDX, 1);

			//update the index for the listeners
			for (var i = delIDX; i < this._listeners.length; i++) {
				this._listeners[i].listenerIDX[ this._signalID ] = i;
			}

			this.countListeners--;

			if (this.onListenerRemoved !== null) this.onListenerRemoved.dispatch();

			delete listener.listenerIDX[ this._signalID ];
			delete listener.targets[ this._signalID ];
		}
	};

	Signal.prototype.dispatch = function() {

		//this is nasty I wonder if theres a better way to do this
		var functionsToCall = this._listeners.concat();

		for (var i = 0; !this._dispatchStopped && i < functionsToCall.length; i++) {

			functionsToCall[ i ].apply( functionsToCall[i].targets[ this._signalID ], arguments);

			if (this._addOnceList[ i ] !== undefined) {

				this.remove( this._listeners[ i ] );

				delete this._addOnceList[ i ];
			}
		}

		this._dispatchStopped = false;
	};

	Signal.prototype.stopDispatch = function() {
		this._dispatchStopped = true;
	};

	Signal.prototype._checkHasId = function(listener) {
		return listener.listenerIDX !== undefined && listener.listenerIDX[this._signalID] !== undefined;
	};

	return Signal;

});