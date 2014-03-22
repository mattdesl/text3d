define(['Class', 'math/lerp', 'flick/Themes', 'flick/IdleTheme', 'flick/Color', 'TweenLite', 'libjs/signals/Signal'], 
		function(Class, lerp, Themes, IdleTheme, Color, TweenLite, Signal) {



	var ColorManager = new Class({

		initialize: function() {
            //0 -> black
            //1 -> color
            this._value = 0;

            this.dirty = true;

            this.lastValue = null; 


            this.onValueChange = new Signal();

            //the current color values, initially the idle theme
            //this is a copy, so we can change it freely
            this.theme = this.copyTheme(IdleTheme);

            //the next theme to lerp with
            this.nextTheme = Themes[0];
		},


        copyTheme: function(theme) {
            var cached = {};
            for (var k in theme) {
                if (theme[k].clone) //assume its a clonable or Color class
                    cached[k] = theme[k].clone();
                else //assume its a string or primitive
                    cached[k] = theme[k];
            }
            return cached;
        },


        value: {
            set: function(val) {
                this._value = val;
                this.dirty = true;
            },

            get: function() {
                return this._value;
            }
        },

        //Sets the color theme that we will tween to
        setNextTheme: function(nextTheme) {
            if (this.nextTheme !== nextTheme)
                this.dirty = true;

            this.nextTheme = nextTheme;
            this.lastValue = null; //reset so that onValueChange is fired
        },

        //Sets the color theme, by index
        setNextThemeIndex: function(idx) {
            this.setNextTheme( Themes[ idx ] );
        },

        update: function() {
            if (!this.dirty) 
                return;

            var origTheme = IdleTheme;
            var nextTheme = this.nextTheme;
            var curTheme = this.theme;
            var tween = this._value;

            for (var k in this.theme) {
                var colorA = origTheme[k];
                var colorB = nextTheme[k];
                var colorOut = curTheme[k];

                if (colorOut instanceof Color) { 
                    // colorOut.h = 0;
                    // colorOut.s = 1;
                    // colorOut.v = 1;
                    if (nextTheme.useRGB)
                        Color.lerpRGB(colorOut, colorA, colorB, tween);
                    else
                        Color.lerpHSV(colorOut, colorA, colorB, tween);
                }
            }

            this.onValueChange.dispatch();

            this.dirty = false;
        },
	});


    return new ColorManager();
});