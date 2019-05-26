//////////////////////////////////////////////////////////////////////////////////////
// Game

// game modes
const GAME_PACMAN = 3;
const GAME_MSPACMAN = 1;
const GAME_COOKIE = 2;
const GAME_SOFTMAN = 0;

let practiceMode = false;
let turboMode = false;

// current game mode
let gameMode = GAME_PACMAN;
const getGameName = (function(){

    const names = ["SOFT-MAN", "MS PAC-MAN", "COOKIE-MAN","PAC-MAN"];
    
    return function(mode) {
        if (mode == undefined) {
            mode = gameMode;
        }
        return names[mode];
    };
})();

const getGameDescription = (function(){

    const desc = [
        [
            "THE UNRELEASED",
            "SOFT-MAN PROTOTYPE:",
            "GCC (C) 1981",
            "",
            "SPRITES REFERENCED FROM",
            "STEVE GOLSON'S",
            "CAX 2012 PRESENTATION",
            "",
            "REMAKE:",
            "MASONICGIT",
        ],
        [
            "ORIGINAL ARCADE ADDON:",
            "MIDWAY/GCC (C) 1981",
            "",
            "REVERSE-ENGINEERING:",
            "BART GRANTHAM",
            "",
            "REMAKE:",
            "SHAUN WILLIAMS",
        ],
        [
            "A NEW PAC-MAN GAME",
            "WITH RANDOM MAZES:",
            "SHAUN WILLIAMS (C) 2012",
            "",
            "COOKIE MONSTER DESIGN:",
            "JIM HENSON",
            "",
            "PAC-MAN CROSSOVER CONCEPT:",
            "TANG YONGFA",
        ],
        [
            "THE UNRELEASED",
            "MS. PAC-MAN PROTOTYPE:",
            "GCC (C) 1981",
            "",
            "SPRITES REFERENCED FROM",
            "STEVE GOLSON'S",
            "CAX 2012 PRESENTATION",
            "",
            "REMAKE:",
            "SHAUN WILLIAMS",
        ],
        [
            "ORIGINAL ARCADE:",
            "NAMCO (C) 1980",
            "",
            "REVERSE-ENGINEERING:",
            "JAMEY PITTMAN",
            "",
            "REMAKE:",
            "SHAUN WILLIAMS",
        ],
    ];
    
    return function(mode) {
        if (mode == undefined) {
            mode = gameMode;
        }
        return desc[mode];
    };
})();

const getGhostNames = function(mode) {
    if (mode == undefined) {
        mode = gameMode;
    }
    if (mode == GAME_MSPACMAN) {
        return ["blinky","pinky","inky","sue"];
    }
    else if (mode == GAME_PACMAN) {
        return ["blinky","pinky","inky","clyde"];
    }
    else if (mode == GAME_COOKIE) {
        return ["elmo","piggy","rosita","zoe"];
    }
    else if (mode == GAME_SOFTMAN) {
        return ["sec","cftc","fincen","nydfs"];
    }
};

const getGhostDrawFunc = function(mode) {
    if (mode == undefined) {
        mode = gameMode;
    }
    if (mode == GAME_SOFTMAN) {
        return atlas.drawGhostSprite;
    }
    else if (mode == GAME_COOKIE) {
        return atlas.drawMuppetSprite;
    }
    else {
        return atlas.drawGhostSprite;
    }
};

const getPlayerDrawFunc = function(mode) {
    if (mode == undefined) {
        mode = gameMode;
    }
    if (mode == GAME_SOFTMAN) {
        return atlas.drawSoftmanSprite;
    }
    else if (mode == GAME_PACMAN) {
        return atlas.drawPacmanSprite;
    }
    else if (mode == GAME_MSPACMAN) {
        return atlas.drawMsPacmanSprite;
    }
    else if (mode == GAME_COOKIE) {
        //return atlas.drawCookiemanSprite;
        return drawCookiemanSprite;
    }
};


// for clearing, backing up, and restoring cheat states (before and after cutscenes presently)
let clearCheats, backupCheats, restoreCheats;
(function(){
    clearCheats = function() {
        pacman.invincible = false;
        pacman.ai = false;
        for (i=0; i<5; i++) {
            actors[i].isDrawPath = false;
            actors[i].isDrawTarget = false;
        }
        executive.setUpdatesPerSecond(60);
    };

    let i, invincible, ai, isDrawPath, isDrawTarget;
    isDrawPath = {};
    isDrawTarget = {};
    backupCheats = function() {
        invincible = pacman.invincible;
        ai = pacman.ai;
        for (i=0; i<5; i++) {
            isDrawPath[i] = actors[i].isDrawPath;
            isDrawTarget[i] = actors[i].isDrawTarget;
        }
    };
    restoreCheats = function() {
        pacman.invincible = invincible;
        pacman.ai = ai;
        for (i=0; i<5; i++) {
            actors[i].isDrawPath = isDrawPath[i];
            actors[i].isDrawTarget = isDrawTarget[i];
        }
    };
})();

// current level, lives, and score
let level = 1;
let extraLives = 0;

// VCR functions

let savedLevel = {};
let savedExtraLives = {};
let savedHighScore = {};
let savedScore = {};
let savedState = {};

const saveGame = function(t) {
    savedLevel[t] = level;
    savedExtraLives[t] = extraLives;
    savedHighScore[t] = getHighScore();
    savedScore[t] = getScore();
    savedState[t] = state;
};
const loadGame = function(t) {
    level = savedLevel[t];
    if (extraLives != savedExtraLives[t]) {
        extraLives = savedExtraLives[t];
        renderer.drawMap();
    }
    setHighScore(savedHighScore[t]);
    setScore(savedScore[t]);
    state = savedState[t];
};

/// SCORING
// (manages scores and high scores for each game type)

const scores = [
    0,0, // pacman
    0,0, // mspac
    0,0, // cookie
    0,0, // otto
    0,0, // softman
    0 ];
const highScores = [
    10000,10000, // pacman
    10000,10000, // mspac
    10000,10000, // cookie
    10000,10000, // otto
    10000,10000, // softman
    ];

const getScoreIndex = function() {
    if (practiceMode) {
        return 8;
    }
    return gameMode*2 + (turboMode ? 1 : 0);
};

// handle a score increment
const addScore = function(p) {

    // get current scores
    let score = getScore();

    // handle extra life at 10000 points
    if (score < 10000 && score+p >= 10000) {
        extraLives++;
        renderer.drawMap();
    }

    score += p;
    setScore(score);

    if (!practiceMode) {
        if (score > getHighScore()) {
            setHighScore(score);
        }
    }
};

const getScore = function() {
    return scores[getScoreIndex()];
};
const setScore = function(score) {
    scores[getScoreIndex()] = score;
};

const getHighScore = function() {
    return highScores[getScoreIndex()];
};
const setHighScore = function(highScore) {
    highScores[getScoreIndex()] = highScore;
    saveHighScores();
};
// High Score Persistence

const loadHighScores = function() {
    let hs;
    let hslen;
    let i;
    if (localStorage && localStorage.highScores) {
        hs = JSON.parse(localStorage.highScores);
        hslen = hs.length;
        for (i=0; i<hslen; i++) {
            highScores[i] = Math.max(highScores[i],hs[i]);
        }
    }
};
const saveHighScores = function() {
    if (localStorage) {
        localStorage.highScores = JSON.stringify(highScores);
    }
};
