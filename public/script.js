/* ========== setup ========== */
const socket = io();
const boardEl = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");

let board = Array(9).fill(null);
let current = "X";
let gameOver = false;
let p1 = "", p2 = "";
let scoreX = 0, scoreO = 0;
let roomId = "";
let gameMode = 3;
let mode = "single"; // single or multi
const cpuName = "CPU";

/* ======= On DOM load ======= */
document.addEventListener("DOMContentLoaded", () => {
  // mode-selection (single/multi)
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener("change", () => {
      mode = radio.value;
      document.getElementById("p2").hidden = (mode === "single");
    });
  });

  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("resetBtn").onclick = () => socket.emit("restart-round", { roomId });
  window.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "r") socket.emit("restart-round", { roomId });
  });

  socket.on("player-ready", () => {
    document.getElementById("wait-msg").hidden = false;
  });

  socket.on("join-success", () => {
    socket.emit("player-ready", {
      roomId,
      name: document.getElementById("p2").value.trim()
    });
  });

  socket.on("both-ready", ({ p2name }) => {
    p2 = p2name;
    finalizeStart();
  });

  socket.on("make-move", applyMove);
  socket.on("restart-round", resetRound);
});

/* ===== Start game logic ===== */
function startGame() {
  p1 = document.getElementById("p1").value.trim();
  p2 = document.getElementById("p2").value.trim();
  const selectedWinVal = document.querySelector('input[name="modeWin"]:checked');

  // Make sure player 1 entered a name and a win condition is selected
  if (!p1 || !selectedWinVal) {
    alert("Please enter your name and choose a winning condition.");
    return;
  }

  gameMode = parseInt(selectedWinVal.value, 10); // Set 3 or 5

  if (mode === "single") {
    p2 = cpuName;
    finalizeStart(); // start game immediately
  } else {
    // multiplayer path
    if (!p2) {
      alert("Please enter name for Player 2.");
      return;
    }

    if (!roomId) {
      roomId = prompt("Enter a room name (for multiplayer):");
      if (!roomId) return alert("A room name is required for multiplayer.");
      socket.emit('join-room', { roomId, name: p1 });
      document.getElementById("wait-msg").hidden = false;
    }
  }
}

/* ===== Initialize UI ===== */
function finalizeStart() {
  document.getElementById("mode-entry").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("game").hidden = false;

  buildBoard();
  updateInfo();

  setTimeout(() => {
    overlay.width = boardEl.offsetWidth;
    overlay.height = boardEl.offsetHeight + 100;
    overlay.style.display = 'none';
  }, 0);
}

/* ===== Build board ===== */
function buildBoard() {
  board = Array(9).fill(null);
  current = "X";
  gameOver = false;
  boardEl.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.addEventListener("click", cellClick);
    boardEl.appendChild(cell);
  }
}

/* ===== Handle cell click ===== */
function cellClick(e) {
  const i = +e.target.dataset.i;
  if (gameOver || board[i]) return;

  // Handle single player mode (human vs CPU)
  if (mode === "single") {
    if (current !== "X") return; // Only let player (X) click
    socket.emit("make-move", { index: i, player: "X", roomId });

    // Let CPU go after a short delay
    setTimeout(() => {
      if (gameOver) return;
      const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(v => v !== null);
      if (emptyIndices.length === 0) return;

      // Simple AI: choose random empty cell
      const cpuChoice = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      socket.emit("make-move", { index: cpuChoice, player: "O", roomId });
    }, 500);
  }

  // Handle multiplayer mode
  else if (mode === "multi") {
    socket.emit("make-move", { index: i, player: current, roomId });
  }
}


/* ===== Apply and render moves ===== */
function applyMove({ index, player }) {
  if (board[index]) return;
  board[index] = player;
  const cell = boardEl.querySelector(`[data-i="${index}"]`);
  if (cell) {
    cell.textContent = player;
    cell.classList.add("filled");
  }

  const winCombo = checkWin(player);
  if (winCombo) {
    gameOver = true;
    if (player === "X") {
  scoreX++;
} else {
  scoreO++;
}
    try { winSound.play(); } catch {}
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    drawWinLine(winCombo);
    animateWin(`🏆 ${player==="X"?p1:p2} wins this round! 🏆`);
    if (scoreX >= gameMode || scoreO >= gameMode) {
      setTimeout(() => {
        alert(`${player === "X" ? p1 : p2} won the game!`);
        window.location.reload();
      }, 3500);
    } else {
      setTimeout(resetRound, 5000);
    }
    return;
  }

  if (board.every(Boolean)) {
    gameOver = true;
    try { drawSound.play(); } catch {}
    animateWin("It's a draw!");
    return setTimeout(resetRound, 5000);
  }

  current = current === "X" ? "O" : "X";
  updateInfo();

  if (mode === "single" && current === "O") {
    setTimeout(cpuMove, 3000);
  }
}

/* ===== CPU move ===== */
function cpuMove() {
  if (gameOver || current !== "O") return;
  const open = board.map((v, i) => v === null ? i : null).filter(i => i !== null);
  if (!open.length) return;

  // try win or block
  let idx = findWinningMove("O") ?? findWinningMove("X") ?? open[Math.floor(Math.random() * open.length)];
  socket.emit("make-move", { index: idx, player: "O", roomId });
}

/* ===== Smart CPU helper ===== */
function findWinningMove(p) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let combo of wins) {
    const [a, b, c] = combo;
    const vals = [board[a], board[b], board[c]];
    if (vals.filter(v => v === p).length === 2 && vals.includes(null)) {
      return combo[vals.indexOf(null)];
    }
  }
  return null;
}

/* ===== Utility helpers ===== */
function updateInfo() {
  document.getElementById("names").textContent = `${p1} (X) vs ${p2} (O)`;
  document.getElementById("turn").textContent = gameOver
    ? "Game Over"
    : `${current === "X" ? p1 : p2}'s turn (${current})`;
  document.getElementById("scores").textContent =
    `${p1}: ${scoreX} | ${p2}: ${scoreO} | First to ${gameMode}`;
}

function checkWin(p) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return wins.find(c => c.every(i => board[i] === p));
}

function drawWinLine(combo) {
  const rects = combo.map(i => boardEl.children[i].getBoundingClientRect());
  const boardRect = boardEl.getBoundingClientRect();
  const [aRect,,,bRect] = rects; // take first and last
  const getCenter = r => ({
    x: (r.left + r.right) / 2 - boardRect.left,
    y: (r.top + r.bottom) / 2 - boardRect.top
  });
  const start = getCenter(aRect), end = getCenter(rects[2]);

  let t = 0, steps = 20;
  function stepFrame() {
    const pct = t++ / steps;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(start.x + (end.x - start.x) * pct, start.y + (end.y - start.y) * pct);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 6; ctx.stroke();
    if (t <= steps) requestAnimationFrame(stepFrame);
  }
  stepFrame();
}

function animateWin(msg) {
  const el = document.getElementById("winMessage");
  el.textContent = msg;
  el.classList.remove("fade-text");
  void el.offsetWidth;
  el.classList.add("fade-text");
  setTimeout(() => {
    el.classList.remove("fade-text");
    el.textContent = "";
    updateInfo();
  }, 3000);
}

function resetRound() {
  board.fill(null);
  current = "X";
  gameOver = false;
  buildBoard();
  updateInfo();
}