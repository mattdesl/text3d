define(['Class', 'math/lerp'], 
		function(Class, lerp) {

	var Color = new Class({

		//Accepts hsva each in range 0.0 to 1.0
		initialize:
		function Color(h, s, v, a) {
            this.h = h||0;
            this.s = s||0;
            this.v = v||0;
            this.a = typeof a === "number" ? a : 1.0;

            //only changed on "update"
            //changing these has no effect !!!!
            this.r = 0;
            this.g = 0;
            this.b = 0;

			this.string = "";
			this.update();

            // console.log(this.h, this.s, this.v);
		},

        //  https://github.com/harthur/color-convert/blob/master/conversions.js
        //  Returns bytes 0-255 for RGB, and a float 0.0 to 1.0 for Alpha
        toRGBA: function() {
            var h = ~~(this.h*360) / 60,
                s = this.s,
                v = this.v,
                a = this.a,
                hi = Math.floor(h) % 6;

            var f = h - Math.floor(h),
                p = ~~(255 * v * (1 - s)),
                q = ~~(255 * v * (1 - (s * f))),
                t = ~~(255 * v * (1 - (s * (1 - f)))),
                v = ~~(255 * v);

            switch(hi) {
                case 0:
                  return [v, t, p, a];
                case 1:
                  return [q, v, p, a];
                case 2:
                  return [p, v, t, a];
                case 3:
                  return [p, q, v, a];
                case 4:
                  return [t, p, v, a];
                case 5:
                  return [v, p, q, a];
            }
            //throw err ?
        },

        //Returns the canvas
        toCanvasHSL: function() {
            var h = ~~(this.h*360),
                s = this.s,
                v = this.v,
                sl, l;

            l = (2 - s) * v;  
            sl = s * v;
            sl /= (l <= 1) ? l : 2 - l;
            l /= 2;
            return [h, sl * 100, l * 100];
        },

        copy: function(other) {
            this.h = other.h;
            this.s = other.s;
            this.v = other.v;
            this.a = other.a;
            this.string = other.string;
            return this;
        },

        clone: function() {
            var c = new Color(this.h, this.s, this.v, this.a);
            c.string = this.string;
            return c;
        },

        //https://github.com/harthur/color-convert/blob/master/conversions.js
        //Accepts RGB in 0-255 range
        fromRGB: function(r, g, b, a) {
            var min = Math.min(r, g, b),
                max = Math.max(r, g, b),
                delta = max - min,
                h, s, v;

            if (max == 0)
                s = 0;
            else
                s = (delta/max * 1000)/10;

            if (max == min)
                h = 0;
            else if (r == max) 
                h = (g - b) / delta; 
            else if (g == max)
                h = 2 + (b - r) / delta; 
            else if (b == max)
                h = 4 + (r - g) / delta;

            h = Math.min(h * 60, 360);

            if (h < 0) 
                h += 360;

            v = ((max / 255) * 1000) / 10;

            this.h = h/360;
            this.s = s/100; 
            this.v = v/100;
            this.a = a;
            this.update();
            return this;
        },

		update: function() {
            var rgb = this.toRGBA();
            var r = rgb[0],
                g = rgb[1],
                b = rgb[2],
                a = rgb[3];
                
            this.r = r;
            this.g = g;
            this.b = b;
			this.string = "rgba("+r+","+g+","+b+","+a+")";
            return this;
		},

        tweak: function(h, s, l, a) {
            if(h !== undefined) this.h += h;
            if(s !== undefined) this.s += s;
            if(l !== undefined) this.l += l;
            if(a !== undefined) this.a += a;
            this.update();
            return this;
        }
	});
    
    Color.fromHex = function(rgbHex, alpha) {
        var rgb;
        if (typeof rgbHex === "string") {
            if (!rgbHex.length)
                throw "no RGB hex specified";
            if (rgbHex.charAt(0) === "#")
                rgbHex = rgbHex.substring(1);
            if (rgbHex.indexOf("0x") !== 0)
                rgbHex = "0x"+rgbHex;
            rgb = parseInt(rgbHex, 16);
        } else
            rgb = +rgbHex;

        var R = ((rgb & 0xff0000) >>> 16);
        var G = ((rgb & 0x00ff00) >>> 8);
        var B = ((rgb & 0x0000ff));
        alpha = typeof alpha === "number" ? alpha : 1.0;

        return new Color().fromRGB(R, G, B, alpha);
    };

    Color.WHITE = new Color(0.0, 0.0, 1.0);
    Color.BLACK = new Color(0.0, 0.0, 0.0);

    Color.lerpHSV = function(output, start, target, t) {
        output.h = lerp(start.h, target.h, t);
        output.s = lerp(start.s, target.s, t);
        output.v = lerp(start.v, target.v, t);
        output.a = lerp(start.a, target.a, t);
        output.update();
    };

    Color.lerpRGB = function(output, start, target, t) {
        var rgba1 = start.toRGBA(),
            rgba2 = target.toRGBA();
        var r1 = rgba1[0],
            g1 = rgba1[1],
            b1 = rgba1[2],
            a1 = rgba1[3], //already as a float
            r2 = rgba2[0],
            g2 = rgba2[1],
            b2 = rgba2[2],
            a2 = rgba2[3];

        var or = lerp(r1, r2, t),
            og = lerp(g1, g2, t),
            ob = lerp(b1, b2, t),
            oa = lerp(a1, a2, t);

        output.fromRGB(or, og, ob, oa);
    };

    //TODO: Test other color spaces for interpolation.
    //HSV leads to a nice transition, RGB gives us ugly gray in-betweens,
    //LAB might be decent as well but have to see...

    return Color;
});