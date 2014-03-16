var _typeface_js = {

    faces: {},

    loadFace: function(typefaceData) {
        var familyName = typefaceData.familyName.toLowerCase();
        
        if (!this.faces[familyName]) {
            this.faces[familyName] = {};
        }
        if (!this.faces[familyName][typefaceData.cssFontWeight]) {
            this.faces[familyName][typefaceData.cssFontWeight] = {};
        }

        var face = this.faces[familyName][typefaceData.cssFontWeight][typefaceData.cssFontStyle] = typefaceData;
        face.loaded = true;
    },

    pixelsFromPoints: function(face, style, points, dimension) {
        var pixels = points * parseInt(style.fontSize.toString(), 10) * 72 / (face.resolution * 100);
        if (dimension == 'horizontal' && style.fontStretchPercent) {
            pixels *= style.fontStretchPercent;
        }
        return pixels;
    },

    pointsFromPixels: function(face, style, pixels, dimension) {
        var points = pixels * face.resolution / (parseInt(style.fontSize.toString(), 10) * 72 / 100);
        if (dimension == 'horizontal' && style.fontStretchPrecent) {
            points *= style.fontStretchPercent;
        }
        return points;
    },
};