define(['Class', 
	'framework/controllers/BaseController', 
	'framework/auth/Facebook',
	'PIXI',
	 'Global',
	 'utils/DOMUtil'], function(Class, BaseController, Facebook, PIXI, Global, DOMUtil){

	var EmptyController = new Class({
		
		Extends: BaseController,

		init: function(template, data){
			
			this.parent(template, data);
			
			this.initialized();


			DOMUtil.setupSprites(this.container);
		}

	});

	return EmptyController;
});