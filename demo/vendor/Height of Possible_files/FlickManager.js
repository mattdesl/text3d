define(['Class', 'flick/Vector2'], function(Class, Vector2) {

	var tmp = new Vector2();

	var FlickManager = new Class({

	    //constructor
	    initialize: 
        function FlickManager(flickSprite, screenWidth, screenHeight) {
	        if (!flickSprite)
	            throw new Error("no flickSprite given to FlickManager");
	        this.flickSprite = flickSprite;

	        this.size = new Vector2(screenWidth, screenHeight);
	        this.resolution = this.size.length();

	        this.friction = 0.75;
	        this.spring = 0.08;
	        this.flickScale = 25.0;

	        //A flick event will only be triggered
	        //if the normalized distance is greater than
	        //this value. 
	        this.minFlickThreshold = 0.15;

	        //If the user is moving their mouse up
	        //and past the top of the browser, we want
	        //to trigger a 'mouse up' event so it feels
	        //like it went right out the top.
	        this.minYThreshold = 0.10;

	        //Only used to determine the new drag start position
	        this.lastMouse = new Vector2();
	        this.dragStartTime = 0;
	        this.dragStartThreshold = 0.01;
	        this.dragStartDelay = 100;

	        this.enabled = true;

	        /**
	         * true by defaulse -- prevents default event action and
	         * stops propagation.
	         * 
	         * @property {Boolean} killEvents
	         */
	        this.stopEvents = false;

	        //the mouse / finger position
	        this.mouse = new Vector2();

	        this.mouse.set(this.flickSprite.position);

	        this.origin = this.flickSprite.position.clone();
	        this.snapToOrigin = true;

	        //The "flick start" position is where the user
	        //initiates the flick. This might be origin (where the
	        //sprite usually sits), or it might be lower, e.g. if the
	        //user dragged the sprite down to the bottom of the screen
	        //before throwing it upward.
	        this.dragStart = this.origin.clone();

	        this.dragging = false;

	        /**
	         * If we drag with enough force in the 'up' direction,
	         * then the event will be considered a flick and the ball
	         * should go flying in that direction.
	         * @type {Boolean}
	         */
	        this.flicking = false;

	        this.floating = false;
	        this.floatOffset = 0.0;

	        this.time = 0;

	        this.onFlick = null; //passed vec3 velocity and float normDistance
	        this.onDrop = null;
	        this.onGrab = null;
	    },

	    resetFloat: function() {
	    	this.time = 0;
	    	// this.floatOffset = 1;
	    },

	    resize: function(width, height) {
	        this.size.set(width, height);
	        this.resolution = this.size.length();
	    },  

	    /**
	     * Resets the sprite to this flick manager's origin.
	     */
	    reset: function() {
	        this.flicking = false;

	        this.flickSprite.velocity.set(0, 0);
	        
	        this.flickSprite.position.copy(this.origin);
	        this.dragStart.copy(this.origin);
	        this.mouse.copy(this.origin);
	    },

	    pos: function(ev) {
	    	if (ev.global) {
	    		return tmp.set(ev.global.x, ev.global.y);
	    	}
	    	
	    	var org = ev.originalEvent;
	    	if (!org) 
	    		return tmp.set(ev.clientX, ev.clientY);
	    	
	    	var touch = org.touches[0] || org.changedTouches[0];
	    	tmp.set( touch.pageX, touch.pageY );
	    	return tmp;
	    },	

	    hitTest: function(pos, radiusScale) {
	    	return this.flickSprite.contains(pos.x, pos.y, radiusScale)
	    },

	    flickStart: function(ev) {
	    	if (!this.enabled)
	    		return;
	    	if (this.stopEvents) {
	            ev.stopPropagation();
	            ev.preventDefault();
	        }

	        var pos = this.pos(ev);
	        var hit = this.hitTest(pos);
	        if (hit) {
	            this.flicking = false;
	            this.dragging = true;

	            this.mouse.copy(pos);

	            this.dragStartTime = 0;
	            this.dragStart.copy(this.mouse);
	            this.lastMouse.copy(this.mouse);

	            if (this.onGrab)
	            	this.onGrab();
	        }
	        return hit;
	    },

	    flickMove: function(ev) {
	    	if (!this.enabled)
	    		return;
	        if (this.stopEvents) {
	            ev.stopPropagation();
	            ev.preventDefault();
	        }

	        var pos = this.pos(ev);

	        if (this.dragging) {
	            var thres = this.dragStartThreshold * this.resolution;
	            var distSq = thres*thres;

	            //new position
	            this.mouse.copy(pos);

	            //If we are moving large distances, then we should reset our timer.
	            
	            //We do this so that when you are flicking, the drag
	            //start position stays at where you started your flick.
	            if (this.mouse.distanceSq(this.lastMouse) > distSq) {
	                this.dragStartTime = 0;
	                this.lastMouse.copy(this.mouse);
	            }

	            //check if user's mouse is above the Y threshold
	            if ( pos.y < this.minYThreshold * this.size.y ) {
	                //trigger a flick end event..
	                this.handleFlickEnd(pos);
	            }
	        }
	    },

	    checkBounds: function() {
	    	if (!this.dragging || this.flicking) 
	    		return;

	    	var ds = this.dragStart;
	    	var padding = this.flickSprite.radius;

            //If the drag start position is out of bounds, trigger a flick
            var offScreen = (ds.x < -padding || ds.y < -padding 
            			|| (ds.x > this.size.x + padding) || (ds.y > this.size.y + padding));
            if (offScreen)
            	this.handleFlickEnd(ds);
	    },

	    handleFlickEnd: function(pos) {
	        var wasDragging = this.dragging;

	        this.dragging = false;

	        var x = pos.x,
	        	y = pos.y;

	    	if (wasDragging) {
	            //If the flick was deemed successful,
	            //we will add the force to the sprite.
	            
	            //Otherwise, we need to "snap back" to the
	            //origin (or to the last used mouse position,
	            //if origin is snap to origin disabled).
	            
	            var dist = this.mouse.distance(this.dragStart);
	            var normDist = this.resolution===0 ? 0 : (dist / this.resolution);

	            var dir = new Vector2(this.mouse);
	            dir.sub(this.dragStart).normalize();
	            
	            if (dir.y < 0 && normDist > this.minFlickThreshold) {
	                tmp.copy(dir);
	                tmp.scale( normDist * this.flickScale );

	                this.flickSprite.velocity.add( tmp );

	                this.flicking = true;

	                if (this.onFlick)
	                	this.onFlick(dir, normDist);
	            } else {
	            	if (this.onDrop)
	            		this.onDrop();
	            }

	            if (this.snapToOrigin)
	                this.mouse.set(this.origin);
	            else
	                this.mouse.set(x, y);
	        }  
	    },

	    flickEnd: function(ev) {
	    	if (!this.enabled)
	    		return;
	        if (this.stopEvents) {
	            ev.stopPropagation();
	            ev.preventDefault();
	        }

	        var pos = this.pos(ev);
	        this.handleFlickEnd(pos);
	    },

	    update: function (dt) {
	    	if (!this.enabled)
	    		return;
	    	
	        var sprite = this.flickSprite,
	            mouse = this.mouse,
	            spring = this.spring,
	            friction = this.friction;

	        // if (dt > 30)
	        // 	dt = 30;
	        this.time += dt;
	        this.dragStartTime += dt;
	        // if (this.dragStartTime > this.dragStartDelay) {  
	        //     this.dragStartTime = 0;
	        //     this.dragStart.copy(this.mouse);
	        // }

	        this.checkBounds();

	        if (!this.flicking && this.floating) {
	            var off = (Math.sin(this.time*0.003)) * 0.5;
	            this.floatOffset = off;
	            // sprite.velocity.y += off;
	        }

	        var dx = mouse.x - sprite.position.x,
	            dy = mouse.y - sprite.position.y,
	            ax = dx * spring,
	            ay = dy * spring;

	        if (!this.flicking) {
	            sprite.velocity.x += ax;
	            sprite.velocity.y += ay;

	            //scale by friction
	            sprite.velocity.scale(friction);
	        }

	        //update sprite position based on its velocity
	        sprite.update(dt);


	    },

	});
	
	return FlickManager;

});