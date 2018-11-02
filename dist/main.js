"use strict";

var isMobile = typeof window.orientation !== "undefined" || navigator.userAgent.indexOf('IEMobile') !== -1;

var animationEffects = ["Instant", "Fast", "Bounce"];
var levelFinishMessage = ["You can do better", "Pretty good", "True genius!"]; // 1 - 3 stars

var headerElem, levelTitleElem, footerElem, statusElem;
var levelFinishDialogElem, levelFinishMessageElem, levelFinishStarsElems, levelfinishMoveCountElem, noMoreLevelsElem, playAgainElem, gotoNextLevelElem, moreLevelsElem;
var nextLevelElem, prevLevelElem, reloadLevelElem, menuElem, aboutDialogElem, animationEffectElem, howToPlayDialogElem, howToPlayElem;

var game;

document.addEventListener("DOMContentLoaded", function (event) {

  headerElem = document.getElementById("header");
  levelTitleElem = document.getElementById("level-title");
  footerElem = document.getElementById("footer");
  statusElem = document.getElementById("status");

  levelFinishDialogElem = document.getElementById("level-finish-dialog");
  levelFinishMessageElem = document.getElementById("level-finish-message");
  levelFinishStarsElems = document.getElementsByClassName('level-finish-level-star');
  levelfinishMoveCountElem = document.getElementById('level-finish-move-count');
  noMoreLevelsElem = document.getElementById('no-more-levels');
  playAgainElem = document.getElementById('play-again');
  gotoNextLevelElem = document.getElementById('goto-next-level');
  moreLevelsElem = document.getElementById('more-levels');

  nextLevelElem = document.getElementById("next-level");
  prevLevelElem = document.getElementById("prev-level");
  reloadLevelElem = document.getElementById("reload-level");
  menuElem = document.getElementById("menu");
  aboutDialogElem = document.getElementById("about-dialog");
  animationEffectElem = document.getElementById("animation-effect");
  howToPlayDialogElem = document.getElementById("how-to-play-dialog");
  howToPlayElem = document.getElementById("how-to-play");

  var svgGameElem = document.getElementById("game");
  var rect = svgGameElem.getBoundingClientRect();

  game = new Game(svgGameElem);

  animationEffectElem.textContent = animationEffects[game.moveAnimation];

  nextLevelElem.addEventListener("click", function (e) {
    if (nextLevelElem.style.opacity != 1) return;
    nextLevelElem.classList.add("bounce-right");
    game.nextLevel();
  });

  gotoNextLevelElem.addEventListener("click", function (e) {
    e.preventDefault();
    nextLevelElem.click();
  });

  prevLevelElem.addEventListener("click", function (e) {
    if (prevLevelElem.style.opacity != 1) return;
    prevLevelElem.classList.add("bounce-left");
    game.prevLevel();
  });

  reloadLevelElem.addEventListener("click", function (e) {
    reloadLevelElem.classList.add("rotate-reload");
    game.reloadLevel();
  });

  playAgainElem.addEventListener("click", function (e) {
    e.preventDefault();
    reloadLevelElem.click();
  });

  menuElem.addEventListener("click", function (e) {
    aboutDialogElem.style.display = aboutDialogElem.style.display === "block" ? "none" : "block";
  });

  aboutDialogElem.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  document.addEventListener("click", function (e) {
    if (aboutDialogElem.style.display === "block" && e.target !== menuElem) aboutDialogElem.style.display = "none";

    if (howToPlayDialogElem.style.display === "block") howToPlayDialogElem.style.display = "none";
  });

  animationEffectElem.addEventListener("click", function (e) {
    e.preventDefault();

    if (game.moveAnimation === 2) game.moveAnimation = 0;else game.moveAnimation++;

    animationEffectElem.textContent = animationEffects[game.moveAnimation];
    localStorage.setItem("moveAnimation", game.moveAnimation);
  });

  howToPlayElem.addEventListener("click", function (e) {
    e.preventDefault();

    aboutDialogElem.style.display = "none";
    howToPlayDialogElem.style.display = "block";
  });

  /*
    Listen to start move events
  */
  svgGameElem.addEventListener("mousedown", function (e) {
    rect = svgGameElem.getBoundingClientRect();
    var x = e.pageX - rect.left;
    var y = e.pageY - rect.top;

    game.startDrag(x, y);
  });

  svgGameElem.addEventListener("touchstart", function (e) {
    if (aboutDialogElem.style.display !== "block") e.preventDefault();

    rect = svgGameElem.getBoundingClientRect();
    var x = e.changedTouches[0].pageX - rect.left;
    var y = e.changedTouches[0].pageY - rect.top;

    game.startDrag(x, y);
  });

  /*
    Listen to move events
  */
  svgGameElem.addEventListener("mousemove", function (e) {
    var x = e.pageX - rect.left;
    var y = e.pageY - rect.top;

    game.onDrag(x, y);
  });

  svgGameElem.addEventListener("touchmove", function (e) {
    e.preventDefault();

    var x = e.changedTouches[0].pageX - rect.left;
    var y = e.changedTouches[0].pageY - rect.top;

    game.onDrag(x, y);
  });

  document.addEventListener("touchmove", function (e) {
    e.preventDefault(); // Prevent body scroll on iOS
  });

  /*
    Detect end drag event everywhere on screen
  */
  document.addEventListener("mouseup", function (e) {
    game.endDrag();
  });

  document.addEventListener("touchend", function (e) {
    game.endDrag();
  });

  /*
    Listen to CSS animations events
  */
  nextLevelElem.addEventListener("animationend", function (e) {
    nextLevelElem.classList.remove("bounce-right");
    if (game.levelNumber === game.highestFinishedLevel && !DEBUG) nextLevelElem.style.opacity = 0;
  });

  prevLevelElem.addEventListener("animationend", function (e) {
    prevLevelElem.classList.remove("bounce-left");
    if (game.levelNumber === 0 && !DEBUG) prevLevelElem.style.opacity = 0;
  });

  reloadLevelElem.addEventListener("animationend", function (e) {
    reloadLevelElem.classList.remove("rotate-reload");
  });
});
//# sourceMappingURL=main.js.map