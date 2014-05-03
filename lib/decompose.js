var Shape = require('shape2d');

var funcs = {
    'm': 'moveTo',
    'l': 'lineTo',
    'q': 'quadraticCurveTo',
    'c': 'bezierCurveTo'
};

/**
 * Decomposes 
 * @param  {[type]} face  [description]
 * @param  {[type]} size  [description]
 * @param  {[type]} chr   [description]
 * @param  {[type]} steps [description]
 * @return {[type]}       [description]
 */
module.exports = function(glyph, options) {
    options = options||{};

    var curves = Boolean(options.approximateCurves);
    var steps = options.steps||10;
    var factor = options.approximationFactor;
    factor = (typeof factor==="number") ? factor : 0.5;

    var shapes = [];
    var shape = new Shape();
    shape.approximateCurves = curves;
    shape.approximationFactor = factor;
    shape.steps = steps;

    if (!glyph.path || glyph.path.length===0)
        return shapes;

    var path = glyph.path;
    for (var i=0; i<path.length; i++) {
        var p = path[i];
        var args = p.slice(1);
        var fkey = funcs[ p[0] ];

        //assume we are on a new shape when we reach a moveto
        //this may not be 100% robust in edge case fonts
        if (i!==0 && fkey==='moveTo') {
            //push the current shape ahead..
            shapes.push(shape);

            shape = new Shape();
            shape.approximateCurves = curves;
            shape.approximationFactor = factor;
            shape.steps = steps;
        }

        shape[fkey].apply(shape, args);
    }

    shapes.push(shape);
    return shapes;
}