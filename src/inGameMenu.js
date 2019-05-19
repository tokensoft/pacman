////////////////////////////////////////////////////
// In-Game Menu
var inGameMenu = (function() {

    var w=tileSize*6,h=tileSize*3;

    var getMainMenu = function() {
        return practiceMode ? practiceMenu : menu;
    };
    var getTsftMenu = function() {
        return practiceMode ? practiceMenu : tsftMenu;
    };
    var showMainMenu = function() {
        getMainMenu().enable();
    };
    var hideMainMenu = function() {
        getMainMenu().disable();
    };
    var showTsftMenu = function() {
        getTsftMenu().enable();
    };
    var hideTsftMenu = function() {
        getTsftMenu().disable();
    };

    // button to enable in-game menu
    var btn = new Button(mapWidth/2 - w/2 - mapWidth/8,mapHeight,w,h, function() {
        showMainMenu();
        vcr.onHudDisable();
    });
    btn.setText("MENU");
    btn.setFont(tileSize+"px ArcadeR","#FFF");

    // button to enable in-game menu
    var tsbtn = new Button(mapWidth/2 - w/2 + mapWidth/8,mapHeight,w,h, function() {
        showTsftMenu();
        vcr.onHudDisable();
    });
    tsbtn.setText("TSFT");
    tsbtn.setFont(tileSize+"px ArcadeR","#FFF");

    // confirms a menu action
    var confirmMenu = new Menu("QUESTION?",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    confirmMenu.addTextButton("YES", function() {
        confirmMenu.disable();
        confirmMenu.onConfirm();
    });
    confirmMenu.addTextButton("NO", function() {
        confirmMenu.disable();
        showMainMenu();
    });
    confirmMenu.addTextButton("CANCEL", function() {
        confirmMenu.disable();
        showMainMenu();
    });
    confirmMenu.backButton = confirmMenu.buttons[confirmMenu.buttonCount-1];

    var showConfirm = function(title,onConfirm) {
        hideMainMenu();
        confirmMenu.title = title;
        confirmMenu.onConfirm = onConfirm;
        confirmMenu.enable();
    };

    // regular menu
    var menu = new Menu("PAUSED",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    menu.addTextButton("RESUME", function() {
        menu.disable();
    });
    menu.addTextButton("QUIT", function() {
        showConfirm("QUIT GAME?", function() {
            switchState(homeState, 60);
        });
    });
    menu.backButton = menu.buttons[0];

    // tokensoft menu
    var tsftMenu = new Menu("PAUSED",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    tsftMenu.addTextButton("RESUME", function() {
        tsftMenu.disable();
    });
    tsftMenu.addTextButton("WEBSITE", function() {
        window.open('https://www.tokensoft.io', '_blank');
    });
    tsftMenu.addTextButton("BLOG", function() {
        window.open('https://www.tokensoft.io/blog', '_blank');
    });
    tsftMenu.addTextButton("ABOUT", function() {
        window.open('https://www.tokensoft.io/about', '_blank');
    });
    tsftMenu.backButton = tsftMenu.buttons[0];

    // practice menu
    var practiceMenu = new Menu("PAUSED",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    practiceMenu.addTextButton("RESUME", function() {
        hideMainMenu();
        vcr.onHudEnable();
    });
    practiceMenu.addTextButton("RESTART LEVEL", function() {
        showConfirm("RESTART LEVEL?", function() {
            level--;
            switchState(readyNewState, 60);
        });
    });
    practiceMenu.addTextButton("SKIP LEVEL", function() {
        showConfirm("SKIP LEVEL?", function() {
            switchState(readyNewState, 60);
        });
    });
    practiceMenu.addTextButton("CHEATS", function() {
        practiceMenu.disable();
        cheatsMenu.enable();
    });
    practiceMenu.addTextButton("QUIT", function() {
        showConfirm("QUIT GAME?", function() {
            switchState(homeState, 60);
            clearCheats();
            vcr.reset();
        });
    });
    practiceMenu.backButton = practiceMenu.buttons[0];

    // cheats menu
    var cheatsMenu = new Menu("CHEATS",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    cheatsMenu.addToggleTextButton("INVINCIBLE",
        function() {
            return pacman.invincible;
        },
        function(on) {
            pacman.invincible = on;
        });
    cheatsMenu.addToggleTextButton("TURBO",
        function() {
            return turboMode;
        },
        function(on) {
            turboMode = on;
        });
    cheatsMenu.addToggleTextButton("SHOW TARGETS",
        function() {
            return blinky.isDrawTarget;
        },
        function(on) {
            for (var i=0; i<4; i++) {
                ghosts[i].isDrawTarget = on;
            }
        });
    cheatsMenu.addToggleTextButton("SHOW PATHS",
        function() {
            return blinky.isDrawPath;
        },
        function(on) {
            for (var i=0; i<4; i++) {
                ghosts[i].isDrawPath = on;
            }
        });
    cheatsMenu.addSpacer(1);
    cheatsMenu.addTextButton("BACK", function() {
        cheatsMenu.disable();
        practiceMenu.enable();
    });
    cheatsMenu.backButton = cheatsMenu.buttons[cheatsMenu.buttons.length-1];

    var menus = [menu, tsftMenu, practiceMenu, confirmMenu, cheatsMenu];
    var getVisibleMenu = function() {
        var len = menus.length;
        var i;
        var m;
        for (i=0; i<len; i++) {
            m = menus[i];
            if (m.isEnabled()) {
                return m;
            }
        }
    };

    return {
        onHudEnable: function() {
            btn.enable();
            tsbtn.enable();
        },
        onHudDisable: function() {
            btn.disable();
            tsbtn.disable();
        },
        update: function() {
            if (btn.isEnabled) {
                btn.update();
                tsbtn.update();
            }
        },
        draw: function(ctx) {
            var m = getVisibleMenu();
            if (m) {
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(-mapPad-1,-mapPad-1,mapWidth+1,mapHeight+1);
                m.draw(ctx);
            }
            else {
                btn.draw(ctx);
                tsbtn.draw(ctx);
            }
        },
        isOpen: function() {
            return getVisibleMenu() != undefined;
        },
        getMenu: function() {
            return getVisibleMenu();
        },
        getMenuButton: function() {
            return btn;
        },
    };
})();

