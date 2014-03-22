define(['PIXI', 'libjs/utils/Util', 'TweenLite'], function(PIXI, Util, TweenLite) {
	
	var u = {};

    u.BRANDON = "px 'Brandon', 'Helvetica', sans-serif";
    u.MERCURY = "px 'Mercury', 'Georgia', 'serif'";
    
    u.DEFAULT_BUTTON_ALPHA_EASE = Expo.easeOut;
    u.DEFAULT_BUTTON_ALPHA_DURATION = 0.5;
    u.DEFAULT_BUTTON_ALPHA = 0.6;

  	//Draws a PIXI texture to the context. Allows us to take
    //advantage of PIXI's sprite sheeting without always having to
    //rely on its scene graph for rendering.
  	u.drawTexture = function( context, tex, x, y, width, height ) {
        var frame = tex.frame;
        var source = tex.baseTexture.source;

        if(frame && frame.width && frame.height && source)
        {                
            width = (width===0||width) ? width : frame.width;
            height = (height===0||height) ? height : frame.height;
            context.drawImage(source, 
                               frame.x,
                               frame.y,
                               frame.width,
                               frame.height,
                               x, 
                               y,
                               width,
                               height);
        }   
    };

    u.createText = function(text, fontStyle, pxSize, color, weight) {
        var text = new PIXI.Text(text, {
            font: (weight||"bold")+" "+Math.round((pxSize||0)*2) +(fontStyle||u.BRANDON),
            fill: color
        });
        if (Util.support.isRetina)
          text.scale.set(0.5, 0.5);
        return text;
    };
    
    /**
     * Forces a re-draw of the PIXI.Text element;
     * this will clear its cached size and re-render it.
     * This should only be done once or twice after the page first loads
     * to ensure that the right size/font is used.
     * 
     * @param  {[type]} text [description]
     * @return {[type]}      [description]
     */
    u.redrawText = function(text) {
        if (text.style && text.style.font) {
            var style = 'font: '+text.style.font+';';
            if (style in PIXI.Text.heightCache) {
                delete PIXI.Text.heightCache[style];
            }
        }
            
        text.setText(text.text);
        text.updateText();
    };


    u.attachTouchFade = function(container, touchAlpha, defaultAlpha) {
      defaultAlpha = typeof defaultAlpha === "number" ? defaultAlpha : 1.0;
      touchAlpha = typeof touchAlpha === "number" ? touchAlpha : u.DEFAULT_BUTTON_ALPHA;
      container.touchstart = u.tweenAlpha.bind(u.tweenAlpha, container, touchAlpha);
      container.touchend = container.touchendoutside = u.tweenAlpha.bind(u.tweenAlpha, container, defaultAlpha);
    };


    u.tweenAlpha = function(container, alpha, duration, easing) {
      duration = typeof duration === 'number' ? duration : u.DEFAULT_BUTTON_ALPHA_DURATION;
      TweenLite.to(container, duration, {
        alpha: alpha || 0,
        ease: easing || u.DEFAULT_BUTTON_ALPHA_EASE
      });
    };

    return u;
})