const DEBUG = false;
const DRAW_GRID_COORDS = false; // Useful for level design
const DISABLE_FINISH = false;

const STAR_STEP_FACTOR = 3; // minMoves * this for less stars
const FINISH_FILL_COLOR = "#4E7AC7"; // Fill the solution path with this color

class Game {

  constructor(svgGameElem) {
    // Svg Game
    this.svgGameElem = svgGameElem;
    this.s = Snap(this.svgGameElem);

    this.levels = levels.concat(test_levels) // Append test levels after normal ones

    // Get the highest finished level
    if (localStorage.getItem("highestFinishedLevel") === null) {
      this.highestFinishedLevel = 0;
      localStorage.setItem("highestFinishedLevel", this.highestFinishedLevel);
    } else {
      this.highestFinishedLevel = parseInt(localStorage.getItem("highestFinishedLevel"));
    }

    // Get the current level
    if (localStorage.getItem("currentLevel") === null) {
      howToPlayDialogElem.style.display = "block"; // Show the how to play dialog for the first time
      this.currentLevel = 1;
      localStorage.setItem("currentLevel", this.currentLevel);
    } else {
      this.currentLevel = parseInt(localStorage.getItem("currentLevel"));
    }

    this.levelNumber = this.currentLevel - 1; // Level number, 0 indexed

    // 0=Instant, 1=Fast, 2=Bounce
    if (localStorage.getItem("moveAnimation") === null) {
      this.moveAnimation = (isMobile ? 0 : 2);
      localStorage.setItem("moveAnimation", this.moveAnimation)
    } else {
      this.moveAnimation = parseInt(localStorage.getItem("moveAnimation"));
    }

    this.loadLevelData(); // And create the level
  }

  /**
   * Controls
   */

  nextLevel() {
    if ((this.levelNumber < this.levels.length-1 && this.levelNumber < this.highestFinishedLevel) || DEBUG) {
      this.levelNumber++;
      this.loadLevelData();
    }
  }

  prevLevel() {
    if (this.levelNumber > 0) {
      this.levelNumber--;
      this.loadLevelData();
    }
  }

  reloadLevel() {
    this.loadLevelData();
  }

  /**
   * Create shared defs for later use.
   */
  createDefs() {
    // Patterns
    this.striped = this.s.path("M10-5-10,15M15,0,0,15M0-5-20,15").attr({
      stroke: "rgba(255,211,147,0.85)",
      strokeWidth: 5
    }).pattern(0, 0, 10, 10);
  }

  /**
   * Setup a new level
   */
  clearLevel() {
    this.s.clear(); // Clear all svg elements
    this.createDefs(); // Create defs like shadow

    levelFinishDialogElem.style.display = "none"; // Hide finish banner

    this.levelFinished = false; // Is the level finished
    this.shapes = []; // List of all shapes
    this.activeShape = false; // The shape which is selected
    this.reactiveShapes = []; // Other shapes in shape group as active shape

    this.dragCount = 0;
    // Drag points source
    this.dragFromX = 0;
    this.dragFromY = 0;
    this.lastDir = ""; // Last direction

    this.futureGrid = []; // The game grid containing the next move
  }

  /**
   * Loads json level data
   */
  loadLevelData() {
    let that = this;
    let xhr = new XMLHttpRequest();
    xhr.responseType = "json";
    xhr.onload = function(e) {
      that.levelData = xhr.response;
      that.clearLevel();
      that.createLevel();
    };
    xhr.open("get", "levels/" + this.levels[this.levelNumber].f, true);
    xhr.send();
  }

