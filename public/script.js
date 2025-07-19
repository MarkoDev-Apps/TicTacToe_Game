/* ====== setup & sockets ===== */
const socket = io();
const boardEl = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");
let board = Array(9).fill(null);
let current = "X";
let gameOver = false;
let p1 = "";
let scoreX = 0, scoreO = 0;
let gameMode = 3;

/* ====== DOM Load ====== */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("resetBtn").onclick = () => socket.emit("restart-round");
  window.addEventListener("keydown", e => {
    if (e.key?.toLowerCase() === "r") socket.emit("restart-round");
  });

  socket.on("make-move", applyMove);
  socket.on("restart-round", resetRound);

  document.getElementById("fullscreenBtn").onclick = toggleFullScreen;
});

/* ====== Start Game ====== */
function startGame() {
  p1 = document.getElementById("p1").value?.trim();
  const sel = document.querySelector('input[name="modeWin"]:checked');
  if (!p1 || !sel) return alert("Enter name and choose win condition.");

  gameMode = parseInt(sel.value, 10);
  document.getElementById("name-entry").hidden = true;
  document.getElementById("game").hidden = false;
  buildBoard();

  setTimeout(() => {
    overlay.width = boardEl.offsetWidth;
    overlay.height = boardEl.offsetHeight;
    overlay.style.display = "none";
  }, 0);
}

/* ====== Build Board ====== */
function buildBoard() {
  board.fill(null); current = "X"; gameOver = false;
  boardEl.innerHTML = "";

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.addEventListener("click", () => {
      if (gameOver || board[i]) return;
      socket.emit("make-move", { index: i, player: current });
      if (!gameOver && current === "X") autoCpu();
    });
    boardEl.appendChild(cell);
  }
  updateInfo();
}

/* ====== CPU Move ====== */
function autoCpu() {
  setTimeout(() => {
    const open = board.map((v,i) => v===null ? i : null).filter(v => v!==null);
    if (!open.length) return;
    const idx = open[Math.floor(Math.random() * open.length)];
    socket.emit("make-move", { index: idx, player: "O" });
  }, 300);
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
  if (winCombo) return handleWin(player, winCombo);
  if (board.every(Boolean)) return handleDraw();

  current = current === "X" ? "O" : "X";
  updateInfo();
}

/* ====== Handle Win/Draw ====== */
function handleWin(player, combo) {
  gameOver = true;
  player === "X" ? scoreX++ : scoreO++;
  try { winSound.play(); } catch {}
  drawWinLine(combo);
  animateWin(`🏆 ${player==="X"?p1:"CPU"} wins! 🏆`);
}

function handleDraw() {
  gameOver = true;
  try { drawSound.play(); } catch {}
  animateWin("It's a draw!");
}

/* ====== Helpers ====== */
function resetRound() {
  clearCanvas();
  buildBoard();
}

function updateInfo() {
  document.getElementById("names").textContent = `${p1} (X) vs CPU (O)`;
  document.getElementById("turn").textContent = gameOver ? "" : `${current === "X" ? p1 : "CPU"}'s turn (${current})`;
  document.getElementById("scores").textContent = `${p1}: ${scoreX} | CPU: ${scoreO} | First to ${gameMode}`;
}

function checkWin(p) {
  const combos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return combos.find(c => c.every(i => board[i] === p));
}

function clearCanvas() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
}

function drawWinLine(combo) {
  overlay.style.display = "block";
  const rects = combo.map(i => boardEl.children[i].getBoundingClientRect());
  const bRect = boardEl.getBoundingClientRect();
  const start = getCenter(rects[0], bRect);
  const end = getCenter(rects[2], bRect);

  let t = 0, steps = 20;
  (function animateStep() {
    const pct = t / steps;
    clearCanvas();
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(start.x + (end.x - start.x) * pct, start.y + (end.y - start.y) * pct);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 6;
    ctx.stroke();
    if (t++ < steps) requestAnimationFrame(animateStep);
  })();
}

function getCenter(r, bRect) {
  return { x: (r.left+r.right)/2 - bRect.left, y: (r.top+r.bottom)/2 - bRect.top };
}

function animateWin(msg) {
  const el = document.getElementById("winMessage");
  el.textContent = msg;
  el.classList.add("fade-text");
  setTimeout(() => {
    el.classList.remove("fade-text");
    el.textContent = "";
    resetAfterDelay();
  }, 2000);
}

function resetAfterDelay() {
  if (!gameOver) return;
  if (scoreX >= gameMode || scoreO >= gameMode) {
    return setTimeout(() => location.reload(), 1000);
  }
  setTimeout(() => socket.emit("restart-round"), 1500);
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.error);
  } else {
    document.exitFullscreen();
  }
}
