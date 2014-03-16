# text3d

This uses typeface.js to grab the vector paths; then transforms into a discrete set of points (the contour) and triangulates it using poly2tri.


```
beefy src/test2d.js --cwd demo --live -- -r './lib/index.js:text3d'
beefy src/test2d.js --cwd demo -- -r './lib/index.js:text3d'
```