define([
    'Class', 
    'flick/Color',
    'text!colors.json'
], function(
    Class, 
    Color,
    colorsSrc
) {


    var BACKGROUND_TOP = Color.fromHex('#24262f');
    var BACKGROUND_BOTTOM = Color.fromHex('#18191c');
    var FG_TEXT = Color.fromHex('#dadcdd');
    var SHOT_INDICATOR = Color.fromHex('#f2f3f4');
    var SHOT_INDICATOR_DARK = Color.fromHex('#c9cacc');

	return {
        key: 'black',
        gradient1: BACKGROUND_TOP,
        gradient0: BACKGROUND_BOTTOM,
        foreground: FG_TEXT,
        indicator: SHOT_INDICATOR
    };
});