define(['handlebars'], function(Handlebars) {

this["HOP"] = this["HOP"] || {};
this["HOP"]["Mobile"] = this["HOP"]["Mobile"] || {};

Handlebars.registerPartial("NowSynchronized", Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"reconnect-success\">YOU'RE NOW <span>SYNCHRONIZED</span></div>\n";
  }));

this["HOP"]["Mobile"]["About"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"mobile-container mobile-about-container\">\n	<div data-sprite=\"mobile-about-arrow-left.png\" class=\"mobile-about-back\"></div>\n\n	<div class=\"mobile-about-header\">IT’S ALL HUMANLY POSSIBLE</div>\n	<div class=\"mobile-about-body\">At our healthiest, we can be our fully maximized selves. Unlimited. Unstoppable. Unbelievable. That’s why Abbott is constantly pushing the limits of health — for all people, in all places, across all aspects and stages of life. Because at our healthiest, we humans can achieve just about anything.</div>\n\n	<div class=\"mobile-about-link-header\">FIND OUT MORE AT:</div>\n	<div class=\"mobile-about-link\">HUMANLYPOSSIBLE.COM</div>\n</div>";
  });

this["HOP"]["Mobile"]["Background"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"mobile-background\"></div>";
  });

this["HOP"]["Mobile"]["BrowserNotSupported"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"mobile-container not-supported-browser-container\"> \n	<img class=\"not-supported-icon\" src=\"img/mobile-warning-icon.png\" />\n	<div class=\"mobile-header\">BROWSER<div>NOT SUPPORTED</div></div>\n	<div class=\"mobile-body not-supported-body\">Please download Google Chrome to continue.</div>\n	<div class=\"not-supported-hr\"></div>\n	<a class=\"not-supported-chrome-link\" target=\"_blank\" href=\"https://play.google.com/store/apps/details?id=com.android.chrome&hl=en\"><img class=\"not-supported-chrome\" src=\"img/mobile-chrome-download.png\" /></a>\n</div>";
  });

this["HOP"]["Mobile"]["ConnectToDesktop"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, self=this;


  buffer += "<div class=\"mobile-container reconnect-container\"> \n	<div class=\"mobile-header\">\n		<div>JUST ONE</div>\n		<div>MORE STEP</div>\n	</div>\n	<div class=\"reconnect-body\">\n		<div>Your phone is ready to go! Now</div>\n		<div>go to <span>HOP.COM</span> on your desktop</div>\n		<div>and log in with Facebook to</div>\n		<div>finish the synchronization.</div>\n	</div>\n\n	<div data-sprite=\"mobile-connect-desktop.png\" class=\"mobile-connect-icon\"></div>\n	<div class=\"reconnect-waiting\">AWAITING ON DESKTOP ANSWER</div>\n</div>\n\n";
  stack1 = self.invokePartial(partials.NowSynchronized, 'NowSynchronized', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  });

this["HOP"]["Mobile"]["Contribute"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"card\">\n	<h1>CONNECT YOUR DESKTOP</h1>\n</div>\n<br>\n<div class=\"but\" id=\"shoot\">SHOOT</div>";
  });

this["HOP"]["Mobile"]["DeviceNotSupported"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"mobile-container not-supported-container\"> \n	<img class=\"not-supported-icon\" src=\"img/mobile-warning-icon.png\" />\n	<div class=\"mobile-header\">DEVICE<div>NOT SUPPORTED</div></div>\n	<div class=\"mobile-body not-supported-body\">Sorry, but this device is not supported.</div>\n</div>";
  });

this["HOP"]["Mobile"]["FlickScreen"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "";


  return buffer;
  });

this["HOP"]["Mobile"]["Home"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"home-container\"> \n	<div class=\"home-header\">WELCOME TO</div>\n	<div class=\"home-hero\">\n		<div>ART OF</div>\n		<div>POSSIBLE</div>\n	</div>\n	<div class=\"home-body\">\n		<div>Log in with your facebook</div>\n		<div>account to help make the</div>\n		<div>impossible possible.</div>\n	</div>\n	<div id=\"fb-login-but\" data-sprite=\"mobile-fb-button.png\" class=\"facebook-button\"></div>\n</div>";
  });

this["HOP"]["Mobile"]["KeepContributing"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"mobile-container reconnect-container\"> \n	<div class=\"reconnect-header\">KEEP<div>CONTRIBUTING</div></div>\n	<div class=\"reconnect-body\">You just left the contribution section. You can go back there at any moment by tapping the button below.</div>\n	\n</div>";
  });

this["HOP"]["Mobile"]["LostConnection"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, self=this;


  buffer += "<div class=\"mobile-container reconnect-container\"> \n	<div class=\"mobile-header\">LOST<div>CONNECTION</div></div>\n	<div class=\"reconnect-body\">We've lost connection to your computer. Please visit hop.com on your computer to continue contributing.</div>\n	\n	<div data-sprite=\"mobile-connect-desktop.png\" class=\"mobile-connect-icon\"></div>\n	<div class=\"reconnect-waiting\">AWAITING ON DESKTOP ANSWER</div>\n</div>\n\n";
  stack1 = self.invokePartial(partials.NowSynchronized, 'NowSynchronized', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  });

