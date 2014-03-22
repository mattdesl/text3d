define(['Class', 
        'PIXI',
        'flick/Vector2',
        'libjs/utils/Util',
        'libjs/signals/Signal',
        'framework/controllers/BaseController'], 
        function(Class, 
                 PIXI,
                 Vector2,
                 Util,
                 Signal,
                 BaseController){

    var CanvasPreloader = new Class({
        
        Extends: BaseController,

        init: function(template) {
            this.parent(template);

            this.spinner = {
                image: null,
                position: new Vector2()
            };

            this.onComplete = new Signal();

            this.loading = false;
            this.loaded = false;
            this.spinnerRotation = 0;   

            //Don't show it unless we have a slow connection
            this.SPINNER_SHOW = 200;  
            this.time = 0;

            var spinner = new Image();
            spinner.onload = function() {
                this.spinner.image = spinner;
            }.bind(this);
            spinner.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAALjSURBVHjavNfPa1xVFAfwz3uZdNI0NAWhNtYfRVEsCJaqG6GL/lgpiLiwa3EjCKIguHDrxo1/QHd1UVCUbhSEKgiii0Jpu7ALsVWUlqipWtvGTJLJuDkPL4fJOJPOeODy5r25P77ne7733HOrXq9nSJvCURzD09iGx9GO/+ui78awk7aG6HM33saLmC8Wmkr9qvS9h/V4bgnADN7Eq9gRE28kTwfZdLQuOqMC2I1TeKKPp6PatphjpV9o+gF4DO/jgRhQFTG+hk/wGZZwMcW9Sq0ZVweQm8HIv3FLItyNM1goPJ/CL3gXJ/MEAwTbDhCt4tsG/iqZKAFM4zQOJna+xEu4PSL1FbaHlrI4rzfiLAX1Bg6kSU6E+m9vIfY9LEfsszjnMgN78EWhdvH+8pCU/5fNY7ZgoodFdBsGXonFG1vEa2NaXMS9m8Iz34RgFi9E0ljHGt6LQeOyJhzTRduFuo70OlN0voYPjd9uhYMlC7OtSDZrhSBPj5H6bJ1CgDXmajycOn1tcvZ3em+3cE8w0GSuKxMEsFacnlWjgbnU6Y8JAljPGbMVqP5Pa5e7ow51lrZrgotPp/dujR+DhdVo908QwGww0I7TsVvjcur01AQBZHaXa5wrvF/FoRGqnlFPx3sTA7fq2PdlybQHz0wAwN44nssCZqmO5PBpwUAHx1N6vlNr4dHC+zZ+LU/DUylL3RUF6bjsyeRQFz+UBckSPk674UBUQndqB7Evxf7nJuyl2D7AT2nws8HEzBZpP4JH0veb+G6zonQB72BnkTZXIz1/hG+GuPVU2B+3ph0xXqGvM2Xyq/pczR7EWwFCmuBPnMW3uIGrBfAZPIT7YuGVNP4GvsLvg8ryMmG8HmDW0kTNll1JR+xKenaKcb/h8z7H8aYAmhvN8zgcv7cCYB0XcH6zIqca4na8E89FTLcPANIpnh1cinAtDxTMiNfz/aHqfeHdQgBYjEWv4vvYTUOVdf8MACJ+0YQTtVtgAAAAAElFTkSuQmCC";


            var assets = new PIXI.AssetLoader([
                //these are non-retina images..
                'img/animations/particle-6A-test.json',
                
                //these are retina-enabled images
                Util.getImageURL(CanvasPreloader.MOBILE_SPRITESHEET_JSON),

                'img/mobile-bg.png',
                //Should probably use a JSON cooker type thing..
                'img/tutorial/tutorial-spin.png',
                'img/tutorial/tutorial-check.png',
                'img/tutorial/tutorial-icon0.png',
                'img/tutorial/tutorial-next.png',
                CanvasPreloader.ROTATE_SCREEN,
                CanvasPreloader.ROTATE_SCREEN_TEXT //just an image now.. maybe make it text later
            ]);

            // assets.addEventListener('onProgress', function(ev) {
            //     console.log("Flick preload progress...", ev);
            // }.bind(this));
            assets.addEventListener('onComplete', function() {
                // console.log("Flick preload complete!");

                CanvasPreloader.hasLoaded = true;
                this.loaded = true;
                this.loading = false;
                this.onComplete.dispatch();
            }.bind(this));

            this.assets = assets;

            this.initialized();
        },

        load: function() {
            this.loading = true;
            this.loaded = false;
            this.assets.load();
        },

        draw: function(context, dt) {
            this.time += dt;
            if (this.spinner.image !== null && this.time > this.SPINNER_SHOW) {
                this.spinnerRotation += 0.009 * dt;
                                
                context.save();
                context.translate(Math.round(this.width/2), 
                                  Math.round(this.height/2))
                context.rotate(this.spinnerRotation);
                var img = this.spinner.image,
                    x = this.spinner.position.x,
                    y = this.spinner.position.y;
                context.drawImage(img, -Math.round(img.width/2 + x), -Math.round(img.height/2 + y));
                context.restore();
            }
        },
    });
        
    CanvasPreloader.ROTATE_SCREEN = 'img/rotate-screen.png';
    CanvasPreloader.MOBILE_SPRITESHEET_JSON = 'img/tps/mobile0.json';
    CanvasPreloader.ROTATE_SCREEN_TEXT = 'img/rotate-screen-text.png';

    CanvasPreloader.hasLoaded = false;

    return CanvasPreloader;
});