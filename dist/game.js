"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEBUG = false;
var DRAW_GRID_COORDS = false; // Useful for level design
var DISABLE_FINISH = false;

var STAR_STEP_FACTOR = 3; // minMoves * this for less stars
var FINISH_FILL_COLOR = "#4E7AC7"; // Fill the solution path with this color

var Game = function () {
  function Game(svgGameElem) {
    _classCallCheck(this, Game);

    // Svg Game
    this.svgGameElem = svgGameElem;
    this.s = Snap(this.svgGameElem);

    this.levels = levels.concat(test_levels); // Append test levels after normal ones

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
      this.moveAnimation = isMobile ? 0 : 2;
      localStorage.setItem("moveAnimation", this.moveAnimation);
    } else {
      this.moveAnimation = parseInt(localStorage.getItem("moveAnimation"));
    }

    this.loadLevelData(); // And create the level
  }

  /**
   * Controls
   */

  _createClass(Game, [{
    key: "nextLevel",
    value: function nextLevel() {
      if (this.levelNumber < this.levels.length - 1 && this.levelNumber < this.highestFinishedLevel || DEBUG) {
        this.levelNumber++;
        this.loadLevelData();
      }
    }
  }, {
    key: "prevLevel",
    value: function prevLevel() {
      if (this.levelNumber > 0) {
        this.levelNumber--;
        this.loadLevelData();
      }
    }
  }, {
    key: "reloadLevel",
    value: function reloadLevel() {
      this.loadLevelData();
    }

    /**
     * Create shared defs for later use.
     */

  }, {
    key: "createDefs",
    value: function createDefs() {
      // Patterns
      this.striped = this.s.path("M10-5-10,15M15,0,0,15M0-5-20,15").attr({
        stroke: "rgba(255,211,147,0.85)",
        strokeWidth: 5
      }).pattern(0, 0, 10, 10);
    }

    /**
     * Setup a new level
     */

  }, {
    key: "clearLevel",
    value: function clearLevel() {
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

  }, {
    key: "loadLevelData",
    value: function loadLevelData() {
      var that = this;
      var xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onload = function (e) {
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

  }, {
    key: "createLevel",
    value: function createLevel() {
      this.currentLevel = this.levelNumber + 1;
      localStorage.setItem("currentLevel", this.currentLevel);

      this.levelTitle = this.levelData.settings.title;
      this.minMoves = this.levelData.settings.minMoves;

      // Get level grid dimensions
      this.gridWidth = this.levelData.settings.gridWidth;
      this.gridHeight = this.levelData.settings.gridHeight;

      var screenWidth = window.innerWidth;
      var maxGameHeight = window.innerHeight - headerElem.offsetHeight - footerElem.offsetHeight - statusElem.offsetHeight;

      // Adjust the svg element dimensions accordingly
      this.cellSize = Math.floor(screenWidth / this.gridWidth);

      // Check height
      if (this.cellSize * this.gridHeight > maxGameHeight) this.cellSize = Math.floor(maxGameHeight / this.gridHeight);

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
      for (var y = 0; y < this.gridHeight; y++) {
        this.grid[y] = new Array(this.gridWidth).fill(0);
      }

      // Seen grid is used to know if the game is finished
      // Create the internal game grid
      this.seenGrid = new Array(this.gridHeight).fill(false);
      for (var _y = 0; _y < this.gridHeight; _y++) {
        this.seenGrid[_y] = new Array(this.gridWidth).fill(false);
      }

      var shapeId = 1;
      for (var i = 0; i < this.levelData.elements.length; i++) {
        for (var j = 0; j < this.levelData.elements[i].shapes.length; j++) {
          // Loop through all the related shapes
          var shape = new Shape(shapeId++, // shapeId
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

      var quarterCellSize = Math.floor(this.cellSize / 4);

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.gameCheckpoints[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var checkpoint = _step.value;

          var _shape = this.s.circle(checkpoint.x * this.cellSize + quarterCellSize * 2, checkpoint.y * this.cellSize + quarterCellSize * 2, quarterCellSize);
          this.checkpointShapeGroup.add(_shape);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.checkpointShapeGroup.attr({
        fill: FINISH_FILL_COLOR,
        stroke: "white",
        strokeWidth: 3,
        strokeOpacity: 0.5
      });

      // Show navigation
      if (this.levelNumber > 0 || DEBUG) prevLevelElem.style.opacity = 1;
      if (this.levelNumber < this.levels.length - 1 && this.highestFinishedLevel > this.levelNumber || DEBUG) nextLevelElem.style.opacity = 1;

      if (DRAW_GRID_COORDS) this.drawGridCoords();

      if (DEBUG) {
        console.log(this.levels[this.levelNumber].f);
        console.log("minMoves:" + this.minMoves + " Next step:" + this.minMoves * STAR_STEP_FACTOR);
      }
    }
  }, {
    key: "clearSeenGrid",
    value: function clearSeenGrid() {
      for (var y = 0; y < this.gridHeight; y++) {
        for (var x = 0; x < this.gridWidth; x++) {
          this.seenGrid[y][x] = false;
        }
      }
    }

    /*
     * Check if player has found a solution
     */

  }, {
    key: "checkFinish",
    value: function checkFinish(x, y, finished) {
      if (DISABLE_FINISH) return false; // Skip checking for finish

      if (finished || this.grid[y][x] === 0 || this.seenGrid[y][x] === true) return finished; // Found a solution, alreay seen the cell or the cell is empty
      else this.seenGrid[y][x] = true; // Mark this cell as seen

      if (this.grid[y][x] !== null && this.gameCheckpoints[1].x == x && this.gameCheckpoints[1].y == y) {
        this.getShapeAtPos(x, y).shape.attr({
          fill: FINISH_FILL_COLOR
        });
        return true; // Finish was found
      }

      // Check all directions
      if (x < this.gridWidth - 1) finished = this.checkFinish(x + 1, y, finished); // Right
      if (x > 0) finished = this.checkFinish(x - 1, y, finished); // Left
      if (y > 0) finished = this.checkFinish(x, y - 1, finished); // Up
      if (y < this.gridHeight - 1) finished = this.checkFinish(x, y + 1, finished); // Down

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

  }, {
    key: "drawGridCoords",
    value: function drawGridCoords() {
      var coords = this.s.g();
      // group lines and apply
      for (var y = 0; y <= this.gridHeight; y++) {
        for (var x = 0; x <= this.gridWidth; x++) {
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

  }, {
    key: "drawGrid",
    value: function drawGrid() {
      var visibleGrid = this.s.g();
      // group lines and apply
      for (var x = 0; x <= this.gridWidth; x++) {
        visibleGrid.add(this.s.line(x * this.cellSize, 0, x * this.cellSize, this.gameHeight));
      }

      for (var y = 0; y <= this.gridHeight; y++) {
        visibleGrid.add(this.s.line(0, y * this.cellSize, this.gameWidth, y * this.cellSize));
      }

      visibleGrid.attr({
        stroke: "#fff",
        opacity: 0.25
      });
    }
  }, {
    key: "getShapeById",
    value: function getShapeById(shapeId) {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.shapes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var shape = _step2.value;

          if (shape.shapeId == shapeId) return shape;
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return false;
    }
  }, {
    key: "getShapeAtPos",
    value: function getShapeAtPos(x, y) {
      var gridCell = this.grid[y][x];
      if (gridCell !== 0) return this.getShapeById(gridCell.shapeId);else return false;
    }
  }, {
    key: "getGameGridPos",
    value: function getGameGridPos(x, y) {
      var pos = {};
      pos.x = Math.floor(x / this.cellSize);
      pos.y = Math.floor(y / this.cellSize);
      return pos;
    }
  }, {
    key: "getReactiveShapes",
    value: function getReactiveShapes(groupId, excludeShapeId) {
      var reactiveShapes = [];
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.shapes[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var shape = _step3.value;

          if (shape.shapeId != excludeShapeId && shape.groupId == groupId) reactiveShapes.push(shape);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      return reactiveShapes;
    }
  }, {
    key: "setAttrForActiveGroup",
    value: function setAttrForActiveGroup(attr) {
      this.activeShape.shape.attr(attr);

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = this.reactiveShapes[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var shape = _step4.value;

          shape.shape.attr(attr);
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    }
  }, {
    key: "startDrag",
    value: function startDrag(x, y) {
      if (this.levelFinished) return;

      var pos = this.getGameGridPos(x, y);
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
  }, {
    key: "onDrag",
    value: function onDrag(x, y) {
      if (!this.levelFinished && this.activeShape) {
        var deltaX = void 0,
            deltaY = void 0;
        var dir = this.lastDir;
        var moved = false;

        deltaX = Math.abs(this.dragFromX - x);
        deltaY = Math.abs(this.dragFromY - y);

        if (deltaX > deltaY) {
          if (this.dragFromX > x) dir = "L";else if (this.dragFromX < x) dir = "R";
        } else {
          if (this.dragFromY > y) dir = "U";else if (this.dragFromY < y) dir = "D";
        }

        var dragFactor = dir == this.lastDir ? 1 : 0.5;

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
            if (this.levelNumber < this.levels.length - 1 && this.levelNumber == this.highestFinishedLevel) {
              this.highestFinishedLevel++;
              localStorage.setItem("highestFinishedLevel", this.highestFinishedLevel);
            }

            if (this.levelNumber < this.levels.length - 1) {
              nextLevelElem.style.opacity = 1; // Show next level arrow
              moreLevelsElem.style.display = "inline-block"; // Also link in finish dialog
            } else moreLevelsElem.style.display = "none";

            // Display the level finish banner
            var starCount = 1; // Everybody get one star
            if (this.minMoves * STAR_STEP_FACTOR >= this.dragCount) starCount = 2;
            if (this.minMoves >= this.dragCount) starCount = 3;

            levelFinishMessageElem.textContent = levelFinishMessage[starCount - 1];

            levelFinishStarsElems[1].src = starCount >= 2 ? "img/logo.svg" : "img/gray-x-logo.svg";
            levelFinishStarsElems[2].src = starCount >= 3 ? "img/logo.svg" : "img/gray-x-logo.svg";

            levelfinishMoveCountElem.textContent = this.dragCount;

            // Show msg if this was the last normal level
            if (this.levelNumber == levels.length - 1) noMoreLevelsElem.style.display = "block";else noMoreLevelsElem.style.display = "none";

            setTimeout(function () {
              levelFinishDialogElem.style.display = "block";
            }, 650); // Show the level finish dialog after 0.65 second
          } // End level finished
        }
      }
    }
  }, {
    key: "endDrag",
    value: function endDrag() {
      if (this.activeShape) {

        if (!this.levelFinished) this.setAttrForActiveGroup({
          opacity: 1,
          stroke: "#ffffff",
          fill: this.activeShape.attr.col
        }); // Reset shape in group

        this.activeShape = false;
        this.reactiveShapes = [];
      }
    }
  }, {
    key: "updateStatus",
    value: function updateStatus() {
      statusElem.textContent = "moves " + this.dragCount;
      statusElem.style.opacity = 1;
    }
  }, {
    key: "updateHeader",
    value: function updateHeader() {
      var caption = 'Level ' + (this.levelNumber + 1) + '<span>(' + this.levelTitle.toLowerCase() + ')</span>';
      levelTitleElem.innerHTML = caption;
      headerElem.style.opacity = 1; // Unhide header
    }
  }]);

  return Game;
}();
//# sourceMappingURL=game.js.map