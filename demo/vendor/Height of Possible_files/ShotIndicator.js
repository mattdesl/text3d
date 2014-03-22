define(['Class', 
	'flick/Vector2', 
	'flick/GrowingRings',
    'flick/Color',
    'flick/ColorManager',
	'TweenLite'], function(
		Class, 
		Vector2, 
		GrowingRings,
        Color,
        ColorManager,
		TweenLite) {

    var tmp = new Vector2();
    var tmp2 = new Vector2();
    var tmp3 = new Vector2();

    var DIST_SCALE = 2;

    //A simple sprite with position/velocity and a circle hit area
    var ShotIndicator = new Class({
        
        Extends: GrowingRings,

        initialize: function(radius, count) {
            GrowingRings.call(this, radius, count);

            this.angle = 25 * Math.PI/180;

            this.updateGradientBound = this.updateGradient.bind(this);
            ColorManager.onValueChange.add(this.updateGradientBound);

            this.tmpColor = new Color();
            this.gradient = null;
            this.gradientScale = 250;
            this.target = new Vector2();
        },

        destroy: function() {
            ColorManager.onValueChange.remove(this.updateGradientBound);
        },  

        draw: function(context, pos) {
            if (this.alpha === 0)
                return;
            var target = this.target;

            var transform = this.worldTransform;
            context.setTransform(transform.a, transform.c, transform.b, transform.d, 0, 0);

            context.save();

            context.beginPath();
            //origin point..
            context.moveTo(pos.x, pos.y);

            //rotate our target by offset
            // var cs = Math.cos(this.angleOffset),
            //     sn = Math.sin(this.angleOffset);
            // target = tmp3.copy(target);
            
            // target.x = target.x * cs - target.y * sn;
            // target.y = target.x * sn + target.y * cs;


            var spread = this.angle;

            //determine angle from target to center position
            tmp.copy(target).sub(pos);
            var angle = Math.atan2( tmp.y, tmp.x );


            var dist = tmp2.copy(target).distance(pos) * DIST_SCALE;

            this.fan(context, pos, target, angle-spread, dist);
            this.fan(context, pos, target, angle+spread, dist);

            context.closePath();

            //If we want to be able to tween the color here we can't cache the gradient
            if (this.gradient === null) {
                this.gradient = context.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, this.gradientScale);

                this.tmpColor.copy(ColorManager.theme.indicator);
                this.tmpColor.a = 0.0;
                this.tmpColor.update();

                this.gradient.addColorStop(0, ColorManager.theme.indicator.string);
                this.gradient.addColorStop(1, this.tmpColor.string);
            }
            

            context.fillStyle = this.gradient;
            context.strokeStyle = this.gradient;

            context.globalAlpha = 0.4 * this.alpha;
            context.fill();


            context.clip();

            var thickness = 20;

            for (var i=0; i<this.rings.length; i++) {
                var r = this.rings[i];
                if (r.alpha === 0 || r.scale === 0)
                    continue;

                context.globalAlpha = r.alpha * this.alpha;
                //r.radius is the distance along target line we need to draw..

                this.triangle(context, pos, target, angle, spread, r.radius, r.scale, thickness);

                // context.beginPath();
                // context.arc(pos.x, pos.y, r.radius * r.scale, 0, Math.PI*2);
                // context.stroke();
            }

            context.restore();
        },

        updateGradient: function() {
            this.gradient = null;
            //will be re-created on next draw
        },

        fan: function(context, pos, target, angle, dist) {
            var cos = Math.cos(angle),
                sin = Math.sin(angle);

            tmp.set( cos * dist,
                     sin * dist );
            context.lineTo( pos.x + tmp.x, pos.y + tmp.y);
        },

        triangle: function(context, pos, target, centerAngle, spread, radius, scale, thickness) {
            //unit vector, target -> pos direction
            var dir = tmp2.copy(target).sub(pos).normalize();

            //get tip of triangle...
            tmp.copy(dir).scale( radius*scale );
            var topX = pos.x + tmp.x,
                topY = pos.y + tmp.y;

            context.beginPath();

            var edgeSide = radius*scale;
            //right side
            tmp.set(-dir.y, dir.x).scale( edgeSide );
            context.moveTo(pos.x + tmp.x, pos.y + tmp.y);

            //top edge
            context.lineTo(topX, topY);

            //left side
            tmp.set(dir.y, -dir.x).scale( edgeSide );
            context.lineTo(pos.x + tmp.x, pos.y + tmp.y);


            // context.lineJoin = 'miter';
            context.lineWidth = thickness;
            context.stroke();

            // context.fillRect(topX, topY, 5, 5);
        },

        triangle2: function(context, pos, target, centerAngle, spread, radius, scale, thickness) {
            var cos = Math.cos(centerAngle),
                sin = Math.sin(centerAngle);

            var angleOffset = 90;
            var off = angleOffset;

            tmp.set( cos * (radius*scale),
                     sin * (radius*scale) );
            context.beginPath();

            var topX = pos.x + tmp.x,
                topY = pos.y + tmp.y;


            tmp.set( cos * (radius-thickness)*scale,
                     sin * (radius-thickness)*scale );

            var botX = pos.x + tmp.x,
                botY = pos.y + tmp.y;

            /// TIP OF TRIANGLE
            context.moveTo(topX, topY);

            //RIGHT SIDE, upper extent
            cos = Math.cos(centerAngle + spread);
            sin = Math.sin(centerAngle + spread);

            tmp.set( cos * (radius-off)*scale,
                     sin * (radius-off)*scale );
            context.lineTo(pos.x + tmp.x, pos.y + tmp.y);

            //RIGHT SIDE, lower extent..
            tmp.set( cos * (radius-off-thickness)*scale,
                     sin * (radius-off-thickness)*scale );
            context.lineTo(pos.x + tmp.x, pos.y + tmp.y);
            context.lineTo(botX, botY);
            



            //LEFT SIDE SIDE, lower extent
            cos = Math.cos(centerAngle - spread);
            sin = Math.sin(centerAngle - spread);

            //LEFT SIDE, upper extent..
            tmp.set( cos * (radius-off-thickness)*scale,
                     sin * (radius-off-thickness)*scale );
            context.lineTo(pos.x + tmp.x, pos.y + tmp.y);

            //lower extent
            tmp.set( cos * (radius-off)*scale,
                     sin * (radius-off)*scale );
            context.lineTo(pos.x + tmp.x, pos.y + tmp.y);

            context.lineTo(topX, topY);
            context.fill();
        },


    });

    return ShotIndicator;
});