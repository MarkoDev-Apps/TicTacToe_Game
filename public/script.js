/* ====== Setup & Globals ====== */
const socket = io();
const boardEl = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");

let board = Array(9).fill(null);
let current = "X";
let gameOver = false;
let scoreX = 0, scoreO = 0;
let gameMode = 3; // First to 3 wins (optional)
const cpuName = "CPU";

/* ====== DOM Load ====== */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("resetBtn").onclick = () => socket.emit("restart-round");
  window.addEventListener("keydown", e => {
    if (e.key?.toLowerCase() === "r") socket.emit("restart-round");
  });

  socket.on("make-move", applyMove);
  socket.on("restart-round", resetRound);
});

/* ====== Start Game ====== */
function startGame() {
  document.getElementById("game").hidden = false;
  buildBoard();
}

/* ====== Build Board ====== */
function buildBoard() {
  board.fill(null);
  current = "X";
  gameOver = false;
  boardEl.innerHTML = "";

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.addEventListener("click", () => {
      if (gameOver || board[i]) return;
      socket.emit("make-move", { index: i, player: "X" });
      // CPU move
      setTimeout(() => {
        if (!gameOver) {
          const open = board.reduce((a, v, idx) => v === null ? a.concat(idx) : a, []);
          if (open.length) {
            const cpuIdx = open[Math.floor(Math.random() * open.length)];
            socket.emit("make-move", { index: cpuIdx, player: "O" });
          }
        }
      }, 500);
    });
    boardEl.appendChild(cell);
  }
}

/* ====== Apply Moves ====== */
function applyMove({ index, player }) {
  if (gameOver || board[index]) return;
  board[index] = player;

  const cell = boardEl.querySelector(`[data-i="${index}"]`);
  cell.textContent = player;
  cell.classList.add("filled");
  cell.dataset.player = player;

  const winCombo = checkWin(player);
  if (winCombo) {
    gameOver = true;
    player === "X" ? scoreX++ : scoreO++;
    try { winSound.play() } catch {}
    drawWinLine(winCombo);
    animateWin(`🏆 ${player === "X" ? "You" : cpuName} wins! 🏆`);
    return;
  }

  if (board.every(Boolean)) {
    gameOver = true;
    try { drawSound.play() } catch {}
    animateWin("It's a draw!");
    return;
  }

  current = current === "X" ? "O" : "X";
}

/* ====== Game Helpers ====== */
function resetRound() {
  buildBoard();
}

function checkWin(p) {
  const combos = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return combos.find(c => c.every(i => board[i] === p));
}

function drawWinLine(combo) {
  const rects = combo.map(i => boardEl.children[i].getBoundingClientRect());
  const bRect = boardEl.getBoundingClientRect();
  const [startRect, , endRect] = combo.map(i => boardEl.children[i].getBoundingClientRect());
  const getCenter = r => ({
    x: (r.left + r.right)/2 - bRect.left,
    y: (r.top + r.bottom)/2 - bRect.top
  });

  const startPt = getCenter(startRect), endPt = getCenter(endRect);
  let t = 0, steps = 20;

  (function animate(){
    const pct = t/steps;
    ctx.clearRect(0,0,overlay.width,overlay.height);
    ctx.beginPath();
    ctx.moveTo(startPt.x, startPt.y);
    ctx.lineTo(startPt.x + (endPt.x - startPt.x) * pct, startPt.y + (endPt.y - startPt.y) * pct);
    ctx.strokeStyle="#000"; ctx.lineWidth=6; ctx.stroke();
    if (t++ <= steps) requestAnimationFrame(animate);
  })();
}

function animateWin(msg) {
  const el = document.getElementById("winMessage");
  el.textContent = msg;
  el.classList.add("fade-text");
  setTimeout(() => {
    el.classList.remove("fade-text");
    el.textContent = "";
  }, 3000);
}
