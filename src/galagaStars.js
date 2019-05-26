
const galagaStars = (function() {

    let stars = {};
    let numStars = 200;

    let width = mapWidth;
    let height = Math.floor(mapHeight*1.5);

    let ypos;
    let yspeed=-0.5;

    let t;
    let flickerPeriod = 120;
    let flickerSteps = 4;
    let flickerGap = flickerPeriod / flickerSteps;

    const init = function() {
        t = 0;
        ypos = 0;
        let i;
        for (i=0; i<numStars; i++) {
            stars[i] = {
                x: getRandomInt(0,width-1),
                y: getRandomInt(0,height-1),
                color: getRandomColor(),
                phase: getRandomInt(0,flickerPeriod-1),
            };
        }
    };

    const update = function() {
        t++;
        t %= flickerPeriod;

        ypos += yspeed;
        ypos %= height;
        if (ypos < 0) {
            ypos += height;
        }
    };

    const draw = function(ctx) {
        let i;
        let star;
        let time;
        let y;
        ctx.fillStyle = "#FFF";
        for (i=0; i<numStars; i++) {
            star = stars[i];
            time = (t + star.phase) % flickerPeriod;
            if (time >= flickerGap) {
                y = star.y - ypos;
                if (y < 0) {
                    y += height;
                }
                ctx.fillStyle = star.color;
                ctx.fillRect(star.x, y, 1,1);
            }
        }
    };

    return {
        init: init,
        draw: draw,
        update: update,
    };

})();
