define(['Class', 
        'PIXI',
        'framework/controllers/BaseController'], 
        function(Class, 
                 PIXI,
                 BaseController){


	var BaseFlickController = new Class({
		
		Extends: BaseController,

        //"manager" holds our renderer, stage, etc.
        initialize: function(container, templateFactory, manager) {
            this.displayContainer = new PIXI.DisplayObjectContainer();

            this.templateFactory = templateFactory;
            this.manager = manager;
            this.parent( container );
        },

        init: function(template) {
            //BaseFlickController is canvas-only.
            //We manipulate the DOM in FlickScreen
            //this.parent(template);
            
            //add the display container to the stage...
            this.manager.addChild(this.displayContainer);
        },

        destroy: function() {
            //remove the container from the stage, if it exists
            this.manager.removeChild(this.displayContainer);

            this.parent();
        },

        //Draw is called before the PIXI stage, e.g. for custom
        //objects. 
        draw: function(context, dt) {
            //left empty for subclasses..
        },
    });

    return BaseFlickController;
});