  /**
   * Create the level from the data
   */
  createLevel() {
    this.currentLevel = this.levelNumber + 1;
    localStorage.setItem("currentLevel", this.currentLevel);

    this.levelTitle = this.levelData.settings.title;
    this.minMoves = this.levelData.settings.minMoves;

    // Get level grid dimensions
    this.gridWidth = this.levelData.settings.gridWidth;
    this.gridHeight = this.levelData.settings.gridHeight;

    let screenWidth = window.innerWidth;
    let maxGameHeight = window.innerHeight - headerElem.offsetHeight - footerElem.offsetHeight - statusElem.offsetHeight;

    // Adjust the svg element dimensions accordingly
    this.cellSize = Math.floor(screenWidth / this.gridWidth);

    // Check height
    if (this.cellSize * this.gridHeight > maxGameHeight)
      this.cellSize = Math.floor(maxGameHeight / this.gridHeight);

    this.gameWidth = this.cellSize * this.gridWidth;
    this.gameHeight = this.cellSize * this.gridHeight;
    this.svgGameElem.style.width = this.gameWidth + "px";
    this.svgGameElem.style.height = this.gameHeight + "px";

    headerElem.style.width = this.svgGameElem.style.width;

    this.updateStatus();
    this.updateHeader();
    this.drawGrid();

    // Create the internal game grid
    this.grid = new Array(this.gridHeight).fill(0);
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = new Array(this.gridWidth).fill(0);
    }

    // Seen grid is used to know if the game is finished
    // Create the internal game grid
    this.seenGrid = new Array(this.gridHeight).fill(false);
    for (let y = 0; y < this.gridHeight; y++) {
      this.seenGrid[y] = new Array(this.gridWidth).fill(false);
    }

    let shapeId = 1;
    for (let i = 0; i < this.levelData.elements.length; i++) {
      for (let j = 0; j < this.levelData.elements[i].shapes.length; j++) {
        // Loop through all the related shapes
        let shape = new Shape(
          shapeId++, // shapeId
          i + 1, // groupId
          this.levelData.elements[i].shapes[j], // shapeData
          this.levelData.elements[i].attr // attr
        );
        this.shapes.push(shape);
      }

    }

    // Add the checkpoints
    this.gameCheckpoints = this.levelData.settings.checkpoints;
    this.checkpointShapeGroup = this.s.g();

    let quarterCellSize = Math.floor(this.cellSize / 4);

    for (let checkpoint of this.gameCheckpoints) {
      let shape = this.s.circle(
        checkpoint.x * this.cellSize + quarterCellSize * 2,
        checkpoint.y * this.cellSize + quarterCellSize * 2,
        quarterCellSize
      );
      this.checkpointShapeGroup.add(shape);
    }
    this.checkpointShapeGroup.attr({
      fill: FINISH_FILL_COLOR,
      stroke: "white",
      strokeWidth: 3,
      strokeOpacity: 0.5
    });

    // Show navigation
    if (this.levelNumber > 0 || DEBUG)
      prevLevelElem.style.opacity = 1;
    if (this.levelNumber < this.levels.length-1 && this.highestFinishedLevel > this.levelNumber || DEBUG)
      nextLevelElem.style.opacity = 1;

    if (DRAW_GRID_COORDS)
      this.drawGridCoords();

