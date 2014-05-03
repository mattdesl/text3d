module.exports.robustPointInPoly = function(points, test) {
    var t = [ test.x, test.y ];
    var path = points.map(function(p) {
        return [ p.x, p.y ];
    });
    return classifyPoint(path, t);
}

module.exports.isClockwise = function(points) {
    var sum = 0;
    for (var i=0; i<points.length; i++) {
        var o = i===points.length-1 ? points[0] : points[i+1];
        sum += (o.x - points[i].x) * (o.y + points[i].y);
    }
    return sum > 0;
}

module.exports.pointInPoly = function(points, test) {
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

module.exports.indexOfPointInList = function(other, list) {
    for (var i=0; i<list.length; i++) {
        var p = list[i];
        if (p.x == other.x && p.y == other.y)
            return i;
    }
    return -1;
}

module.exports.isCollinear = function(a, b, c) {
    var r = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y) ;
    var eps = 0.0000001;

    if (Math.abs(r) < eps)
        return true;

    //poly2tri also complains about this:
    if ((a.x===b.x && b.x===c.x) || (a.y===b.y && b.y===c.y))
        return true;

    return false;
}

module.exports.getBounds = function(contour) {
    var minX = Number.MAX_VALUE,
        minY = Number.MAX_VALUE,
        maxX = -Number.MAX_VALUE,
        maxY = -Number.MAX_VALUE;
    for (var i=0; i<contour.length; i++) {
        var v = contour[i];
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