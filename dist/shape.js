"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Shape = function () {
  function Shape(shapeId, groupId, shapeData, attr) {
    _classCallCheck(this, Shape);

    this.shapeId = shapeId;
    this.groupId = groupId;
    this.shapeData = shapeData;
    this.attr = attr;
    if (this.attr.hasOwnProperty('col')) this.attr.actCol = this.colorLuminance(this.attr.col, 0.15); // Calculate active color

    this.shape = game.s.g();

    this.transFromOriginX = 0;
    this.transFromOriginY = 0;

    this.createShape();
  }

  /**
   * Calculate the increase or decrease in color luminance
   */


  _createClass(Shape, [{
    key: "colorLuminance",
    value: function colorLuminance(hex, lum) {
      if (hex.startsWith("#")) hex = hex.substr(1);

      var rgb = "#";
      var c = void 0;
      for (var i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
      }
      return rgb;
    }

    /**
     * Draw the icon indicating the shape's relation with the group
     */

  }, {
    key: "drawReactionIcon",
    value: function drawReactionIcon(x, y) {
      var icon = game.s.g();
      var factor = 0.75;
      var scale = game.cellSize / 120 * factor;

      //let topRightArrow = [10, 50, 110, 50, 95, 35];
      var topRightArrow = [95, 35, 110, 50, 10, 50]; // Revert
      var bottomLeftArrow = [110, 70, 10, 70, 25, 85];
      var bottomRightArrow = [10, 70, 110, 70, 95, 85];

      // let rightUpArrow = [70, 110, 70, 10, 85, 25];
      var rightUpArrow = [85, 25, 70, 10, 70, 110]; // Revert
      var leftDownArrow = [50, 10, 50, 110, 35, 95];
      var leftUpArrow = [50, 110, 50, 10, 35, 25];

      if (this.attr.react.hor === -1) {
        icon.add(game.s.polyline(topRightArrow));
        icon.add(game.s.polyline(bottomLeftArrow));
      } else {
        icon.add(game.s.polyline([].concat(topRightArrow, bottomRightArrow)));
      }

      if (this.attr.react.ver === -1) {
        icon.add(game.s.polyline(rightUpArrow));
        icon.add(game.s.polyline(leftDownArrow));
      } else {
        icon.add(game.s.polyline([].concat(rightUpArrow, leftUpArrow)));
      }

      var shift = game.cellSize * (1 - factor) / 2;

      icon.attr({
        id: "icon",
        stroke: "#ffffff",
        strokeWidth: 5,
        strokeOpacity: 1,
        fill: "none",
        transform: "translate(" + (x + shift) + ", " + (y + shift) + "), scale(" + scale + ")"
      });

      return icon;
    }

    /**
     * Trace the polygon for all the points in the shape.
     * Returns a tight convex hull.
     */

  }, {
    key: "createPolygon",
    value: function createPolygon(cornerPoints) {
      // Shorthand varibles
      var cs = game.cellSize; // Cell width and height are always the same

      // Prepare the point data
      var pointsObj = {};

      for (var _i = 0; _i < cornerPoints.length; _i++) {
        var key = cornerPoints[_i][0] + "_" + cornerPoints[_i][1];
        if (pointsObj[key]) {
          pointsObj[key]++;
        } else {
          pointsObj[key] = 1;
        }

        if (pointsObj[key] == 4) delete pointsObj[key]; // Remove internal points (which have four instances)
      }

      // Make a point set from point object (removes duplicates)
      var pointsSet = new Set(Object.keys(pointsObj).map(function (key) {
        return key;
      }));

      // Convert the set of strings into an array of numbers
      var points = [];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = pointsSet[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var value = _step.value;

          points.push(value.split("_").map(Number));
        } // Find the polygon points of the shape
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

      var polygonArray = [];
      var firstPoint = points[0];

      // Add the first point to polygon
      polygonArray.push(firstPoint);
      var lastAddedPoint = firstPoint;
      points.splice(0, 1); // Remove the first point

      // Does the points array contain this point
      function hasPoint(x, y) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = points[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var p = _step2.value;

            if (p[0] === x && p[1] === y) return true;
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

      // Helper function used inside the loop
      function addNextPolygonPoint(horDir, verDir) {
        var x = lastAddedPoint[0] + horDir * cs;
        var y = lastAddedPoint[1] + verDir * cs;

        if (firstPoint[0] === x && firstPoint[1] === y) {
          polygonDone = true;
          return true;
        }

        // Special case if direction is up
        // Do not go up if there is a cell on the left
        if (verDir === -1) {
          if (hasPoint(x - cs, y) && hasPoint(x - cs, y + cs)) return false;
        }

        for (var _i2 = 0; _i2 < points.length; _i2++) {
          if (x === points[_i2][0] && y === points[_i2][1]) {
            polygonArray.push(points[_i2]); // Next point
            lastAddedPoint = points[_i2];
            points.splice(_i2, 1); // Remove the added point
            return true; // Found and added
          }
        }
        return false; // Not found
      }

      var polygonDone = false;
      var i = 0; // Counter
      while (!polygonDone) {

        if (++i > 50) {
          if (points.length !== 0) console.log("Bad Shape! Points left.");
          console.log("Bad Shape! Max iterations of 50 reached.");
          polygonDone = true; // Just of safety. This should never happen with correct shapes!
        }

        // Above
        if (addNextPolygonPoint(0, -1)) continue;

        // Right
        if (addNextPolygonPoint(1, 0)) continue;

        // Below
        if (addNextPolygonPoint(0, 1)) continue;

        // Right
        if (addNextPolygonPoint(-1, 0)) continue;
      }

      /*
          // Debug. Draw the points and order
          for (let i = 0; i < polygonArray.length; i++) {
            let circle = game.s.circle(polygonArray[i][0], polygonArray[i][1], 4);
            circle.attr({
              fill: "red"
            });
            let text = game.s.text(polygonArray[i][0] + 5, polygonArray[i][1] - 5, i + 1);
          }
      */
      return polygonArray;
    }

    /**
     * Create the level from the data
     */

  }, {
    key: "createShape",
    value: function createShape() {
      // Shorthand varibles
      var cs = game.cellSize; // Cell width and height are always the same
      var px = this.shapeData.pos.x;
      var py = this.shapeData.pos.y;

      var firstCell = false;

      var cornerPoints = [];
      for (var y = 0; y < this.shapeData.grid.length; y++) {
        for (var x = 0; x < this.shapeData.grid[y].length; x++) {
          if (this.shapeData.grid[y][x] == 1) {

            if (!firstCell) {
              // Draw the type/reaction icon in the first cell (top left)
              firstCell = {
                "x": x * cs + px * cs,
                "y": y * cs + py * cs
              };
            }

            // Top left
            cornerPoints.push([x * cs + px * cs, y * cs + py * cs]);
            // Top right
            cornerPoints.push([x * cs + px * cs + cs, y * cs + py * cs]);
            // Bottom right
            cornerPoints.push([x * cs + px * cs + cs, y * cs + py * cs + cs]);
            // Bottom left
            cornerPoints.push([x * cs + px * cs, y * cs + py * cs + cs]);

            // Add cell to internal game grid
            game.grid[y + py][x + px] = {
              "groupId": this.groupId,
              "shapeId": this.shapeId,
              "type": this.attr.type
            };
          }
        }
      }

      var polygonArray = this.createPolygon(cornerPoints);
      var polygon = game.s.polygon(polygonArray);

      this.shape.add(polygon);

      if (this.attr.type == "static") this.shape.attr({
        stroke: "#ffffff",
        fill: game.striped
      });else if (this.attr.type == "active") this.shape.attr({
        stroke: "#ffffff",
        fill: this.attr.col
      });

      if (this.attr.type == "active") {
        this.shape.add(this.drawReactionIcon(firstCell.x, firstCell.y));
      }
    }

    /**
     * Simulate the move on the future game grid
     * @param {integer} horDir - Horizontal direction (-1,  0 or 1).
     * @param {integer} verDir - Vertical direction (-1,  0 or 1).
     * @return {boolean} The move was successful
     */

  }, {
    key: "simulateMove",
    value: function simulateMove(horDir, verDir) {
      // Store current shape position in grid and remove from futuregrid
      var futureShapeCells = [];
      for (var y = 0; y < game.gridHeight; y++) {
        for (var x = 0; x < game.gridWidth; x++) {
          if (game.futureGrid[y][x].shapeId == this.shapeId) {
            futureShapeCells.push({
              "x": x,
              "y": y
            });

            // Check if cell has another cell stash
            if (!game.futureGrid[y][x].hasOwnProperty("stash")) {
              game.futureGrid[y][x] = 0;
            } else {
              // Pop the stash in the cell into the futuregrid
              game.futureGrid[y][x] = {
                "groupId": game.futureGrid[y][x].stash.groupId,
                "shapeId": game.futureGrid[y][x].stash.shapeId
              };
              game.activeShape.stashCount--;
            }
          }
        }
      }

      // Try putting the shape in a new position on the futuregrid
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = futureShapeCells[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var shapeCell = _step3.value;


          var nextX = shapeCell.x + horDir;
          var nextY = shapeCell.y + verDir;

          if (nextX < 0 || nextX >= game.gridWidth || nextY < 0 || nextY >= game.gridHeight) return false; // Cell is out of bounds

          if (game.futureGrid[nextY][nextX] === 0) {
            game.futureGrid[nextY][nextX] = {
              "groupId": this.groupId,
              "shapeId": this.shapeId
            };
          } else if (game.futureGrid[nextY][nextX].groupId === this.groupId && (horDir !== 0 && this.attr.react.hor === 1 || verDir !== 0 && this.attr.react.ver === 1)) {
            // If collision with own shape group, stash the cell in current position
            // Only if shape is not going in opposite direction
            game.futureGrid[nextY][nextX].stash = {
              "groupId": this.groupId,
              "shapeId": this.shapeId
            };
            game.activeShape.stashCount++;
            // Allow the move for now. Stash should be empty at the end of the movement simulation
          } else {
            var shape = game.getShapeAtPos(nextX, nextY);
            if (shape) this.highlightObstacle(shape.shape);else this.highlightObstacle(this.shape);

            return false; // Shape can not be moved to this position on the future grid
          }
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

      return true; // Shape was successfully moved to new position on the future grid
    }
  }, {
    key: "highlightObstacle",
    value: function highlightObstacle(shape) {
      shape.attr({
        stroke: "#FF2D00"
      });
      // Return it back to normal
      setTimeout(function () {
        shape.attr({
          stroke: "#ffffff"
        });
      }, 1000);
    }

    /**
     * Move the shape in some direction
     * @param {integer} horDir - Horizontal direction (-1,  0 or 1).
     * @param {integer} verDir - Vertical direction (-1,  0 or 1).
     * @param {boolean} active - Is this is active shape (or reactive for false)
     * @return {boolean} moved - Was the move made
     */

  }, {
    key: "move",
    value: function move(horDir, verDir, active) {

      if (active) {
        // The active shape "deep" copies the current game grid into the future game grid
        game.futureGrid = JSON.parse(JSON.stringify(game.grid)); // A lot faster than jquery extend

        this.stashCount = 0; // Stash count for cell collision in the same group

        var couldMove = this.simulateMove(horDir, verDir); // Simulate move for the  active shape
        if (!couldMove) {
          this.indicateInvalidMove();
          return false; // No need to do more if active shape can't move
        }

        // Simulate moves for reactive shapes
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = game.reactiveShapes[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var shape = _step4.value;

            couldMove = shape.simulateMove(this.attr.react.hor * horDir, this.attr.react.ver * verDir);
            if (!couldMove) {
              shape.indicateInvalidMove();
              return false; // Reactive shape can't move. No need to continue
            }
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

        if (this.stashCount > 0) {
          this.indicateInvalidMove();
          this.highlightObstacle(this.shape);
          return false; // Should not be any left over stashed cells if the move was successful
        }

        // The future game grid is valid and can be the current game grid
        game.grid = game.futureGrid;
      }

      // Everything looks good. Animate the movements
      this.animateMove(horDir, verDir);
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = game.reactiveShapes[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var _shape = _step5.value;

          _shape.animateMove(this.attr.react.hor * horDir, this.attr.react.ver * verDir);
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }

      return true; // Move was successful
    }

    /**
     * Animate the move
     * @param {integer} horDir - Horizontal direction (-1,  0 or 1).
     * @param {integer} verDir - Vertical direction (-1,  0 or 1).
     */

  }, {
    key: "animateMove",
    value: function animateMove(horDir, verDir) {
      // Move the shape on the game board
      this.transFromOriginX += horDir * game.cellSize;
      this.transFromOriginY += verDir * game.cellSize;

      if (game.moveAnimation === 0) this.shape.attr({
        transform: 'translate(' + this.transFromOriginX + ', ' + this.transFromOriginY + ')'
      }); // Instant (no animation)
      else if (game.moveAnimation === 1) this.shape.animate({
          transform: 'translate(' + this.transFromOriginX + ', ' + this.transFromOriginY + ')'
        }, 50); // Fast
        else this.shape.animate({
            transform: 'translate(' + this.transFromOriginX + ', ' + this.transFromOriginY + ')'
          }, 200, mina.bounce); // Bounce
    }

    /**
    Indicate that the move is invalid
    */

  }, {
    key: "indicateInvalidMove",
    value: function indicateInvalidMove() {
      game.setAttrForActiveGroup({
        opacity: 0.5
      }); // Show all shapes in group disabled
    }
  }]);

  return Shape;
}();
//# sourceMappingURL=shape.js.map