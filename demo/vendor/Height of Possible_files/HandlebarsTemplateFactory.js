define(['Class', 'libjs/framework/view/BaseTemplateFactory'], function(Class, BaseTemplateFactory){

	var HandlebarsTemplate = new Class({

		Extends: BaseTemplateFactory,

		templates: null,

		initialize: function(views){
			this.templates = views;
		},

		render: function(templateId, data){

			return this.templates[templateId](data);

		}

	});

	return HandlebarsTemplate;

});