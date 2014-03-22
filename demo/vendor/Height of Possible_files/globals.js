define( function() {
	var global = {};

	global.addGlobal = function( name, item ) {
		if( this[ name ] !== undefined ) {
			throw new Error( 'You tried to add a global that already existed: ' + name );
		} 

		global[ name ] = item;
	};

	global.removeGlobal = function( name ) {

		if( this[ name ] !== undefined ) {

			global[ name ] = undefined;
			delete global[ name ];
		}
	}

	return global;
});