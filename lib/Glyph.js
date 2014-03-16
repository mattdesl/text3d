var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;

var triangulateShapes = require('./triangulate');
var util = require('./util');

var tmp = new Vector3();

/**
 * A glyph holds the contour and triangulated mesh of a font.
 * 
 * @param  {[type]} face     [description]
 * @param  {[type]} chr      [description]
 * @param  {[type]} size     [description]
 * @param  {[type]} steps    [description]
 * @param  {[type]} simplify [description]
 * @param  {[type]} scale)   {                   if (!chr)            throw new Error('must specify a valid character for this glyph');        if (!face)            throw new Error("must specify a typeface 'font face' for a Glyph");        simplify = typeof simplify === "number" ? simplify : Glyph.DEFAULT_SIMPLIFY;        steps = typeof steps === "number" ? steps : Glyph.DEFAULT_STEPS;        size = typeof size === "number" ? size : Glyph.DEFAULT_SIZE;        scale = typeof scale === "number" ? scale : 1.0;                var shapes = util.getShapeList(face, size, chr, steps);                if (!shapes) {            shapes = util.getShapeList(face, size, Glyph.DEFAULT_CHARACTER, steps);            if (!shapes)                throw new Error("could not find glyph '"+chr+"' or the default '"+Glyph.DEFAULT_CHARACTER+"'");        }                if (simplify > 0 [description]
 * @return {[type]}          [description]
 */
var Glyph = new Class({

    initialize: function(face, chr, size, steps, simplify, scale) {
        if (!chr)
            throw new Error('must specify a valid character for this glyph');
        if (!face)
            throw new Error("must specify a typeface 'font face' for a Glyph");
        simplify = typeof simplify === "number" ? simplify : Glyph.DEFAULT_SIMPLIFY;
        steps = typeof steps === "number" ? steps : Glyph.DEFAULT_STEPS;
        size = typeof size === "number" ? size : Glyph.DEFAULT_SIZE;
        scale = typeof scale === "number" ? scale : 1.0;


        //Try to get our shape...
        var shapes = util.getShapeList(face, size, chr, steps);

        //If the font face doesn't support the character, what about the default?
        if (!shapes) {
            shapes = util.getShapeList(face, size, Glyph.DEFAULT_CHARACTER, steps);
            if (!shapes)
                throw new Error("could not find glyph '"+chr+"' or the default '"+Glyph.DEFAULT_CHARACTER+"'");
        }

        //now simplify the shape by a certain amount...
        if (simplify > 0) {
            for (var i=0; i<shapes.length; i++) {
                shapes[i] = shapes[i].simplify(simplify);
            }
        }

        /**
         * This is a list of Shape objects which define the simplified contour 
         * of the glyph in discrete points. This may be useful when drawing the
         * text in simple 2D, or as a stroke.
         * 
         * @type {Array} an array of Shape objects
         */
        this.shapes = shapes;

        this.bounds = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0
        };

        /**
         * This is a list of Vector3s which defines the triangulated data
         * for this glyph. The z component is zero. 
         *
         * These points are in model-space, unless otherwise transformed.
         * 
         * @type {Array}
         */
        this.points = [];

        this.triangulate(this.shapes);

        if (!Glyph.SAVE_CONTOUR) {
            for (var i=0; i<this.shapes.length; i++) {
                this.shapes[i].length = 0;
            }
            this.shapes.length = 0;
            this.shapes = null;
        }
    },

    /**
     * This is called from the constructor to triangulate the list of
     * shapes and determine the new (model-space) bounding box.
     */
    triangulate: function(shapes) {
        this.shapes = shapes || this.shapes;

        this.points.length = 0;

        //Triangulate the shape data
        var triangles = triangulateShapes(this.shapes) || [];

        //bounds are initially zero
        this.bounds.minX = 0;
        this.bounds.minY = 0;
        this.bounds.maxX = 0;
        this.bounds.maxY = 0;

        if (triangles.length > 0) {
            var minX = Number.MAX_VALUE,
                minY = Number.MAX_VALUE,
                maxX = -Number.MAX_VALUE,
                maxY = -Number.MAX_VALUE;

            for (var i=0; i<triangles.length; i++) {
                var tri = triangles[i];
                for (var k=0; k<tri.points_.length; k++) {
                    var v = new Vector3(tri.points_[k].x, tri.points_[k].y, 0);

                    minX = Math.min(minX, v.x);
                    minY = Math.min(minY, v.y);
                    maxX = Math.max(maxX, v.x);
                    maxY = Math.max(maxY, v.y);

                    this.points.push( v );
                }
            }
            this.bounds.minX = minX;
            this.bounds.minY = minY;
            this.bounds.maxX = maxX;
            this.bounds.maxY = maxY;
        }
    },

    /**
     * Runs through all points and transforms them by the given matrix.
     * This is a destructive operation; the original model-space points
     * will be lost.
     *
     * The bounding box is updated.
     * 
     * @param  {[type]} matrix [description]
     * @return {[type]}        [description]
     */
    applyTransform: function(matrix) {
        var points = this.points;
        if (points.length===0)
            return;


        var minX = Number.MAX_VALUE,
            minY = Number.MAX_VALUE,
            maxX = -Number.MAX_VALUE,
            maxY = -Number.MAX_VALUE;
        for (var i=0; i<points.length; i++) {
            var v = points[i];
            v.transformMat4(matrix);

            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
        }
        this.bounds.minX = minX;
        this.bounds.minY = minY;
        this.bounds.maxX = maxX;
        this.bounds.maxY = maxY;
    },

    destroyContour: function() {
        if (!this.shapes)
            return;

        for (var i=0; i<this.shapes.length; i++) {
            this.shapes[i].length = 0;
        }
        this.shapes.length = 0;
        this.shapes = null;
    },

    destroy: function() {
        this.destroyContour();
        this.bounds.minX = 0;
        this.bounds.minY = 0;
        this.bounds.maxX = 0;
        this.bounds.maxY = 0;

        if (this.points) {
            this.points.length = 0;
            this.points = null;
        }
    },
});

Glyph.DEFAULT_SIZE = 12;
Glyph.DEFAULT_STEPS = 10;
Glyph.DEFAULT_SIMPLIFY = 3;
Glyph.DEFAULT_CHARACTER = '?';

Glyph.SAVE_CONTOUR = false;

module.exports = Glyph;