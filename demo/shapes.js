var Matrix3 = require('vecmath').Matrix3;
var Vector2 = require('vecmath').Vector2;

var test = require('canvas-testbed');
var Lato = require('./fonts/Lato.json');

var decompose = require('../lib/decompose');

var util = require('fontutils');
var glyphMatrix = new Matrix3();
var tmpVec = new Vector2();


var glyph = Lato.glyphs["a"];
var shapes = decompose(glyph, {
	steps: 14,
});

//We can optionally simplify the path like so.
//Remember, they are in font units (EM)
for (var i=0; i<shapes.length; i++) {
	shapes[i] = shapes[i].simplify( Lato.units_per_EM/72 );
}

//Setup a simple glyph matrix to scale from EM to screen pixels...
setupGlyphMatrix(20, 100, Lato, glyph, 128, glyphMatrix);

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

//setup our matrix
function setupGlyphMatrix(x, y, font, glyph, fontSize, outMatrix) {
	var pxSize = util.pointsToPixels(fontSize, font.resolution);

	var pointScale = (32/font.size) * pxSize / font.units_per_EM;
	outMatrix.idt();
	outMatrix.translate( tmpVec.set(x, y) );
	outMatrix.scale( tmpVec.set(pointScale, -pointScale) );
}

//render a single frame to the canvas testbed
test(render, null, { once: true });
