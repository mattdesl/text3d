var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;

var Constraint = require('./Constraint');

var tmp = new Vector3();

/**
 * Creates a "physical text" object where each point (in triangles)
 * has a velocity, position, mass, etc.
 *
 * This does not hold on to the Text3D object
 */
var World = new Class({

    initialize: function(gravity) {
        this.particles = [];
        this.gravity = gravity||new Vector3(0, 0, 0);
        
        this.floor = Number.MAX_VALUE;
        this.floorFriction = 0.98;

        this.accuracy = 1;

        this.defaultStiffness = 0.2;
        this.defaultRestingDistance = undefined;
    },

    clear: function() {
        this.particles.length = 0;
    },

    addTriangleList: function(triangles, mass, restitution, glyphIndex) {
        mass = typeof mass === "number" ? mass : 1.0;
        restitution = typeof restitution === "number" ? restitution : -0.5;


        var particles = this.particles,
            defStiff = this.defaultStiffness,
            defRest = this.defaultRestingDistance;

        for (var i=0; i<triangles.length; i++) {
            var point = triangles[i];

            //constrain the triangle together..
            
            var particle = {
                position: new Vector3(point),
                velocity: new Vector3(),
                acceleration: new Vector3(),

                original: new Vector3(point),
                lastPosition: new Vector3(point),
                finalPosition: new Vector3(point),

                glyphIndex: glyphIndex,
                mass: mass,
                restitution: restitution,
                restingDistance: 0,
                constraints: []
            };                

            particles.push(particle);

            if (((i+1) % 3) === 0) {
                //the last three particles are our triangle
                
                var p3 = particles[particles.length-1],
                    p2 = particles[particles.length-2],
                    p1 = particles[particles.length-3];
                


                p1.constraints = [
                    new Constraint(p1, p2, defStiff, defRest),
                    new Constraint(p1, p3, defStiff, defRest),
                ];
                p2.constraints = [
                    new Constraint(p2, p1, defStiff, defRest),
                    new Constraint(p2, p3, defStiff, defRest),
                ];
                p3.constraints = [
                    new Constraint(p3, p1, defStiff, defRest),
                    new Constraint(p3, p2, defStiff, defRest),
                ];

                //surely a more efficient means of doing this.
                //maybe each particle has a fixed # of constraints?
                // lastA.constraints = [
                //     new Constraint(lastA, lastB, defStiff, defRest),
                //     new Constraint(lastA, lastC, defStiff, defRest),
                // ];
                // lastB.constraints = [
                //     new Constraint(lastB, lastA, defStiff, defRest),
                //     new Constraint(lastB, lastC, defStiff, defRest),
                // ];
                // lastC.constraints = [
                //     new Constraint(lastC, lastB, defStiff, defRest),
                //     new Constraint(lastC, lastA, defStiff, defRest),
                // ];

                // lastA.constraints.push(new Constraint(lastA, lastB, defStiff, defRest));
            }
        }
    },

    //Utility/helper method...
    addText3D: function(text3D, mass, restitution) {
        var particles = this.particles,
            defStiff = this.defaultStiffness,
            defRest = this.defaultRestingDistance;

        for (var k=0; k<text3D.glyphs.length; k++) {
            var g = text3D.glyphs[k];

            this.addTriangleList(g.points, mass, restitution, k);
        }
    },

    solveConstraints: function(particle, constraints) {
        var i = constraints.length;
        while (i--) { //in reverse so we can pop safely
            var c = constraints[i];

            //solve the constraint, it will return the distance 
            var dist = c.solve();

            //here we can optionally check to see if we should tear the constraint
            //and pop it from the stack... 
        }
    },

    step: function(dt) {
        dt = dt||0.16;

        var particles = this.particles,
            gravity = this.gravity,
            floor = this.floor,
            floorFriction = this.floorFriction;

        var steps = this.accuracy;
        while (steps--) {
            for (var i=0; i<particles.length; i++) {
                var p = particles[i];
                var c = p.constraints;

                //Pull this particle close to its attached constraints
                this.solveConstraints(p, c);
            }
        }


        for (var i=0; i<particles.length; i++) {
            var p = particles[i];


            p.velocity.scale(0.98);

            p.velocity.x += gravity.x;
            p.velocity.y += gravity.y;
            p.velocity.z += gravity.z;

            p.position.x += p.velocity.x * dt;
            p.position.y += p.velocity.y * dt;
            p.position.z += p.velocity.z * dt;

            if (p.position.y >= this.floor) {
                p.velocity.x *= floorFriction;
                p.velocity.y *= floorFriction;
                p.velocity.z *= floorFriction;

                p.velocity.y *= p.restitution;
                p.position.y = this.floor - 0.1;
            }
        }
    },

});

module.exports = World;