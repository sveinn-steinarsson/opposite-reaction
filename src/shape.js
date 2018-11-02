class Shape {
  constructor(shapeId, groupId, shapeData, attr) {
    this.shapeId = shapeId;
    this.groupId = groupId;
    this.shapeData = shapeData;
    this.attr = attr;
    if (this.attr.hasOwnProperty('col'))
      this.attr.actCol = this.colorLuminance(this.attr.col, 0.15); // Calculate active color

    this.shape = game.s.g();

    this.transFromOriginX = 0;
    this.transFromOriginY = 0;

    this.createShape();
  }

  /**
   * Calculate the increase or decrease in color luminance
   */
  colorLuminance(hex, lum) {
    if (hex.startsWith("#"))
      hex = hex.substr(1);

    let rgb = "#";
    let c;
    for (let i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ("00" + c).substr(c.length);
    }
    return rgb;
  }

  /**
   * Draw the icon indicating the shape's relation with the group
   */
  drawReactionIcon(x, y) {
    let icon = game.s.g();
    let factor = 0.75;
    let scale = (game.cellSize / 120) * factor;

    //let topRightArrow = [10, 50, 110, 50, 95, 35];
    let topRightArrow = [95, 35, 110, 50, 10, 50]; // Revert
    let bottomLeftArrow = [110, 70, 10, 70, 25, 85];
    let bottomRightArrow = [10, 70, 110, 70, 95, 85];

    // let rightUpArrow = [70, 110, 70, 10, 85, 25];
    let rightUpArrow = [85, 25, 70, 10, 70, 110]; // Revert
    let leftDownArrow = [50, 10, 50, 110, 35, 95];
    let leftUpArrow = [50, 110, 50, 10, 35, 25];

    if (this.attr.react.hor === -1) {
      icon.add(game.s.polyline(topRightArrow));
      icon.add(game.s.polyline(bottomLeftArrow));
    } else {
      icon.add(game.s.polyline([...topRightArrow, ...bottomRightArrow]));
    }

    if (this.attr.react.ver === -1) {
      icon.add(game.s.polyline(rightUpArrow));
      icon.add(game.s.polyline(leftDownArrow));
    } else {
      icon.add(game.s.polyline([...rightUpArrow, ...leftUpArrow]));
    }

    let shift = game.cellSize * (1 - factor) / 2;

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
  createPolygon(cornerPoints) {
    // Shorthand varibles
    let cs = game.cellSize; // Cell width and height are always the same

    // Prepare the point data
    let pointsObj = {};

    for (let i = 0; i < cornerPoints.length; i++) {
      let key = cornerPoints[i][0] + "_" + cornerPoints[i][1];
      if (pointsObj[key]) {
        pointsObj[key]++;
      } else {
        pointsObj[key] = 1;
      }

      if (pointsObj[key] == 4)
        delete pointsObj[key]; // Remove internal points (which have four instances)
    }

    // Make a point set from point object (removes duplicates)
    let pointsSet = new Set(Object.keys(pointsObj).map(key => key));

    // Convert the set of strings into an array of numbers
    let points = [];
    for (let value of pointsSet)
      points.push(value.split("_").map(Number));

    // Find the polygon points of the shape
    let polygonArray = [];
    let firstPoint = points[0];

    // Add the first point to polygon
    polygonArray.push(firstPoint);
    let lastAddedPoint = firstPoint;
    points.splice(0, 1); // Remove the first point

    // Does the points array contain this point
    function hasPoint(x, y) {
      for (let p of points)
        if (p[0] === x && p[1] === y)
          return true;
      return false;
    }

    // Helper function used inside the loop
    function addNextPolygonPoint(horDir, verDir) {
      let x = lastAddedPoint[0] + horDir * cs;
      let y = lastAddedPoint[1] + verDir * cs;

      if (firstPoint[0] === x && firstPoint[1] === y) {
        polygonDone = true;
        return true;
      }

      // Special case if direction is up
      // Do not go up if there is a cell on the left
      if (verDir === -1) {
        if (hasPoint(x - cs, y) && hasPoint(x - cs, y + cs))
          return false;
      }

      for (let i = 0; i < points.length; i++) {
        if (x === points[i][0] && y === points[i][1]) {
          polygonArray.push(points[i]); // Next point
          lastAddedPoint = points[i];
          points.splice(i, 1); // Remove the added point
          return true; // Found and added
        }
      }
      return false; // Not found
    }

    let polygonDone = false;
    let i = 0; // Counter
    while (!polygonDone) {

      if (++i > 50) {
        if (points.length !== 0)
          console.log("Bad Shape! Points left.");
        console.log("Bad Shape! Max iterations of 50 reached.");
        polygonDone = true; // Just of safety. This should never happen with correct shapes!
      }

      // Above
      if (addNextPolygonPoint(0, -1))
        continue;

      // Right
      if (addNextPolygonPoint(1, 0))
        continue;

      // Below
      if (addNextPolygonPoint(0, 1))
        continue;

      // Right
      if (addNextPolygonPoint(-1, 0))
        continue;

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
  createShape() {
    // Shorthand varibles
    let cs = game.cellSize; // Cell width and height are always the same
    let px = this.shapeData.pos.x;
    let py = this.shapeData.pos.y;

    let firstCell = false;

    let cornerPoints = [];
    for (let y = 0; y < this.shapeData.grid.length; y++) {
      for (let x = 0; x < this.shapeData.grid[y].length; x++) {
        if (this.shapeData.grid[y][x] == 1) {

          if (!firstCell) {
            // Draw the type/reaction icon in the first cell (top left)
            firstCell = {
              "x": x * cs + px * cs,
              "y": y * cs + py * cs
            };
          }

          // Top left
          cornerPoints.push([
            x * cs + px * cs,
            y * cs + py * cs
          ]);
          // Top right
          cornerPoints.push([
            x * cs + px * cs + cs,
            y * cs + py * cs
          ]);
          // Bottom right
          cornerPoints.push([
            x * cs + px * cs + cs,
            y * cs + py * cs + cs
          ]);
          // Bottom left
          cornerPoints.push([
            x * cs + px * cs,
            y * cs + py * cs + cs
          ]);

          // Add cell to internal game grid
          game.grid[y + py][x + px] = {
            "groupId": this.groupId,
            "shapeId": this.shapeId,
            "type": this.attr.type
          };

        }
      }
    }

    let polygonArray = this.createPolygon(cornerPoints);
    let polygon = game.s.polygon(polygonArray);

    this.shape.add(polygon);

    if (this.attr.type == "static")
      this.shape.attr({
        stroke: "#ffffff",
        fill: game.striped
      });
    else if (this.attr.type == "active")
      this.shape.attr({
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
  simulateMove(horDir, verDir) {
    // Store current shape position in grid and remove from futuregrid
    let futureShapeCells = [];
    for (let y = 0; y < game.gridHeight; y++) {
      for (let x = 0; x < game.gridWidth; x++) {
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
    for (let shapeCell of futureShapeCells) {

      let nextX = shapeCell.x + horDir;
      let nextY = shapeCell.y + verDir;

      if ((nextX < 0) || (nextX >= game.gridWidth) || (nextY < 0) || (nextY >= game.gridHeight))
        return false; // Cell is out of bounds

      if (game.futureGrid[nextY][nextX] === 0) {
        game.futureGrid[nextY][nextX] = {
          "groupId": this.groupId,
          "shapeId": this.shapeId
        };
      } else if ((game.futureGrid[nextY][nextX].groupId === this.groupId) &&
        ((horDir !== 0 && this.attr.react.hor === 1) || (verDir !== 0 && this.attr.react.ver === 1))
      ) {
        // If collision with own shape group, stash the cell in current position
        // Only if shape is not going in opposite direction
        game.futureGrid[nextY][nextX].stash = {
          "groupId": this.groupId,
          "shapeId": this.shapeId
        };
        game.activeShape.stashCount++;
        // Allow the move for now. Stash should be empty at the end of the movement simulation
      } else {
        let shape = game.getShapeAtPos(nextX, nextY);
        if (shape)
          this.highlightObstacle(shape.shape);
        else
          this.highlightObstacle(this.shape);

        return false; // Shape can not be moved to this position on the future grid
      }
    }

    return true; // Shape was successfully moved to new position on the future grid
  }

  highlightObstacle(shape) {
    shape.attr({
      stroke: "#FF2D00"
    });
    // Return it back to normal
    setTimeout(function() {
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
  move(horDir, verDir, active) {

    if (active) {
      // The active shape "deep" copies the current game grid into the future game grid
      game.futureGrid = JSON.parse(JSON.stringify(game.grid)); // A lot faster than jquery extend

      this.stashCount = 0; // Stash count for cell collision in the same group

      let couldMove = this.simulateMove(horDir, verDir); // Simulate move for the  active shape
      if (!couldMove) {
        this.indicateInvalidMove();
        return false; // No need to do more if active shape can't move
      }

      // Simulate moves for reactive shapes
      for (let shape of game.reactiveShapes) {
        couldMove = shape.simulateMove(this.attr.react.hor * horDir, this.attr.react.ver * verDir);
        if (!couldMove) {
          shape.indicateInvalidMove();
          return false; // Reactive shape can't move. No need to continue
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
    for (let shape of game.reactiveShapes)
      shape.animateMove(this.attr.react.hor * horDir, this.attr.react.ver * verDir);

    return true; // Move was successful

  }

  /**
   * Animate the move
   * @param {integer} horDir - Horizontal direction (-1,  0 or 1).
   * @param {integer} verDir - Vertical direction (-1,  0 or 1).
   */
  animateMove(horDir, verDir) {
    // Move the shape on the game board
    this.transFromOriginX += horDir * game.cellSize;
    this.transFromOriginY += verDir * game.cellSize;

    if (game.moveAnimation === 0)
      this.shape.attr({
        transform: 'translate(' + this.transFromOriginX + ', ' + this.transFromOriginY + ')'
      }); // Instant (no animation)
    else if (game.moveAnimation === 1)
      this.shape.animate({
        transform: 'translate(' + this.transFromOriginX + ', ' + this.transFromOriginY + ')'
      }, 50); // Fast
    else
      this.shape.animate({
        transform: 'translate(' + this.transFromOriginX + ', ' + this.transFromOriginY + ')'
      }, 200, mina.bounce); // Bounce

  }

  /**
  Indicate that the move is invalid
  */
  indicateInvalidMove() {
    game.setAttrForActiveGroup({
      opacity: 0.5
    }); // Show all shapes in group disabled
  }

}
