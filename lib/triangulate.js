var poly2tri = require('poly2tri');

function isClockwise(points) {
    var sum = 0;
    for (var i=0; i<points.length; i++) {
        var o = i===points.length-1 ? points[0] : points[i+1];
        sum += (o.x - points[i].x) * (o.y + points[i].y);
    }
    return sum > 0;
}

function pointInPoly(points, test) {
    //http://stackoverflow.com/a/2922778
    var c = 0,
        nvert = points.length, 
        i=0, j=nvert-1, 
        testx = test.x,
        testy = test.y;

    for ( ; i < nvert; j = i++) {
        if ( ((points[i].y>testy) != (points[j].y>testy)) 
                && (testx < (points[j].x-points[i].x) 
                    * (testy-points[i].y) / (points[j].y-points[i].x) + points[i].x) )
            c = !c;
    }
    return c;
}


function indexOfPointInList(other, list) {
    for (var i=0; i<list.length; i++) {
        var p = list[i];
        if (p.x == other.x && p.y == other.y)
            return i;
    }
    return -1;
}

function isCollinear(a, b, c) {
    var r = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y) ;
    var eps = 0.0000001;
    return Math.abs(r) < eps;
}

function asPointSet(points) {
    var contour = [];

    for (var n=0; n<points.length; n++) {
        var x = points[n].x;
        var y = points[n].y;
                
        var np = new poly2tri.Point(x, y);
        
        if (indexOfPointInList(np, contour) === -1) {
            if ( (n===0 || n===points.length-1) || !isCollinear(points[n-1], points[n], points[n+1]))
                contour.push(np);
        }
    }
    return contour;
}

function insideHole(poly, point) {
    for (var i=0; i<poly.holes.length; i++) {
        var hole = poly.holes[i];
        if (pointInPoly(hole, point))
            return true;
    }
    return false;
}

function getBounds(poly) {
    var minX = Number.MAX_VALUE,
        minY = Number.MAX_VALUE,
        maxX = -Number.MAX_VALUE,
        maxY = -Number.MAX_VALUE;
    for (var i=0; i<poly.contour.length; i++) {
        var v = poly.contour[i];

        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
    }
    return {
        minX: minX,
        maxX: maxX,
        minY: minY,
        maxY: maxY
    };
}

function addSteinerPoints(poly, points, sweep) {
    var bounds = getBounds(poly);


    //ensure points are unique and not collinear 
    points = asPointSet(points);

    for (var i=0; i<points.length; i++) {
        var p = points[i];

        if (p.x <= bounds.minX || p.y <= bounds.minY || p.x >= bounds.maxX || p.y >= bounds.maxY)
            continue;

        if (pointInPoly(poly.contour, p) && !insideHole(poly, p)) {
            //We are in the polygon! Now make sure we're not in a hole..
            sweep.addPoint(new poly2tri.Point(p.x, p.y));
        }
    }
}

/**
 * Triangulates a list of Shape objects. 
 */
module.exports = function (shapes, steinerPoints) {
    var windingClockwise = false;
    var sweep = null;

    var poly = {holes:[], contour:[]};
    var allTris = [];

    steinerPoints = steinerPoints || null;


    // debugger;
            console.log("PATHS", shapes.length)

    for (var j=0; j<shapes.length; j++) {
        var points = shapes[j].points;
        
        var set = asPointSet(points);

        //check the winding order
        if (j==0) {
            windingClockwise = isClockwise(set);
            // var windingNumber = getWindingNumber(points[0], points);

            // console.log("POIND", j, windingClockwise, windingNumber);
        }
        
        // try {
            // var set = asPointSet(points);

            //if the sweep has already been created, maybe we're on a hole?
            if (sweep !== null) {
                var clock = isClockwise(set);
                // var windingNumber = getWindingNumber(points[0], points);

                // console.log("POINT", j, clock, windingNumber);

                //we have a hole...
                if (windingClockwise !== clock) {
                    sweep.addHole( set );
                    poly.holes.push(set);
                } else {
                    //no hole, so it must be a new shape.
                    //add our last shape
                    
                    if (steinerPoints!==null) {
                        addSteinerPoints(poly, steinerPoints, sweep);
                    }

                    sweep.triangulate();
                    allTris = allTris.concat(sweep.getTriangles());

                    //reset the sweep for next shape
                    sweep = new poly2tri.SweepContext(set);
                    poly = {holes:[], contour:points};
                }
            } else {
                sweep = new poly2tri.SweepContext(set);   
                poly = {holes:[], contour:points};
            }
        // } catch (e) {
            // console.log(e);
            // return null;
        // }
    }

    //if the sweep is still setup, then triangulate it
    if (sweep !== null) {
        // try {
            if (steinerPoints!==null) {
                addSteinerPoints(poly, steinerPoints, sweep);
            }

            sweep.triangulate();
            allTris = allTris.concat(sweep.getTriangles());
        // } catch (e) {
        //     console.log(e);
        //     return null;
        // }
    }
    return allTris;
}