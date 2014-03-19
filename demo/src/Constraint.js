var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;

var tmp = new Vector3();

/**
 * Creates a "physical text" object where each point (in triangles)
 * has a velocity, position, mass, etc.
 *
 * This does not hold on to the Text3D object
 */
var Constraint = new Class({

	initialize: function(p1, p2, stiffness, restingDistance) {
		this.p1 = p1;
		this.p2 = p2;

		if (typeof restingDistance !== "number")
			restingDistance = p1.position.distance(p2.position);

        this.originalRestingDistance = this.restingDistance;
		this.restingDistance = restingDistance;
		this.stiffness = typeof stiffness === "number" ? stiffness : 0.01;
        

        this.tearDistance = Number.MAX_VALUE;
	},


    solve: function() {
        var p1 = this.p1,
            p2 = this.p2,
            restingDistance = this.restingDistance,
            stiffness = this.stiffness;
        

        var dx = p2.position.x - p1.position.x;
        var dy = p2.position.y - p1.position.y;
        var dz = p2.position.z - p1.position.z;

        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);


        
        //ratio for resting distance
        var restingRatio = d===0 ? restingDistance : (restingDistance - d) / d;
        
        //invert mass quantities
        var im1 = 1.0 / p1.mass;
        var im2 = 1.0 / p2.mass;
        var scalarP1 = (im1 / (im1 + im2)) * stiffness;
        var scalarP2 = stiffness - scalarP1;
        
        var spring = 1;

        //push/pull based on mass
        p1.velocity.x -= dx * scalarP1 * restingRatio * spring;
        p1.velocity.y -= dy * scalarP1 * restingRatio * spring;
        p1.velocity.z -= dz * scalarP1 * restingRatio * spring;

        p2.velocity.x += dx * scalarP2 * restingRatio * spring;
        p2.velocity.y += dy * scalarP2 * restingRatio * spring;
        p2.velocity.z += dz * scalarP2 * restingRatio * spring;

        // var drest = this.originalRestingDistance - restingDistance;
        // drest = Math.sqrt(drest * drest)
        // this.restingDistance += drest * 0.003;


        return d;
    }
});


module.exports = Constraint;