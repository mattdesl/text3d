define( function() {
	function Cookie() {
		if( Cookie._cookieParsed == null ) {
			this._parse();
		}
	}

	Cookie._cookieParsed = null;
	Cookie.prototype._killDateStr = 'Thu, 01 Jan 1970 00:00:00 GMT';

	Cookie.prototype.setValue = function( name, value, expiry ) {

		if( expiry ) {
			document.cookie = name + '=' + value + '; expires=' + expiry.toUTCString();
		} else {
			document.cookie = name + '=' + value;
		}

		Cookie._cookieParsed[ name ] = value;
	};

	Cookie.prototype.getValue = function( name ) {
		return Cookie._cookieParsed[ name ];
	};

	Cookie.prototype.setExpiry = function( name, expiry ) {
		this.setValue( name, this.getValue( name ), expiry );
	};

	Cookie.prototype.clear = function( name ) {
		document.cookie = name + '= ; expires=' + this._killDateStr;

		delete Cookie._cookieParsed[ name ];
	};

	Cookie.prototype.clearAll = function() {
		for( var i in Cookie._cookieParsed ) {
			this.clear( i );
		}
	};

	Cookie.prototype._parse = function() {
		var cookieStr = document.cookie;
		var regex = /([a-zA-Z0-9\-_]+)=([^;]+);? */g;
		var result = null;

		Cookie._cookieParsed = {};

		while( result = regex.exec( cookieStr ) ) {
			Cookie._cookieParsed[ result[ 1 ] ] = result[ 2 ];
		}
	};



	return Cookie;
});