this["HOP"]["Mobile"]["Menu"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"mobile-container\">\n	<div data-sprite=\"mobile-menu-close.png\" class=\"mobile-menu-close\"></div>\n\n	<div class=\"menu-profile-container\">\n		<img class=\"overlay-profile\" src=\"img/temp_profile.jpg\" />\n	</div>\n	<div class=\"mobile-menu-welcome\">WHAT'S UP</div>\n	<div class=\"mobile-menu-header\"></div>\n\n	<div class=\"mobile-menu-button-container\">		\n		<div class=\"mobile-menu-item mobile-menu-share\">\n			<div data-sprite=\"mobile-menu-facebook.png\" class=\"mobile-menu-image\"></div>\n			<span>SHARE</span>\n			<div data-sprite=\"mobile-menu-arrow-right.png\" class=\"mobile-menu-arrow\"></div>\n		</div>\n		<div class=\"mobile-menu-item mobile-menu-about\">\n			<div data-sprite=\"mobile-menu-about.png\" class=\"mobile-menu-image\"></div>\n			<span>ABOUT THE CAMPAIGN</span>\n			<div data-sprite=\"mobile-menu-arrow-right.png\" class=\"mobile-menu-arrow\"></div>\n		</div>\n		<div class=\"mobile-menu-item mobile-menu-signout\">\n			<div data-sprite=\"mobile-menu-signout.png\" class=\"mobile-menu-image\"></div>\n			<span>SIGN OUT</span>\n			<div data-sprite=\"mobile-menu-arrow-right.png\" class=\"mobile-menu-arrow\"></div>\n		</div>\n	</div>\n</div>";
  });

this["HOP"]["Mobile"]["OverlayPanel"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", self=this, escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n			";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n		";
  return buffer;
  }

  buffer += "<div class=\"overlay-panel\">\n	<div class=\"overlay-profile-container\"> <img class=\"overlay-profile\" /> </div>\n	<div class=\"overlay-card\">\n		";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.states), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n	</div>\n	<div class=\"overlay-footer\">\n		<span>"
    + escapeExpression(((stack1 = (depth0 && depth0.next)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n		<img id=\"tutorial-next\" class=\"icon-next mobile-button\" src=\"/img/tutorial/tutorial-next.png\" />\n	</div>\n</div>";
  return buffer;
  });

this["HOP"]["Mobile"]["Preloader"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "";


  return buffer;
  });

this["HOP"]["Mobile"]["RotateScreen"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"rotate-screen-container\">\n	<div class=\"mobile-background-rotated\"></div>\n	<div class=\"rotate-screen-content\">\n		<img class=\"rotate-screen-icon1\" src=\"img/mobile-rotate-icon1.png\" />\n\n		<div class=\"rotate-screen-header\">ROTATE<div>YOUR VIEW</div></div>\n\n		<img class=\"rotate-screen-icon2\" src=\"img/mobile-rotate-icon2.png\" />\n		<div class=\"rotate-screen-body\">The Art of Possible works exclusively in portrait mode.</div>\n	</div>\n</div>";
  });

this["HOP"]["Mobile"]["SignOutPanel"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n			";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n		";
  return buffer;
  }

  buffer += "<div class=\"overlay-panel\">\n	<div class=\"overlay-profile-container\"> <img class=\"overlay-profile\" /> </div>\n	<div class=\"overlay-card\">\n		";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.states), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n	</div>\n	<div class=\"signout-footer\">\n		<div class=\"signout-button\" id=\"signout-yes\">\n			<span>YES</span>\n			<img id=\"tutorial-next\" class=\"icon-next mobile-button\" src=\"/img/tutorial/tutorial-next.png\" />\n		</div>\n		<div class=\"signout-button\" id=\"signout-no\">\n			<span>NO</span>\n			<img id=\"tutorial-next\" class=\"icon-next mobile-button\" src=\"/img/tutorial/tutorial-next.png\" />\n		</div>\n	</div>\n</div>";
  return buffer;
  });

this["HOP"]["Mobile"]["TutorialCard"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, functionType="function";


  buffer += "<div class=\"overlay-content\">\n	<div class=\"overlay-header\">\n		";
  stack2 = ((stack1 = (depth0 && depth0.header)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n	</div>\n	<div class=\"overlay-body\">\n		";
  stack2 = ((stack1 = (depth0 && depth0.body)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n	</div>\n</div>";
  return buffer;
  });

this["HOP"]["Mobile"]["WelcomeCard"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"overlay-content welcome-content\">\n	<div class=\"welcome-header\">"
    + escapeExpression(((stack1 = (depth0 && depth0.header)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</div>\n	<div class=\"overlay-header welcome-name\">\n		"
    + escapeExpression(((stack1 = (depth0 && depth0.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n	</div>\n	<!--<div class=\"overlay-hr\"></div>-->\n	<div class=\"overlay-subheader\">";
  stack2 = ((stack1 = (depth0 && depth0.subHeader)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "</div>\n	<div class=\"overlay-body welcome-body\">\n		";
  stack2 = ((stack1 = (depth0 && depth0.body)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n	</div>\n</div>";
  return buffer;
  });

return this["HOP"]["Mobile"];

});