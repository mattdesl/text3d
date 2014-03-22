define(['Class', 'jquery', 'libjs/signals/Signal'], function(Class, $, Signal){

	var StateMachine = new Class({

		stateList: null,
		onStateChangeStart: null,
		onStateChanged: null,
		lastState: null,
		curState: null,
		watchingHash: false,

		initialize: function(){
			this.stateList = [];
			this.paramRegex = /(:[^/]*)/g;
			this.onStateChanged = new Signal();
			this.onStateChangeStart = new Signal();
		},

		state: function(state){

			if (!state.name){
				console.warn('state "name" was NOT provided in state definition', state);
				return this;
			}

			// regexify url
			if (state.url){
				var matches = state.url.match(this.paramRegex);
				//console.log('matches: ', matches);
				var urlRegexString = '^'+state.url;
				// parameters
				if (matches){
					state.paramVars = [];
					for (var i = 0, len = matches.length; i < len; i += 1) {
						urlRegexString = urlRegexString.replace(matches[i], '([^/]*)');
						state.paramVars.push( matches[i].substring(1) );
					}
				}
				if (urlRegexString.slice(-1) == "/") urlRegexString = urlRegexString.substr(0, urlRegexString.length-1);
				urlRegexString += "/?$";
				state.urlRegex = new RegExp(urlRegexString, 'i');
			}

			this.stateList.push( state );

			return this;

		},

		states: function(states){
			for (var i = 0, len = states.length; i < len; i += 1) {
				this.state( states[i] );
			}
			return this;
		},

		// HASH
		hashChanged: function(){
			var url = window.location.hash.slice(1);
			console.log('hashChanged: ', url);
			// Match
			// debugger;
			for (var i = 0, len = this.stateList.length; i < len; i += 1) {
				var state = this.stateList[i];
				if (state.urlRegex){
					var matches = state.urlRegex.exec( url );
					if (matches){
						var params = null;
						// Prepare params
						if (state.paramVars){
							params = {};
							for (var j = 0, len = state.paramVars.length; j < len; j += 1) {
								params[state.paramVars[j]] = matches[j+1];
							}
						}
						this.changeState( state, params );
						return;
					}
				}
			}
			//this.goToDefault();
		},
		watchHash: function(initialChange){
			this.watchingHash = true;
			$(window).on('hashchange', function() {
				this.hashChanged();
			}.bind(this));
			if (initialChange !== false){
				this.hashChanged();
			}
		},

		changeState: function(state, params){
			this.onStateChangeStart.dispatch(state);
			// Hijacked?
			if (this.hijackedStateName){
				var goToState = this.hijackedStateName;
				this.hijackedStateName = null;
				this.go( goToState );
				return;
			}
			// clone
			state = $.extend({}, state);
			// run all funcitons in data
			if (state.data){
				for (var d in state.data){
					if (typeof(state.data[d]) == 'function'){
						// Execute function
						state.data[d] = state.data[d]();
					}
				}
			}
			state.params = $.extend(state.data, params);
			this.lastState = this.curState;
			this.curState = state;
			console.log('State changed: ', state.name);
			this.onStateChanged.dispatch( this.curState, this.lastState );
		},

		// If you call hijack on onStateChangeStart, it will stop the current state change
		// and go to the state that you specify
		hijack: function(stateName){
			this.hijackedStateName = stateName;
		},

		go: function( stateName, params ){
			console.log("go: ", stateName, params);
			var state = this.getStateByName( stateName );
			if (!state){
				console.warn('Could not find state with name:', stateName);
				return;
			}
			var currentHashURL = window.location.hash.slice(1);
			// IF
			// not watchingHash or
			// no state.url or
			// state.updateURL is false or
			// current url is equal to state.url
			if (!this.watchingHash || !state.url || state.updateURL === false || state.url == currentHashURL){
				this.changeState(state, params);
			} else {
				var url = state.url;
				// Found state
				// Validate params
				if (state.paramVars){
					if (!params){
						console.warn('State url contains parameters, but none were provided', state.url);
						return;
					}
					// Check that we have these params in our url
					for (var i = 0, len = state.paramVars.length; i < len; i += 1) {
						if (params[state.paramVars[i]] === undefined){
							console.warn('State parameters provided, ', params, ' do not match the url:', state.url);
							return;
						}
					}
					// All parameters are present
					// Replace paremeters in URL
					for (var j = 0, len = state.paramVars.length; j < len; j += 1) {
						var search = ':'+state.paramVars[j];
						var replace = params[state.paramVars[j]];
						url = url.replace(search, replace);
					}
				}
				// Update browser URL
				window.location.hash = url;
			}
		},

		goToDefault: function(){
			if (this.defaultStateName){
				this.go( this.defaultStateName );
			}
		},

		defaultState: function(def){
			this.defaultStateName = def;
			return this;
		},

		getStateByName: function(name){
			for (var i = 0, len = this.stateList.length; i < len; i += 1) {
				if (this.stateList[i].name == name){
					return this.stateList[i];
				}
			}
			return null;
		}

	});

	return StateMachine;

});