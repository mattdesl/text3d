var Vector2 = require('vecmath').Vector2;

var test = require('canvas-testbed');
var Lato = require('./fonts/Lato.json');

var toGlyphMatrix = require('./toGlyphMatrix');
var decompose = require('../lib/decompose');


var tmpVec = new Vector2();
var glyph = Lato.glyphs["a"];
var shapes = decompose(glyph, {
	steps: 14,
});

//We can optionally simplify the path like so.
//Remember, they are in font units (EM)
for (var i=0; i<shapes.length; i++) {
	shapes[i] = shapes[i].simplify( Lato.units_per_EM/72 * 0.5 );
}

//Setup a simple glyph matrix to scale from EM to screen pixels...
var glyphMatrix = toGlyphMatrix(20, 100, Lato, glyph, 128);

function render(context, width, height) {
	context.clearRect(0, 0, width, height);

	for (var i=0; i<shapes.length; i++) {
		var s = shapes[i];
		for (var j=0; j<s.points.length; j++) {
			var p = s.points[j];

			tmpVec.copy(p);
			tmpVec.transformMat3(glyphMatrix);

			var sz = 2;
			context.fillRect(tmpVec.x-sz/2, tmpVec.y-sz/2, sz, sz);
		}
	}
}

//render a single frame to the canvas testbed
test(render, null, { once: true });
