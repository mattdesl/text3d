var util = require('fontutils');
var Matrix3 = require('vecmath').Matrix3;
var Vector3 = require('vecmath').Vector3;

var tmpVec = new Vector3();

module.exports = function(x, y, font, glyph, fontSize, outMatrix) {
	var pxSize = util.pointsToPixels(fontSize, font.resolution);

	var pointScale = (32/font.size) * pxSize / font.units_per_EM;

	if (!outMatrix)
		outMatrix = new Matrix3();
	else
		outMatrix.idt();
	outMatrix.translate( tmpVec.set(x, y) );
	outMatrix.scale( tmpVec.set(pointScale, -pointScale) );
	outMatrix.translate( tmpVec.set(-glyph.hbx, 0) );
	return outMatrix;
}