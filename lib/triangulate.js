var poly2tri = require('poly2tri');

function getWindingNumber(point, points_list)
{
    // The winding number counter.
    var winding_number = 0;

    for (var i = 0; i < points_list.length; ++i)             // Edge from point1 to points_list[i+1]
    {
        var point1 = points_list[i];
        var point2;

        // Wrap?
        if (i === (points_list.length - 1))
        {
            point2 = points_list[0];
        }
        else
        {
            point2 = points_list[i + 1];
        }

        if (point1.y <= point.y)                                    // start y <= point.y
        {
            if (point2.y > point.y)                                 // An upward crossing
            {
                if (Is_Left(point1, point2, point) > 0)             // Point left of edge
                {
                    ++winding_number;                               // Have a valid up intersect
                }
            }
        }
        else
        {
            // start y > point.y (no test needed)
            if (point2.y <= point.y)                                // A downward crossing
            {
                if (Is_Left(point1, point2, point) < 0)             // Point right of edge
                {
                    --winding_number;                               // Have a valid down intersect
                }
            }
        }
    }

    return winding_number;
}

function Is_Left(p0, p1, point) {
    return ((p1.x - p0.x) * (point.y - p0.y) - (point.x - p0.x) * (p1.y - p0.y));
}

function isClockwise(points) {
    var sum = 0;
    for (var i=0; i<points.length; i++) {
        var o = i===points.length-1 ? points[0] : points[i+1];
        sum += (o.x - points[i].x) * (o.y + points[i].y);
    }
    return sum > 0;
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

/**
 * Triangulates a list of Shape objects. 
 */
module.exports = function (shapes) {
    var windingClockwise = false;
    var sweep = null;

    var poly = {holes:[], contour:[]};
    var allTris = [];

    // debugger;

    for (var j=0; j<shapes.length; j++) {
        var points = shapes[j].points;
        
        var set = asPointSet(points);

        //check the winding order
        if (j==0) {
            windingClockwise = isClockwise(set);

            var windingNumber = getWindingNumber(points[0], points);

            // console.log("POIND", j, windingClockwise, windingNumber);
        }
        
        try {
            // var set = asPointSet(points);

            //if the sweep has already been created, maybe we're on a hole?
            if (sweep !== null) {
                var clock = isClockwise(set);
                var windingNumber = getWindingNumber(points[0], points);

                // console.log("POINT", j, clock, windingNumber);

                //we have a hole...
                if (windingClockwise !== clock) {
                    sweep.addHole( set );
                    poly.holes.push(points);
                } else {
                    //no hole, so it must be a new shape.
                    //add our last shape
                    
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
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    //if the sweep is still setup, then triangulate it
    if (sweep !== null) {
        try {
            sweep.triangulate();
            allTris = allTris.concat(sweep.getTriangles());
        } catch (e) {
            console.log(e);
            return null;
        }
    }
    return allTris;
}