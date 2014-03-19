var Class = require('klasse');

var Vector2 = require('vecmath').Vector2;
var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;

var triangulateShapes = require('./triangulate');
var util = require('./util');

var Glyph = require('./Glyph');
var tmp = new Vector3();
var tmpMat = new Matrix4();

/**
 * Text3D represents multiple glyphs in 3D space.
 *
 * Each glyph is transformed based on its x-advance and line
 * height (for multi-line strings), which gives us a model-space
 * representation of the entire string. 
 */
var Text3D = new Class({

	initialize: function(text, face, size, steps, simplify) {
        size = typeof size === "number" ? size : Glyph.DEFAULT_SIZE;

        this.size = size;
		this.text = "";
		this.face = face;

        this.align = 

        this.glyphs = [];

        var wMetric = util.getGlyphMetrics(face, size, 'W');
        this.spaceWidth = wMetric ? wMetric.xadvance : size/2;
        this.lineHeight = util.getFaceHeight(face, size);

        this.bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        
		this.setText(text, steps, simplify);
	},


	setText: function(text, steps, simplify) {
        text = (text||'').toString().trim();

		this.text = text;

        this.glyphs.length = 0;
        

        var size = this.size,
            face = this.face;

        this.bounds.minX = 0;
        this.bounds.minY = 0;
        this.bounds.maxX = 0;
        this.bounds.maxY = 0;

        if (this.text.length === 0)
            return;

        this.bounds.minX = Number.MAX_VALUE,
        this.bounds.minY = Number.MAX_VALUE,
        this.bounds.maxX = -Number.MAX_VALUE,
        this.bounds.maxY = -Number.MAX_VALUE;

        var xoff = 0;
        var metricsList = [];
        var offsets = [];
        var rowIdx = 0;

        var yoff = 0;


        var curWidth = 0;
        var rowWidths = [ 0 ];
        var maxWidth = 0;

        for (var i=0; i<text.length; i++) {
            var c = text.charAt(i);

            //skip chars
            if (c == '\r') {
                metricsList.push( {xadvance: 0 });
                continue;
            }

            //line chars
            if (c == '\n') {
                metricsList.push( {xadvance: 0} );
                yoff += this.lineHeight;
                xoff = 0;

                curWidth = 0;
                rowWidths.push(0);
                rowIdx++;
                continue;
            }

            //space chars
            if (c == ' ' || c == '\t') {
                metricsList.push( {xadvance: this.spaceWidth });
                //Should we include space as bounds?
                continue;
            }

            var glyph = new Glyph(face, c, size, steps, simplify);
            
            var metrics = util.getGlyphMetrics(face, size, c);
            if (!metrics)
                metrics = { xadvance: 0 };


            if (i > 0)
                xoff += metricsList[i-1].xadvance;

            curWidth = Math.max(curWidth, xoff + glyph.bounds.minX + (glyph.bounds.maxX-glyph.bounds.minX) )
            rowWidths[rowWidths.length-1] = curWidth;

            maxWidth = Math.max(maxWidth, curWidth);

            offsets.push( { x: xoff, y: yoff, row: rowIdx } );
            metricsList.push(metrics);
            
            this.glyphs.push(glyph);
        }



        for (var i=0; i<this.glyphs.length; i++) {
            var glyph = this.glyphs[i];
            var xoff = offsets[i].x;
            var yoff = offsets[i].y;
            var row = offsets[i].row;

            //determine how much to center it from the left
            var width = rowWidths[row];

            xoff += (maxWidth-width)/2;

            //create a transformation for this glyph
            tmpMat.idt();
            tmpMat.translate( tmp.set(xoff, yoff, 0) );

            //apply the transform so the glyph's points are now
            //part of the model-space of the entire text string
            glyph.applyTransform(tmpMat);

            this.bounds.minX = Math.min(this.bounds.minX, xoff + glyph.bounds.minX);
            this.bounds.maxX = Math.max(this.bounds.maxX, glyph.bounds.minX + (glyph.bounds.maxX - glyph.bounds.minX))
            this.bounds.minY = Math.min(this.bounds.minY, glyph.bounds.minY);
            this.bounds.maxY = Math.max(this.bounds.maxY, glyph.bounds.maxY);
        }


        this.bounds.minX = 0;
        this.bounds.maxX = maxWidth;
	},

    _maxWidth: function(offsets) {

    },

    destroy: function() {
        if (!this.glyphs)
            return;

        for (var i=0; i<this.glyphs.length; i++) {
            this.glyphs[i].destroy();
        }

        //Need to handle this more cleanly...
        // this.glyphs.length = 0;
        // this.glyphs = null;
    },
});

Text3D.ALIGN = {
    CENTER: 'CENTER',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
};

module.exports = Text3D;