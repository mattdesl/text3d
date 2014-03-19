var Text3D = require('text3d').Text3D;
var Class = require('klasse');

var TextContainer = new Class({


    initialize: function(text) {
        this.text = text;
    }



    handleMouse: function(x, y) {
        for (var i=0; i<this.text.glyphs.length; i++) {
            var g = this.text.glyphs[i];
            
        }
    }
});