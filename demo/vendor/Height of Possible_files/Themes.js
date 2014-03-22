define([
    'Class', 
    'flick/Color',
    'text!colors.json'
], function(
    Class, 
    Color,
    colorsSrc
) {

    var FG_LIGHT = Color.fromHex('#dadcdd');
    var FG_DARK = Color.fromHex('#24262f');

    var SHOT_INDICATOR = Color.fromHex('#f2f3f4');
    
    var colors = JSON.parse(colorsSrc);

    var BACKGROUND_TOP = Color.fromHex('#24262f');
    var BACKGROUND_BOTTOM = Color.fromHex('#18191c');

    var tweakSat = -.5;
    var tweakSat2 = -.2;
    var tweakLum = .3;
    var tweakHue = .05;
	var themes = [
        {
            useRGB: true,//tween with RGB
            key: 'blue',
            gradient1: Color.fromHex(colors['Dark Blue']),
            gradient0: Color.fromHex(colors['Blue']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Light Gray']) // <-- for debug until we get particle assets
        },    
        {
            useRGB: true,//tween with RGB
            key: 'fuchsia',
            gradient1: Color.fromHex(colors['Dark Fuchsia']),
            gradient0: Color.fromHex(colors['Fuchsia']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Light Gray']) // <-- for debug until we get particle assets
        },  
        {
            useRGB: true,//tween with RGB
            key: 'orange',
            gradient1: Color.fromHex(colors['Dark Orange']),
            gradient0: Color.fromHex(colors['Orange']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Light Gray']) // <-- for debug until we get particle assets
        },   
        {
            useRGB: true,//tween with RGB
            key: 'yellow',
            gradient1: Color.fromHex(colors['Dark Yellow']),
            gradient0: Color.fromHex(colors['Yellow']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_DARK,
            indicator: FG_DARK,
            particle: Color.fromHex(colors['Light Gray']) // <-- for debug until we get particle assets
        },   
        {
            useRGB: true,//tween with RGB
            key: 'green',
            gradient1: Color.fromHex(colors['Dark Green']),
            gradient0: Color.fromHex(colors['Light Green']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_DARK,
            indicator: FG_DARK,
            particle: Color.fromHex(colors['Light Gray']) // <-- for debug until we get particle assets
        },   
        {
            useRGB: true,//tween with RGB
            key: 'gray',
            gradient1: Color.fromHex(colors['Gray']),
            gradient0: Color.fromHex(colors['Light Gray']).tweak(0, 0, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Light Gray']) // <-- for debug until we get particle assets
        },      
        /*{
            key: 'blue',
            gradient1: Color.fromHex(colors['Dark Blue']),
            gradient0: Color.fromHex(colors['Blue']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Blue']), // <-- for debug until we get particle assets
        },
        {
            key: 'green',
            gradient1: Color.fromHex(colors['Dark Green']),
            gradient0: Color.fromHex(colors['Light Green']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Light Green']), // <-- for debug until we get particle assets
        },
        {
            key: 'yellow',
            gradient1: Color.fromHex(colors['Dark Yellow']),
            gradient0: Color.fromHex(colors['Yellow']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Yellow']) // <-- for debug until we get particle assets
        },
        {
            key: 'orange',
            gradient1: Color.fromHex(colors['Dark Orange']),
            gradient0: Color.fromHex(colors['Orange']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Orange']), // <-- for debug until we get particle assets
        },
        {
            useRGB: true,//tween with RGB
            key: 'gray',
            gradient1: Color.fromHex(colors['Gray']),
            gradient0: Color.fromHex(colors['Light Gray']).tweak(0, 0, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Light Gray']) // <-- for debug until we get particle assets
        },
        {
            useRGB: true,//tween with RGB
            key: 'fuchsia',
            gradient1: Color.fromHex(colors['Dark Fuchsia']),
            gradient0: Color.fromHex(colors['Fuchsia']).tweak(tweakHue, tweakSat2, tweakLum),
            foreground: FG_LIGHT,
            indicator: SHOT_INDICATOR,
            particle: Color.fromHex(colors['Fuchsia']), // <-- for debug until we get particle assets
        },*/
	];

    ///Tween order for nice hue gradiation:
    /// Red,
    /// Violet,
    /// Purple,
    /// Blue,
    /// Cyan,
    /// Green,
    /// Yellow,
    /// Red

    return themes;
});