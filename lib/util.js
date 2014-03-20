var Vector2 = require('vecmath').Vector2;
var Shape = require('shape2d');
var _typeface_js = require('./typeface-stripped.js');

var style = {
    fontSize: 12,
    fontStretchPercent: 1.0,
    letterSpacing: 0
};
      
module.exports.getFaces = function() {
    return _typeface_js.faces;
};

//Look through the dict, return if we find 'search'
//Otherwise return
function doLookup(dict, search, defaultVal) {
    var first = null;
    var foundDefault = null;

    for (var k in dict) {
        var e = dict[k];
        if (e) {
            if (k === search)
                return e;

            //store the first..
            if (first === null)
                first = e;
            if (defaultVal && foundDefault === null && k === defaultVal)
                foundDefault = e;
        }
    }
    return foundDefault !== null ? foundDefault : first;
}

/**
 * Returns the face by the given family, weight and style.
 * If these parameters are passed, they are expected to succeed,
 * otherwise an error is thrown. If a parameter is undefined (falsy),
 * we will do a looser lookup, initially looking for 'normal' style/weight,
 * and if that isn't found, then falling back to any weight/style that is
 * available. 
 *
 * If no parameters are passed, we simply find the first font, or null
 * if no faces are loaded.
 * 
 * @param  {[type]} family [description]
 * @param  {[type]} weight [description]
 * @param  {[type]} style  [description]
 * @return {[type]}        [description]
 */
module.exports.getFace = function(family, weight, style) {
    family = (family||'').toLowerCase();

    var face = null;
    if (_typeface_js && _typeface_js.faces) {

        if (family && !(family in _typeface_js.faces)) {
            throw "No font with the name "+family;
        }
        //get matching font..
        var fonts = family ? _typeface_js.faces[family] : doLookup(_typeface_js.faces, family);
        
        if (weight && !(weight in fonts)) {
            throw "No '"+family+"' weight with the value "+weight;
        }
            
        var weightDict = weight ? fonts[weight] : doLookup(fonts, weight, 'normal');
        if (style && !(style in weightDict)) {
            throw "No '"+family+"' style with the type "+style;
        }
        
        face = style ? weightDict[style] : doLookup(weightDict, style, 'normal');
    }
    return face;  
};

module.exports.getFaceHeight = function(face, size) {
    style.fontSize = size; 
    return Math.round(_typeface_js.pixelsFromPoints(face, style, face.lineHeight));
}

module.exports.getFaceAscent = function(face, size) {
    style.fontSize = size;
    return Math.round(_typeface_js.pixelsFromPoints(face, style, face.ascender));   
}

module.exports.pixelsFromPoints = function(face, size, points) {
    style.fontSize = size; 
    return _typeface_js.pixelsFromPoints(face, style, typeof points === "number" ? points : 1);
};

module.exports.pointsFromPixels = function(face, size, pixels) {
    style.fontSize = size; 
    return _typeface_js.pointsFromPixels(face, style, pixels);  
};

module.exports.getGlyphMetrics = function(face, size, chr) {
    var g = face.glyphs[chr];
    if (!g || !g.o)
        return null;
    var pointScale = module.exports.pixelsFromPoints(face, size);
    return {
        xadvance: (g.ha) ? g.ha * pointScale : 0,
        height: module.exports.getFaceHeight(face, size),
        ascent: module.exports.getFaceAscent(face, size)
    };
};

function scaleAndOffset(shape, scale, offset) {
    var p = shape.points;
    for (var i=0; i<p.length; i++) {
        p[i].x = p[i].x * scale.x + offset.x;
        p[i].y = p[i].y * scale.y + offset.y;
    }
}

function getShapeList(face, size, chr, steps) {
    steps = steps || 10;
    style.fontSize = size;
    
    var glyph = face.glyphs[chr];
    if (!glyph || !glyph.o)
        return null;
    
    moveTo(0, 0);
    var shapes = [];
    var shape = new Shape();

    var curves = false, //TODO: better curve fitting; and expose it to end-user
        factor = 0.5;
    shape.approximateCurves = curves;
    shape.approximationFactor = factor;
    shape.steps = steps;

    var pointScale = _typeface_js.pixelsFromPoints(face, style, 1);
    var scl = new Vector2(pointScale * style.fontStretchPercent, -pointScale);
    var off = new Vector2(0, face.ascender*pointScale);
    
    var outline = glyph.o.split(' ');
    var outlineLength = outline.length;
    for (var i = 0; i < outlineLength; ) {
        var action = outline[i++];

        switch(action) {
            case 'm':
                if (i!==1) {
                    scaleAndOffset(shape, scl, off);
                    shapes.push(shape);

                    shape = new Shape();
                    shape.approximateCurves = curves;
                    shape.approximationFactor = factor;
                    shape.steps = steps;
                }
                shape.moveTo(outline[i++], outline[i++]);
                break;
            case 'l':
                shape.lineTo(outline[i++], outline[i++]);
                break;
            case 'q':
                var cpx = outline[i++];
                var cpy = outline[i++];
                shape.quadraticCurveTo(outline[i++], outline[i++], cpx, cpy);
                break;
            case 'b':
                var x = outline[i++];
                var y = outline[i++];
                shape.bezierCurveTo(outline[i++], outline[i++], outline[i++], outline[i++], x, y);
                break;
        }
    }
    scaleAndOffset(shape, scl, off);
    shapes.push(shape);
    return shapes;
}


module.exports.getShapeList = getShapeList;