    if (DEBUG) {
      console.log(this.levels[this.levelNumber].f)
      console.log("minMoves:" + this.minMoves + " Next step:" +  this.minMoves * STAR_STEP_FACTOR)
    }

  }

  clearSeenGrid() {
    for (let y = 0; y < this.gridHeight; y++)
      for (let x = 0; x < this.gridWidth; x++)
        this.seenGrid[y][x] = false;
  }

  /*
   * Check if player has found a solution
   */
  checkFinish(x, y, finished) {
    if (DISABLE_FINISH)
      return false; // Skip checking for finish

    if (finished || this.grid[y][x] === 0 || this.seenGrid[y][x] === true)
      return finished; // Found a solution, alreay seen the cell or the cell is empty
    else
      this.seenGrid[y][x] = true; // Mark this cell as seen

    if (this.grid[y][x] !== null && this.gameCheckpoints[1].x == x && this.gameCheckpoints[1].y == y) {
      this.getShapeAtPos(x, y).shape.attr({
        fill: FINISH_FILL_COLOR
      });
      return true; // Finish was found
    }

    // Check all directions
    if (x < this.gridWidth - 1)
      finished = this.checkFinish(x + 1, y, finished); // Right
    if (x > 0)
      finished = this.checkFinish(x - 1, y, finished); // Left
    if (y > 0)
      finished = this.checkFinish(x, y - 1, finished); // Up
    if (y < this.gridHeight - 1)
      finished = this.checkFinish(x, y + 1, finished); // Down

    if (finished === true) {
      this.getShapeAtPos(x, y).shape.attr({
        fill: FINISH_FILL_COLOR
      });

    }

    return finished;
  }


  /**
   * Draws x,y coordinates for the grid
   */
  drawGridCoords() {
    let coords = this.s.g();
    // group lines and apply
    for (let y = 0; y <= this.gridHeight; y++) {
      for (let x = 0; x <= this.gridWidth; x++) {
        // Draw cell on the grid
        coords.add(this.s.text(x * this.cellSize + 5, (y + 1) * this.cellSize - 5, x + "," + y));
      }
    }

    coords.attr({
      fill: "#0000ff",
      opacity: 0.5,
      "font-size": "18px",
      "cursor": "default"
    });
  }


  /**
   * Draws a grid
   */
  drawGrid() {
    let visibleGrid = this.s.g();
    // group lines and apply
    for (let x = 0; x <= this.gridWidth; x++) {
      visibleGrid.add(this.s.line(x * this.cellSize, 0, x * this.cellSize, this.gameHeight));
    }

    for (let y = 0; y <= this.gridHeight; y++) {
      visibleGrid.add(this.s.line(0, y * this.cellSize, this.gameWidth, y * this.cellSize));
    }

    visibleGrid.attr({
      stroke: "#fff",
      opacity: 0.25
    });
  }

  getShapeById(shapeId) {
    for (let shape of this.shapes)
      if (shape.shapeId == shapeId)
        return shape;

    return false;
  }

  getShapeAtPos(x, y) {
    let gridCell = this.grid[y][x];
    if (gridCell !== 0)
      return this.getShapeById(gridCell.shapeId);
    else
      return false;
  }

  getGameGridPos(x, y) {
    let pos = {};
    pos.x = Math.floor(x / this.cellSize);
    pos.y = Math.floor(y / this.cellSize);
    return pos;
  }

  getReactiveShapes(groupId, excludeShapeId) {
    let reactiveShapes = [];
    for (let shape of this.shapes)
      if (shape.shapeId != excludeShapeId && shape.groupId == groupId)
        reactiveShapes.push(shape);

    return reactiveShapes;
  }

  setAttrForActiveGroup(attr) {
    this.activeShape.shape.attr(attr);

    for (let shape of this.reactiveShapes)
      shape.shape.attr(attr);
  }

  startDrag(x, y) {
    if (this.levelFinished)
      return;

    let pos = this.getGameGridPos(x, y);
    this.activeShape = this.getShapeAtPos(pos.x, pos.y);

    // Player can only move active shapes
    if (this.activeShape && this.activeShape.attr.type != "active") {
      this.activeShape = false;
      return;
    }

    this.reactiveShapes = this.getReactiveShapes(this.activeShape.groupId, this.activeShape.shapeId);

    if (this.activeShape) {

      this.setAttrForActiveGroup({
        fill: this.activeShape.attr.actCol
      });

      this.dragFromX = x;
      this.dragFromY = y;
    }

  }

  onDrag(x, y) {
    if (!this.levelFinished && this.activeShape) {
      let deltaX, deltaY;
      let dir = this.lastDir;
      let moved = false;

      deltaX = Math.abs(this.dragFromX - x);
      deltaY = Math.abs(this.dragFromY - y);

      if (deltaX > deltaY) {
        if (this.dragFromX > x)
          dir = "L";
        else if (this.dragFromX < x)
          dir = "R";
      } else {
        if (this.dragFromY > y)
          dir = "U";
        else if (this.dragFromY < y)
          dir = "D";
      }

      let dragFactor = (dir == this.lastDir ? 1 : 0.5);

      if (dir == "L" && deltaX > this.cellSize * dragFactor) {
        // Move left
        moved = this.activeShape.move(-1, 0, true);
      } else if (dir == "R" && deltaX > this.cellSize * dragFactor) {
        // Move right
        moved = this.activeShape.move(1, 0, true);
      } else if (dir == "U" && deltaY > this.cellSize * dragFactor) {
        // Move up
        moved = this.activeShape.move(0, -1, true);
      } else if (dir == "D" && deltaY > this.cellSize * dragFactor) {
        // Move down
        moved = this.activeShape.move(0, 1, true);
      }

      if (moved) {
        this.dragFromX = x;
        this.dragFromY = y;
        this.lastDir = dir;
        this.dragCount++;

        this.updateStatus();

        this.setAttrForActiveGroup({
          opacity: 1
        }); // Show all shapes in group enabled

        // Is the level finished
        this.clearSeenGrid();
        this.levelFinished = this.checkFinish(this.gameCheckpoints[0].x, this.gameCheckpoints[0].y, false);

        if (this.levelFinished) {
          this.checkpointShapeGroup.attr({
            fill: "#ffffff"
          });

          game.s.selectAll("#icon").attr({
            opacity: 0.5
            // display: "none"
          });

          // If this level is your new record
          if (this.levelNumber < this.levels.length-1 && this.levelNumber == this.highestFinishedLevel) {
            this.highestFinishedLevel++;
            localStorage.setItem("highestFinishedLevel", this.highestFinishedLevel);
          }

          if (this.levelNumber < this.levels.length-1) {
            nextLevelElem.style.opacity = 1; // Show next level arrow
            moreLevelsElem.style.display = "inline-block"; // Also link in finish dialog
          } else
            moreLevelsElem.style.display = "none";

          // Display the level finish banner
          let starCount = 1; // Everybody get one star
          if (this.minMoves * STAR_STEP_FACTOR >= this.dragCount)
            starCount = 2;
          if (this.minMoves >= this.dragCount)
            starCount = 3;

          levelFinishMessageElem.textContent = levelFinishMessage[starCount - 1];

          levelFinishStarsElems[1].src = (starCount >= 2) ? "img/logo.svg" : "img/gray-x-logo.svg";
          levelFinishStarsElems[2].src = (starCount >= 3) ? "img/logo.svg" : "img/gray-x-logo.svg";

          levelfinishMoveCountElem.textContent = this.dragCount;

          // Show msg if this was the last normal level
          if (this.levelNumber == levels.length - 1)
            noMoreLevelsElem.style.display = "block";
          else
            noMoreLevelsElem.style.display = "none";

          setTimeout(function() {
            levelFinishDialogElem.style.display = "block";
          }, 650); // Show the level finish dialog after 0.65 second

        } // End level finished

      }

    }

  }

  endDrag() {
    if (this.activeShape) {

      if (!this.levelFinished)
        this.setAttrForActiveGroup({
          opacity: 1,
          stroke: "#ffffff",
          fill: this.activeShape.attr.col
        }); // Reset shape in group

      this.activeShape = false;
      this.reactiveShapes = [];
    }
  }

  updateStatus() {
    statusElem.textContent = "moves " + this.dragCount;
    statusElem.style.opacity = 1;
  }

  updateHeader() {
    let caption = 'Level ' + (this.levelNumber + 1) + '<span>(' + this.levelTitle.toLowerCase() + ')</span>';
    levelTitleElem.innerHTML = caption;
    headerElem.style.opacity = 1; // Unhide header
  }


}
