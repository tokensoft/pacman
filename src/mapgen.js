const mapgen = (function(){

    const shuffle = function(list) {
        let len = list.length;
        let i,j;
        let temp;
        for (i=0; i<len; i++) {
            j = getRandomInt(0,len-1);
            temp = list[i];
            list[i] = list[j];
            list[j] = temp;
        }
    };

    const randomElement = function(list) {
        let len = list.length;
        if (len > 0) {
            return list[getRandomInt(0,len-1)];
        }
    };

    const UP = 0;
    const RIGHT = 1;
    const DOWN = 2;
    const LEFT = 3;

    let cells = [];
    let tallRows = [];
    let narrowCols = [];

    let rows = 9;
    let cols = 5;

    const reset = function() {
        let i;
        let c;

        // initialize cells
        for (i=0; i<rows*cols; i++) {
            cells[i] = {
                x: i%cols,
                y: Math.floor(i/cols),
                filled: false,
                connect: [false, false, false, false],
                next: [],
                no: undefined,
                group: undefined,
            };
        }

        // allow each cell to refer to surround cells by direction
        for (i=0; i<rows*cols; i++) {
            let c = cells[i];
            if (c.x > 0)
                c.next[LEFT] = cells[i-1];
            if (c.x < cols - 1)
                c.next[RIGHT] = cells[i+1];
            if (c.y > 0)
                c.next[UP] = cells[i-cols];
            if (c.y < rows - 1)
                c.next[DOWN] = cells[i+cols];
        }

        // define the ghost home square

        i = 3*cols;
        c = cells[i];
        c.filled=true;
        c.connect[LEFT] = c.connect[RIGHT] = c.connect[DOWN] = true;

        i++;
        c = cells[i];
        c.filled=true;
        c.connect[LEFT] = c.connect[DOWN] = true;

        i+=cols-1;
        c = cells[i];
        c.filled=true;
        c.connect[LEFT] = c.connect[UP] = c.connect[RIGHT] = true;

        i++;
        c = cells[i];
        c.filled=true;
        c.connect[UP] = c.connect[LEFT] = true;
    };

    const genRandom = function() {

        const getLeftMostEmptyCells = function() {
            let x;
            let leftCells = [];
            for (x=0; x<cols; x++) {
                for (y=0; y<rows; y++) {
                    let c = cells[x+y*cols];
                    if (!c.filled) {
                        leftCells.push(c);
                    }
                }

                if (leftCells.length > 0) {
                    break;
                }
            }
            return leftCells;
        };
        const isOpenCell = function(cell,i,prevDir,size) {

            // prevent wall from going through starting position
            if (cell.y == 6 && cell.x == 0 && i == DOWN ||
                cell.y == 7 && cell.x == 0 && i == UP) {
                return false;
            }

            // prevent long straight pieces of length 3
            if (size == 2 && (i==prevDir || rotateAboutFace(i)==prevDir)) {
                return false;
            }

            // examine an adjacent empty cell
            if (cell.next[i] && !cell.next[i].filled) {
                
                // only open if the cell to the left of it is filled
                if (cell.next[i].next[LEFT] && !cell.next[i].next[LEFT].filled) {
                }
                else {
                    return true;
                }
            }

            return false;
        };
        const getOpenCells = function(cell,prevDir,size) {
            let openCells = [];
            let numOpenCells = 0;
            for (i=0; i<4; i++) {
                if (isOpenCell(cell,i,prevDir,size)) {
                    openCells.push(i);
                    numOpenCells++;
                }
            }
            return { openCells: openCells, numOpenCells: numOpenCells };
        };
        const connectCell = function(cell,dir) {
            cell.connect[dir] = true;
            cell.next[dir].connect[rotateAboutFace(dir)] = true;
            if (cell.x == 0 && dir == RIGHT) {
                cell.connect[LEFT] = true;
            }
        };

        const gen = function() {
        
            let cell;      // cell at the center of growth (open cells are chosen around this cell)
            let newCell;   // most recent cell filled
            let firstCell; // the starting cell of the current group

            let openCells;    // list of open cells around the center cell
            let numOpenCells; // size of openCells

            let dir; // the most recent direction of growth relative to the center cell
            let i;   // loop control variable used for iterating directions

            let numFilled = 0;  // current count of total cells filled
            let numGroups;      // current count of cell groups created
            let size;           // current number of cells in the current group
            let probStopGrowingAtSize = [ // probability of stopping growth at sizes...
                    0,     // size 0
                    0,     // size 1
                    0.10,  // size 2
                    0.5,   // size 3
                    0.75,  // size 4
                    1];    // size 5

            // A single cell group of size 1 is allowed at each row at y=0 and y=rows-1,
            // so keep count of those created.
            let singleCount = {};
            singleCount[0] = singleCount[rows-1] = 0;
            let probTopAndBotSingleCellJoin = 0.35;

            // A count and limit of the number long pieces (i.e. an "L" of size 4 or "T" of size 5)
            let longPieces = 0;
            let maxLongPieces = 1;
            let probExtendAtSize2 = 1;
            let probExtendAtSize3or4 = 0.5;

            const fillCell = function(cell) {
                cell.filled = true;
                cell.no = numFilled++;
                cell.group = numGroups;
            };

            for (numGroups=0; ; numGroups++) {

                // find all the leftmost empty cells
                openCells = getLeftMostEmptyCells();

                // stop add pieces if there are no more empty cells.
                numOpenCells = openCells.length;
                if (numOpenCells == 0) {
                    break;
                }

                // choose the center cell to be a random open cell, and fill it.
                firstCell = cell = openCells[getRandomInt(0,numOpenCells-1)];
                fillCell(cell);

                // randomly allow one single-cell piece on the top or bottom of the map.
                if (cell.x < cols-1 && (cell.y in singleCount) && Math.random() <= probTopAndBotSingleCellJoin) {
                    if (singleCount[cell.y] == 0) {
                        cell.connect[cell.y == 0 ? UP : DOWN] = true;
                        singleCount[cell.y]++;
                        continue;
                    }
                }

                // number of cells in this contiguous group
                size = 1;

                if (cell.x == cols-1) {
                    // if the first cell is at the right edge, then don't grow it.
                    cell.connect[RIGHT] = true;
                    cell.isRaiseHeightCandidate = true;
                }
                else {
                    // only allow the piece to grow to 5 cells at most.
                    while (size < 5) {

                        let stop = false;

                        if (size == 2) {
                            // With a horizontal 2-cell group, try to turn it into a 4-cell "L" group.
                            // This is done here because this case cannot be reached when a piece has already grown to size 3.
                            let c = firstCell;
                            if (c.x > 0 && c.connect[RIGHT] && c.next[RIGHT] && c.next[RIGHT].next[RIGHT]) {
                                if (longPieces < maxLongPieces && Math.random() <= probExtendAtSize2) {

                                    c = c.next[RIGHT].next[RIGHT];
                                    let dirs = {};
                                    if (isOpenCell(c,UP)) {
                                        dirs[UP] = true;
                                    }
                                    if (isOpenCell(c,DOWN)) {
                                        dirs[DOWN] = true;
                                    }

                                    if (dirs[UP] && dirs[DOWN]) {
                                        i = [UP,DOWN][getRandomInt(0,1)];
                                    }
                                    else if (dirs[UP]) {
                                        i = UP;
                                    }
                                    else if (dirs[DOWN]) {
                                        i = DOWN;
                                    }
                                    else {
                                        i = undefined;
                                    }

                                    if (i != undefined) {
                                        connectCell(c,LEFT);
                                        fillCell(c);
                                        connectCell(c,i);
                                        fillCell(c.next[i]);
                                        longPieces++;
                                        size+=2;
                                        stop = true;
                                    }
                                }
                            }
                        }

                        if (!stop) {
                            // find available open adjacent cells.
                            let result = getOpenCells(cell,dir,size);
                            openCells = result['openCells'];
                            numOpenCells = result['numOpenCells'];

                            // if no open cells found from center point, then use the last cell as the new center
                            // but only do this if we are of length 2 to prevent numerous short pieces.
                            // then recalculate the open adjacent cells.
                            if (numOpenCells == 0 && size == 2) {
                                cell = newCell;
                                result = getOpenCells(cell,dir,size);
                                openCells = result['openCells'];
                                numOpenCells = result['numOpenCells'];
                            }

                            // no more adjacent cells, so stop growing this piece.
                            if (numOpenCells == 0) {
                                stop = true;
                            }
                            else {
                                // choose a random valid direction to grow.
                                dir = openCells[getRandomInt(0,numOpenCells-1)];
                                newCell = cell.next[dir];

                                // connect the cell to the new cell.
                                connectCell(cell,dir);

                                // fill the cell
                                fillCell(newCell);

                                // increase the size count of this piece.
                                size++;

                                // don't let center pieces grow past 3 cells
                                if (firstCell.x == 0 && size == 3) {
                                    stop = true;
                                }

                                // Use a probability to determine when to stop growing the piece.
                                if (Math.random() <= probStopGrowingAtSize[size]) {
                                    stop = true;
                                }
                            }
                        }

                        // Close the piece.
                        if (stop) {

                            if (size == 1) {
                                // This is provably impossible because this loop is never entered with size==1.
                            }
                            else if (size == 2) {

                                // With a vertical 2-cell group, attach to the right wall if adjacent.
                                let c = firstCell;
                                if (c.x == cols-1) {

                                    // select the top cell
                                    if (c.connect[UP]) {
                                        c = c.next[UP];
                                    }
                                    c.connect[RIGHT] = c.next[DOWN].connect[RIGHT] = true;
                                }
                                
                            }
                            else if (size == 3 || size == 4) {

                                // Try to extend group to have a long leg
                                if (longPieces < maxLongPieces && firstCell.x > 0 && Math.random() <= probExtendAtSize3or4) {
                                    let dirs = [];
                                    let dirsLength = 0;
                                    for (i=0; i<4; i++) {
                                        if (cell.connect[i] && isOpenCell(cell.next[i],i)) {
                                            dirs.push(i);
                                            dirsLength++;
                                        }
                                    }
                                    if (dirsLength > 0) {
                                        i = dirs[getRandomInt(0,dirsLength-1)];
                                        c = cell.next[i];
                                        connectCell(c,i);
                                        fillCell(c.next[i]);
                                        longPieces++;
                                    }
                                }
                            }

                            break;
                        }
                    }
                }
            }
            setResizeCandidates();
        };


        const setResizeCandidates = function() {
            let i;
            let c,q,c2,q2;
            let x,y;
            for (i=0; i<rows*cols; i++) {
                c = cells[i];
                x = i % cols;
                y = Math.floor(i/cols);

                // determine if it has flexible height

                //
                // |_|
                //
                // or
                //  _
                // | |
                //
                q = c.connect;
                if ((c.x == 0 || !q[LEFT]) &&
                    (c.x == cols-1 || !q[RIGHT]) &&
                    q[UP] != q[DOWN]) {
                    c.isRaiseHeightCandidate = true;
                }

                //  _ _
                // |_ _|
                //
                c2 = c.next[RIGHT];
                if (c2 != undefined) {
                    q2 = c2.connect;
                    if (((c.x == 0 || !q[LEFT]) && !q[UP] && !q[DOWN]) &&
                        ((c2.x == cols-1 || !q2[RIGHT]) && !q2[UP] && !q2[DOWN])
                        ) {
                        c.isRaiseHeightCandidate = c2.isRaiseHeightCandidate = true;
                    }
                }

                // determine if it has flexible width

                // if cell is on the right edge with an opening to the right
                if (c.x == cols-1 && q[RIGHT]) {
                    c.isShrinkWidthCandidate = true;
                }

                //  _
                // |_
                // 
                // or
                //  _
                //  _|
                //
                if ((c.y == 0 || !q[UP]) &&
                    (c.y == rows-1 || !q[DOWN]) &&
                    q[LEFT] != q[RIGHT]) {
                    c.isShrinkWidthCandidate = true;
                }

            }
        };

        // Identify if a cell is the center of a cross.
        const cellIsCrossCenter = function(c) {
            return c.connect[UP] && c.connect[RIGHT] && c.connect[DOWN] && c.connect[LEFT];
        };

        const chooseNarrowCols = function() {

            const canShrinkWidth = function(x,y) {

                // Can cause no more tight turns.
                if (y==rows-1) {
                    return true;
                }

                // get the right-hand-side bound
                let x0;
                let c,c2;
                for (x0=x; x0<cols; x0++) {
                    c = cells[x0+y*cols];
                    c2 = c.next[DOWN]
                    if ((!c.connect[RIGHT] || cellIsCrossCenter(c)) &&
                        (!c2.connect[RIGHT] || cellIsCrossCenter(c2))) {
                        break;
                    }
                }

                // build candidate list
                let candidates = [];
                let numCandidates = 0;
                for (; c2; c2=c2.next[LEFT]) {
                    if (c2.isShrinkWidthCandidate) {
                        candidates.push(c2);
                        numCandidates++;
                    }

                    // cannot proceed further without causing irreconcilable tight turns
                    if ((!c2.connect[LEFT] || cellIsCrossCenter(c2)) &&
                        (!c2.next[UP].connect[LEFT] || cellIsCrossCenter(c2.next[UP]))) {
                        break;
                    }
                }
                shuffle(candidates);

                let i;
                for (i=0; i<numCandidates; i++) {
                    c2 = candidates[i];
                    if (canShrinkWidth(c2.x,c2.y)) {
                        c2.shrinkWidth = true;
                        narrowCols[c2.y] = c2.x;
                        return true;
                    }
                }

                return false;
            };

            let x;
            let c;
            for (x=cols-1; x>=0; x--) {
                c = cells[x];
                if (c.isShrinkWidthCandidate && canShrinkWidth(x,0)) {
                    c.shrinkWidth = true;
                    narrowCols[c.y] = c.x;
                    return true;
                }
            }

            return false;
        };

        const chooseTallRows = function() {

            const canRaiseHeight = function(x,y) {

                // Can cause no more tight turns.
                if (x==cols-1) {
                    return true;
                }

                // find the first cell below that will create too tight a turn on the right
                let y0;
                let c;
                let c2;
                for (y0=y; y0>=0; y0--) {
                    c = cells[x+y0*cols];
                    c2 = c.next[RIGHT]
                    if ((!c.connect[UP] || cellIsCrossCenter(c)) && 
                        (!c2.connect[UP] || cellIsCrossCenter(c2))) {
                        break;
                    }
                }

                // Proceed from the right cell upwards, looking for a cell that can be raised.
                let candidates = [];
                let numCandidates = 0;
                for (; c2; c2=c2.next[DOWN]) {
                    if (c2.isRaiseHeightCandidate) {
                        candidates.push(c2);
                        numCandidates++;
                    }

                    // cannot proceed further without causing irreconcilable tight turns
                    if ((!c2.connect[DOWN] || cellIsCrossCenter(c2)) &&
                        (!c2.next[LEFT].connect[DOWN] || cellIsCrossCenter(c2.next[LEFT]))) {
                        break;
                    }
                }
                shuffle(candidates);

                let i;
                for (i=0; i<numCandidates; i++) {
                    c2 = candidates[i];
                    if (canRaiseHeight(c2.x,c2.y)) {
                        c2.raiseHeight = true;
                        tallRows[c2.x] = c2.y;
                        return true;
                    }
                }

                return false;
            };

            // From the top left, examine cells below until hitting top of ghost house.
            // A raisable cell must be found before the ghost house.
            let c;
            for (y=0; y<3; y++) {
                c = cells[y*cols];
                if (c.isRaiseHeightCandidate && canRaiseHeight(0,y)) {
                    c.raiseHeight = true;
                    tallRows[c.x] = c.y;
                    return true;
                }
            }

            return false;
        };

        // This is a function to detect impurities in the map that have no heuristic implemented to avoid it yet in gen().
        const isDesirable = function() {

            // ensure a solid top right corner
            let c = cells[4];
            if (c.connect[UP] || c.connect[RIGHT]) {
                return false;
            }

            // ensure a solid bottom right corner
            c = cells[rows*cols-1];
            if (c.connect[DOWN] || c.connect[RIGHT]) {
                return false;
            }

            // ensure there are no two stacked/side-by-side 2-cell pieces.
            const isHori = function(x,y) {
                let q1 = cells[x+y*cols].connect;
                let q2 = cells[x+1+y*cols].connect;
                return !q1[UP] && !q1[DOWN] && (x==0 || !q1[LEFT]) && q1[RIGHT] && 
                       !q2[UP] && !q2[DOWN] && q2[LEFT] && !q2[RIGHT];
            };
            const isVert = function(x,y) {
                let q1 = cells[x+y*cols].connect;
                let q2 = cells[x+(y+1)*cols].connect;
                if (x==cols-1) {
                    // special case (we can consider two single cells as vertical at the right edge)
                    return !q1[LEFT] && !q1[UP] && !q1[DOWN] &&
                           !q2[LEFT] && !q2[UP] && !q2[DOWN];
                }
                return !q1[LEFT] && !q1[RIGHT] && !q1[UP] && q1[DOWN] && 
                       !q2[LEFT] && !q2[RIGHT] && q2[UP] && !q2[DOWN];
            };
            let x,y;
            let g;
            for (y=0; y<rows-1; y++) {
                for (x=0; x<cols-1; x++) {
                    if (isHori(x,y) && isHori(x,y+1) ||
                        isVert(x,y) && isVert(x+1,y)) {

                        // don't allow them in the middle because they'll be two large when reflected.
                        if (x==0) {
                            return false;
                        }

                        // Join the four cells to create a square.
                        cells[x+y*cols].connect[DOWN] = true;
                        cells[x+y*cols].connect[RIGHT] = true;
                        g = cells[x+y*cols].group;

                        cells[x+1+y*cols].connect[DOWN] = true;
                        cells[x+1+y*cols].connect[LEFT] = true;
                        cells[x+1+y*cols].group = g;

                        cells[x+(y+1)*cols].connect[UP] = true;
                        cells[x+(y+1)*cols].connect[RIGHT] = true;
                        cells[x+(y+1)*cols].group = g;

                        cells[x+1+(y+1)*cols].connect[UP] = true;
                        cells[x+1+(y+1)*cols].connect[LEFT] = true;
                        cells[x+1+(y+1)*cols].group = g;
                    }
                }
            }

            if (!chooseTallRows()) {
                return false;
            }

            if (!chooseNarrowCols()) {
                return false;
            }

            return true;
        };

        // set the final position and size of each cell when upscaling the simple model to actual size
        const setUpScaleCoords = function() {
            let i,c;
            for (i=0; i<rows*cols; i++) {
                c = cells[i];
                c.final_x = c.x*3;
                if (narrowCols[c.y] < c.x) {
                    c.final_x--;
                }
                c.final_y = c.y*3;
                if (tallRows[c.x] < c.y) {
                    c.final_y++;
                }
                c.final_w = c.shrinkWidth ? 2 : 3;
                c.final_h = c.raiseHeight ? 4 : 3;
            }
        };

        const reassignGroup = function(oldg,newg) {
            let i;
            let c;
            for (i=0; i<rows*cols; i++) {
                c = cells[i];
                if (c.group == oldg) {
                    c.group = newg;
                }
            }
        };

        const createTunnels = function() {

            // declare candidates
            let singleDeadEndCells = [];
            let topSingleDeadEndCells = [];
            let botSingleDeadEndCells = [];

            let voidTunnelCells = [];
            let topVoidTunnelCells = [];
            let botVoidTunnelCells = [];

            let edgeTunnelCells = [];
            let topEdgeTunnelCells = [];
            let botEdgeTunnelCells = [];

            let doubleDeadEndCells = [];

            let numTunnelsCreated = 0;

            // prepare candidates
            let y;
            let c;
            let upDead;
            let downDead;
            for (y=0; y<rows; y++) {
                c = cells[cols-1+y*cols];
                if (c.connect[UP]) {
                    continue;
                }
                if (c.y > 1 && c.y < rows-2) {
                    c.isEdgeTunnelCandidate = true;
                    edgeTunnelCells.push(c);
                    if (c.y <= 2) {
                        topEdgeTunnelCells.push(c);
                    }
                    else if (c.y >= 5) {
                        botEdgeTunnelCells.push(c);
                    }
                }
                upDead = (!c.next[UP] || c.next[UP].connect[RIGHT]);
                downDead = (!c.next[DOWN] || c.next[DOWN].connect[RIGHT]);
                if (c.connect[RIGHT]) {
                    if (upDead) {
                        c.isVoidTunnelCandidate = true;
                        voidTunnelCells.push(c);
                        if (c.y <= 2) {
                            topVoidTunnelCells.push(c);
                        }
                        else if (c.y >= 6) {
                            botVoidTunnelCells.push(c);
                        }
                    }
                }
                else {
                    if (c.connect[DOWN]) {
                        continue;
                    }
                    if (upDead != downDead) {
                        if (!c.raiseHeight && y < rows-1 && !c.next[LEFT].connect[LEFT]) {
                            singleDeadEndCells.push(c);
                            c.isSingleDeadEndCandidate = true;
                            c.singleDeadEndDir = upDead ? UP : DOWN;
                            let offset = upDead ? 1 : 0;
                            if (c.y <= 1+offset) {
                                topSingleDeadEndCells.push(c);
                            }
                            else if (c.y >= 5+offset) {
                                botSingleDeadEndCells.push(c);
                            }
                        }
                    }
                    else if (upDead && downDead) {
                        if (y > 0 && y < rows-1) {
                            if (c.next[LEFT].connect[UP] && c.next[LEFT].connect[DOWN]) {
                                c.isDoubleDeadEndCandidate = true;
                                if (c.y >= 2 && c.y <= 5) {
                                    doubleDeadEndCells.push(c);
                                }
                            }
                        }
                    }
                }
            }

            // choose tunnels from candidates
            let numTunnelsDesired = Math.random() <= 0.45 ? 2 : 1;

            const selectSingleDeadEnd = function(c) {
                c.connect[RIGHT] = true;
                if (c.singleDeadEndDir == UP) {
                    c.topTunnel = true;
                }
                else {
                    c.next[DOWN].topTunnel = true;
                }
            };
            if (numTunnelsDesired == 1) {
                if (c = randomElement(voidTunnelCells)) {
                    c.topTunnel = true;
                }
                else if (c = randomElement(singleDeadEndCells)) {
                    selectSingleDeadEnd(c);
                }
                else if (c = randomElement(edgeTunnelCells)) {
                    c.topTunnel = true;
                }
                else {
                    return false;
                }
            }
            else if (numTunnelsDesired == 2) {
                if (c = randomElement(doubleDeadEndCells)) {
                    c.connect[RIGHT] = true;
                    c.topTunnel = true;
                    c.next[DOWN].topTunnel = true;
                }
                else {
                    numTunnelsCreated = 1;
                    if (c = randomElement(topVoidTunnelCells)) {
                        c.topTunnel = true;
                    }
                    else if (c = randomElement(topSingleDeadEndCells)) {
                        selectSingleDeadEnd(c);
                    }
                    else if (c = randomElement(topEdgeTunnelCells)) {
                        c.topTunnel = true;
                    }
                    else {
                        // could not find a top tunnel opening
                        numTunnelsCreated = 0;
                    }

                    if (c = randomElement(botVoidTunnelCells)) {
                        c.topTunnel = true;
                    }
                    else if (c = randomElement(botSingleDeadEndCells)) {
                        selectSingleDeadEnd(c);
                    }
                    else if (c = randomElement(botEdgeTunnelCells)) {
                        c.topTunnel = true;
                    }
                    else {
                        // could not find a bottom tunnel opening
                        if (numTunnelsCreated == 0) {
                            return false;
                        }
                    }
                }
            }

            // don't allow a horizontal path to cut straight through a map (through tunnels)
            let exit,topy;
            for (y=0; y<rows; y++) {
                c = cells[cols-1+y*cols];
                if (c.topTunnel) {
                    exit = true;
                    topy = c.final_y;
                    while (c.next[LEFT]) {
                        c = c.next[LEFT];
                        if (!c.connect[UP] && c.final_y == topy) {
                            continue;
                        }
                        else {
                            exit = false;
                            break;
                        }
                    }
                    if (exit) {
                        return false;
                    }
                }
            }

            // clear unused void tunnels (dead ends)
            let len = voidTunnelCells.length;
            let i;

            const replaceGroup = function(oldg,newg) {
                let i,c;
                for (i=0; i<rows*cols; i++) {
                    c = cells[i];
                    if (c.group == oldg) {
                        c.group = newg;
                    }
                }
            };
            for (i=0; i<len; i++) {
                c = voidTunnelCells[i];
                if (!c.topTunnel) {
                    replaceGroup(c.group, c.next[UP].group);
                    c.connect[UP] = true;
                    c.next[UP].connect[DOWN] = true;
                }
            }

            return true;
        };

        const joinWalls = function() {

            // randomly join wall pieces to the boundary to increase difficulty

            let x,y;
            let c;

            // join cells to the top boundary
            for (x=0; x<cols; x++) {
                c = cells[x];
                if (!c.connect[LEFT] && !c.connect[RIGHT] && !c.connect[UP] &&
                    (!c.connect[DOWN] || !c.next[DOWN].connect[DOWN])) {

                    // ensure it will not create a dead-end
                    if ((!c.next[LEFT] || !c.next[LEFT].connect[UP]) &&
                        (c.next[RIGHT] && !c.next[RIGHT].connect[UP])) {

                        // prevent connecting very large piece
                        if (!(c.next[DOWN] && c.next[DOWN].connect[RIGHT] && c.next[DOWN].next[RIGHT].connect[RIGHT])) {
                            c.isJoinCandidate = true;
                            if (Math.random() <= 0.25) {
                                c.connect[UP] = true;
                            }
                        }
                    }
                }
            }

            // join cells to the bottom boundary
            for (x=0; x<cols; x++) {
                c = cells[x+(rows-1)*cols];
                if (!c.connect[LEFT] && !c.connect[RIGHT] && !c.connect[DOWN] &&
                    (!c.connect[UP] || !c.next[UP].connect[UP])) {

                    // ensure it will not creat a dead-end
                    if ((!c.next[LEFT] || !c.next[LEFT].connect[DOWN]) &&
                        (c.next[RIGHT] && !c.next[RIGHT].connect[DOWN])) {

                        // prevent connecting very large piece
                        if (!(c.next[UP] && c.next[UP].connect[RIGHT] && c.next[UP].next[RIGHT].connect[RIGHT])) {
                            c.isJoinCandidate = true;
                            if (Math.random() <= 0.25) {
                                c.connect[DOWN] = true;
                            }
                        }
                    }
                }
            }

            // join cells to the right boundary
            let c2;
            for (y=1; y<rows-1; y++) {
                c = cells[cols-1+y*cols];
                if (c.raiseHeight) {
                    continue;
                }
                if (!c.connect[RIGHT] && !c.connect[UP] && !c.connect[DOWN] &&
                    !c.next[UP].connect[RIGHT] && !c.next[DOWN].connect[RIGHT]) {
                    if (c.connect[LEFT]) {
                        c2 = c.next[LEFT];
                        if (!c2.connect[UP] && !c2.connect[DOWN] && !c2.connect[LEFT]) {
                            c.isJoinCandidate = true;
                            if (Math.random() <= 0.5) {
                                c.connect[RIGHT] = true;
                            }
                        }
                    }
                }
            }
        };

        // try to generate a valid map, and keep count of tries.
        let genCount = 0;
        while (true) {
            reset();
            gen();
            genCount++;
            if (!isDesirable()) {
                continue;
            }

            setUpScaleCoords();
            joinWalls();
            if (!createTunnels()) {
                continue;
            }

            break;
        }

    };

    // Transform the simple cells to a tile array used for creating the map.
    const getTiles = function() {

        let tiles = []; // each is a character indicating a wall(|), path(.), or blank(_).
        let tileCells = []; // maps each tile to a specific cell of our simple map
        let subrows = rows*3+1+3;
        let subcols = cols*3-1+2;

        let midcols = subcols-2;
        let fullcols = (subcols-2)*2;

        // getter and setter for tiles (ensures vertical symmetry axis)
        const setTile = function(x,y,v) {
            if (x<0 || x>subcols-1 || y<0 || y>subrows-1) {
                return;
            }
            x -= 2;
            tiles[midcols+x+y*fullcols] = v;
            tiles[midcols-1-x+y*fullcols] = v;
        };
        const getTile = function(x,y) {
            if (x<0 || x>subcols-1 || y<0 || y>subrows-1) {
                return undefined;
            }
            x -= 2;
            return tiles[midcols+x+y*fullcols];
        };

        // getter and setter for tile cells
        const setTileCell = function(x,y,cell) {
            if (x<0 || x>subcols-1 || y<0 || y>subrows-1) {
                return;
            }
            x -= 2;
            tileCells[x+y*subcols] = cell;
        };
        const getTileCell = function(x,y) {
            if (x<0 || x>subcols-1 || y<0 || y>subrows-1) {
                return undefined;
            }
            x -= 2;
            return tileCells[x+y*subcols];
        };

        // initialize tiles
        let i;
        for (i=0; i<subrows*fullcols; i++) {
            tiles.push('_');
        }
        for (i=0; i<subrows*subcols; i++) {
            tileCells.push(undefined);
        }

        // set tile cells
        let c;
        let x,y,w,h;
        let x0,y0;
        for (i=0; i<rows*cols; i++) {
            c = cells[i];
            for (x0=0; x0<c.final_w; x0++) {
                for (y0=0; y0<c.final_h; y0++) {
                    setTileCell(c.final_x+x0,c.final_y+1+y0,c);
                }
            }
        }

        // set path tiles
        let cl, cu;
        for (y=0; y<subrows; y++) {
            for (x=0; x<subcols; x++) {
                c = getTileCell(x,y); // cell
                cl = getTileCell(x-1,y); // left cell
                cu = getTileCell(x,y-1); // up cell

                if (c) {
                    // inside map
                    if (cl && c.group != cl.group || // at vertical boundary
                        cu && c.group != cu.group || // at horizontal boundary
                        !cu && !c.connect[UP]) { // at top boundary
                        setTile(x,y,'.');
                    }
                }
                else {
                    // outside map
                    if (cl && (!cl.connect[RIGHT] || getTile(x-1,y) == '.') || // at right boundary
                        cu && (!cu.connect[DOWN] || getTile(x,y-1) == '.')) { // at bottom boundary
                        setTile(x,y,'.');
                    }
                }

                // at corner connecting two paths
                if (getTile(x-1,y) == '.' && getTile(x,y-1) == '.' && getTile(x-1,y-1) == '_') {
                    setTile(x,y,'.');
                }
            }
        }

        // extend tunnels
        for (c=cells[cols-1]; c; c = c.next[DOWN]) {
            if (c.topTunnel) {
                y = c.final_y+1;
                setTile(subcols-1, y,'.');
                setTile(subcols-2, y,'.');
            }
        }

        // fill in walls
        for (y=0; y<subrows; y++) {
            for (x=0; x<subcols; x++) {
                // any blank tile that shares a vertex with a path tile should be a wall tile
                if (getTile(x,y) != '.' && (getTile(x-1,y) == '.' || getTile(x,y-1) == '.' || getTile(x+1,y) == '.' || getTile(x,y+1) == '.' ||
                    getTile(x-1,y-1) == '.' || getTile(x+1,y-1) == '.' || getTile(x+1,y+1) == '.' || getTile(x-1,y+1) == '.')) {
                    setTile(x,y,'|');
                }
            }
        }

        // create the ghost door
        setTile(2,12,'-');

        // set energizers
        const getTopEnergizerRange = function() {
            let miny;
            let maxy = subrows/2;
            let x = subcols-2;
            let y;
            for (y=2; y<maxy; y++) {
                if (getTile(x,y) == '.' && getTile(x,y+1) == '.') {
                    miny = y+1;
                    break;
                }
            }
            maxy = Math.min(maxy,miny+7);
            for (y=miny+1; y<maxy; y++) {
                if (getTile(x-1,y) == '.') {
                    maxy = y-1;
                    break;
                }
            }
            return {miny:miny, maxy:maxy};
        };
        const getBotEnergizerRange = function() {
            let miny = subrows/2;
            let maxy;
            let x = subcols-2;
            let y;
            for (y=subrows-3; y>=miny; y--) {
                if (getTile(x,y) == '.' && getTile(x,y+1) == '.') {
                    maxy = y;
                    break;
                }
            }
            miny = Math.max(miny,maxy-7);
            for (y=maxy-1; y>miny; y--) {
                if (getTile(x-1,y) == '.') {
                    miny = y+1;
                    break;
                }
            }
            return {miny:miny, maxy:maxy};
        };
        x = subcols-2;
        y = 0;
        let range;
        if (range = getTopEnergizerRange()) {
            y = getRandomInt(range.miny, range.maxy);
            setTile(x,y,'o');
        }
        if (range = getBotEnergizerRange()) {
            y = getRandomInt(range.miny, range.maxy);
            setTile(x,y,'o');
        }

        // erase pellets in the tunnels
        const eraseUntilIntersection = function(x,y) {
            let adj;
            while (true) {
                adj = [];
                if (getTile(x-1,y) == '.') {
                    adj.push({x:x-1,y:y});
                }
                if (getTile(x+1,y) == '.') {
                    adj.push({x:x+1,y:y});
                }
                if (getTile(x,y-1) == '.') {
                    adj.push({x:x,y:y-1});
                }
                if (getTile(x,y+1) == '.') {
                    adj.push({x:x,y:y+1});
                }
                if (adj.length == 1) {
                    setTile(x,y,' ');
                    x = adj[0].x;
                    y = adj[0].y;
                }
                else {
                    break;
                }
            }
        };
        x = subcols-1;
        for (y=0; y<subrows; y++) {
            if (getTile(x,y) == '.') {
                eraseUntilIntersection(x,y);
            }
        }

        // erase pellets on starting position
        setTile(1,subrows-8,' ');

        // erase pellets around the ghost house
        i=0
        j=0;
        y=0;
        for (i=0; i<7; i++) {

            // erase pellets from bottom of the ghost house proceeding down until
            // reaching a pellet tile that isn't surround by walls
            // on the left and right
            y = subrows-14;
            setTile(i, y, ' ');
            j = 1;
            while (getTile(i,y+j) == '.' &&
                    getTile(i-1,y+j) == '|' &&
                    getTile(i+1,y+j) == '|') {
                setTile(i,y+j,' ');
                j++;
            }

            // erase pellets from top of the ghost house proceeding up until
            // reaching a pellet tile that isn't surround by walls
            // on the left and right
            y = subrows-20;
            setTile(i, y, ' ');
            j = 1;
            while (getTile(i,y-j) == '.' &&
                    getTile(i-1,y-j) == '|' &&
                    getTile(i+1,y-j) == '|') {
                setTile(i,y-j,' ');
                j++;
            }
        }
        // erase pellets on the side of the ghost house
        for (i=0; i<7; i++) {

            // erase pellets from side of the ghost house proceeding right until
            // reaching a pellet tile that isn't surround by walls
            // on the top and bottom.
            x = 6;
            y = subrows-14-i;
            setTile(x, y, ' ');
            j = 1;
            while (getTile(x+j,y) == '.' &&
                    getTile(x+j,y-1) == '|' &&
                    getTile(x+j,y+1) == '|') {
                setTile(x+j,y,' ');
                j++;
            }
        }

        // return a tile string (3 empty lines on top and 2 on bottom)
        return (
            "____________________________" +
            "____________________________" +
            "____________________________" +
            tiles.join("") +
            "____________________________" +
            "____________________________");
    };

    const randomColor = function() {
        return '#'+('00000'+(Math.random()*(1<<24)|0).toString(16)).slice(-6);
    };

    // dijkstra's algorithm to find shortest path to all tiles from (x0,y0)
    // we also remove (destroyX,destroyY) from the map to try to constrain the path
    // from going a certain way from the start.
    // (We created this because the ghost's minimum distance direction is not always sufficient in procedural maps)
    const getShortestDistGraph = function(map,x0,y0,isNodeTile) {

        // build graph
        let graph = {};
        let x,y,i,j;
        for (y=0; y<36; y++) {
            for (x=0; x<28; x++) {
                if (isNodeTile(x,y)) {
                    i = x+y*28;
                    graph[i] = {'x':x, 'y':y, 'dist':Infinity, 'penult':undefined, 'neighbors':[], 'completed':false};
                    if (isNodeTile(x-1,y)) {
                        j = i-1;
                        graph[i].neighbors.push(graph[j]);
                        graph[j].neighbors.push(graph[i]);
                    }
                    if (isNodeTile(x,y-1)) {
                        j = i-28;
                        graph[i].neighbors.push(graph[j]);
                        graph[j].neighbors.push(graph[i]);
                    }
                }
            }
        }

        let node = graph[x0+y0*28];
        node.completed = true;
        node.dist = 0;
        let d;
        let next_node,min_dist,dist;
        while (true) {

            // update distances of current node's neighbors
            for (i=0; i<4; i++) {
                d = node.neighbors[i];
                if (d && !d.completed) {
                    dist = node.dist+1;
                    if (dist == d.dist) {
                        if (Math.random() < 0.5) {
                            d.penult = node;
                        }
                    }
                    else if (dist < d.dist) {
                        d.dist = dist;
                        d.penult = node;
                    }
                }
            }

            // find next node to process (closest fringe node)
            next_node = undefined;
            min_dist = Infinity;
            for (i=0; i<28*36; i++) {
                d = graph[i];
                if (d && !d.completed) {
                    if (d.dist < min_dist) { 
                        next_node = d;
                        min_dist = d.dist;
                    }
                }
            }

            if (!next_node) {
                break;
            }

            node = next_node;
            node.completed = true;
        }

        return graph;
    };

    // retrieves the direction enum from a node's penultimate node to itself.
    const getDirFromPenult = function(node) {
        if (!node.penult) {
            return undefined;
        }
        let dx = node.x - node.penult.x;
        let dy = node.y - node.penult.y;
        if (dy == -1) {
            return DIR_UP;
        }
        else if (dy == 1) {
            return DIR_DOWN;
        }
        else if (dx == -1) {
            return DIR_LEFT;
        }
        else if (dx == 1) {
            return DIR_RIGHT;
        }
    };

    // sometimes the ghosts can get stuck in loops when trying to return home
    // so we build a path from all tiles to the ghost door tile
    const makeExitPaths = function(map) {
        const isNodeTile = function(x,y) {
            if (x<0 || x>=28 || y<0 || y>=36) {
                return false;
            }
            return map.isFloorTile(x,y);
        };
        let graph = getShortestDistGraph(map,map.doorTile.x,map.doorTile.y,isNodeTile);

        // give the map a function that tells the ghost which direction to go to return home
        map.getExitDir = function(x,y) {
            if (x<0 || x>=28 || y<0 || y>=36) {
                return undefined;
            }
            let node = graph[x+y*28];
            let dirEnum = getDirFromPenult(node);
            if (dirEnum != undefined) {
                return rotateAboutFace(dirEnum); // reverse direction (door->ghost to door<-ghost)
            }
        };
    };

    // add fruit paths to a map
    const makeFruitPaths = (function(){
        const reversed = {
            'v':'^',
            '^':'v',
            '<':'>',
            '>':'<',
        };
        const reversePath = function(path) {
            let rpath = "";
            let i;
            for (i=path.length-1; i>=0; i--) {
                rpath += reversed[path[i]];
            }
            return rpath;
        };

        let dirChars = {};
        dirChars[DIR_UP] = '^';
        dirChars[DIR_DOWN] = 'v';
        dirChars[DIR_LEFT] = '<';
        dirChars[DIR_RIGHT] = '>';

        const getPathFromGraph = function(graph,x0,y0,x1,y1,reverse) {
            // from (x0,y0) to (x1,y1)
            let start_node = graph[x0+y0*28];
            let dx,dy;
            let path = "";
            let node;
            for (node=graph[x1+y1*28]; node!=start_node; node=node.penult) {
                path = dirChars[getDirFromPenult(node)] + path;
            }
            return reverse ? reversePath(path) : path;
        }

        return function(map) {

            paths = {entrances:[], exits:[]};

            const isFloorTile = function(x,y) {
                if (x<0 || x>=28 || y<0 || y>=36) {
                    return false
                }
                return map.isFloorTile(x,y);
            };

            enter_graph = getShortestDistGraph(map,15,20, function(x,y) { return (x==14 && y==20) ? false : isFloorTile(x,y); });
            exit_graph =  getShortestDistGraph(map,16,20, function(x,y) { return (x==17 && y==20) ? false : isFloorTile(x,y); });

            // start at (15,20)
            for (y=0; y<36; y++) {
                if (map.isFloorTile(-1,y)) {

                    // left entrance
                    paths.entrances.push({
                        'start': {'y':y*8+4, 'x': -4},
                        'path': '>'+getPathFromGraph(enter_graph, 15,20, 0,y, true)});

                    // right entrance
                    paths.entrances.push({
                        'start': {'y':y*8+4, 'x': 28*8+4},
                        'path': '<'+getPathFromGraph(enter_graph, 15,20, 27,y, true)});

                    // left exit
                    paths.exits.push({
                        'start': {'y':y*8+4, 'x': -4},
                        'path': getPathFromGraph(exit_graph, 16,20, 0,y, false)+'<'});

                    // right exit
                    paths.exits.push({
                        'start': {'y':y*8+4, 'x': 28*8+4},
                        'path': getPathFromGraph(exit_graph, 16,20, 27,y, false)+'>'});
                }
            }

            map.fruitPaths = paths;
        };
    })();

    return function() {
        genRandom();
        let map = new Map(28,36,getTiles());

        makeFruitPaths(map);
        makeExitPaths(map);

        map.name = "Random Map";
        map.wallFillColor = randomColor();
        map.wallStrokeColor = rgbString(hslToRgb(Math.random(), Math.random(), Math.random() * 0.4 + 0.6));
        map.pelletColor = "#ffb8ae";

        return map;
    };
})();
