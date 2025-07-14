/* ========== setup ========== */
const socket = io();
const boardEl = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");

let board = Array(9).fill(null);
let current = "X", gameOver = false;
let p1 = "", p2 = "", scoreX = 0, scoreO = 0;
let roomId = "";
let gameMode = 3;
let mode = "single";
const cpuName = "CPU";

/* ========== DOM load ========== */
document.addEventListener("DOMContentLoaded", () => {
  [...document.querySelectorAll('input[name="mode"]')].forEach(radio =>
    radio.addEventListener("change", e => {
      mode = e.target.value;
      document.getElementById("p2").hidden = mode === "single";
    })
  );

  [...document.querySelectorAll('button[class$="-btn"]')].forEach(btn =>
    btn.addEventListener("click", () => {
      const group = btn.className;
      const others = document.querySelectorAll(`.${group}`);
      others.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    })
  );

  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("resetBtn").onclick = () =>
    socket.emit('restart-round', { roomId });
  window.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "r") {
      socket.emit('restart-round', { roomId });
    }
  });

  socket.on('both-joined', finalizeStart);
  socket.on('make-move', applyMove);
  socket.on('restart-round', resetRound);
});

/* ========== start logic ========== */
function startGame() {
  p1 = document.getElementById("p1").value.trim();
  p2 = document.getElementById("p2").value.trim();
  const winBtn = document.querySelector('.round-btn.selected');
  const modeBtn = document.querySelector('.mode-btn.selected');

  if (!p1 || (mode === "multi" && !p2)) {
    return alert("Please fill required name(s).");
  }
  if (!winBtn || !modeBtn) {
    return alert("Please choose game mode and winning condition.");
  }

  gameMode = parseInt(winBtn.dataset.value);
  mode = modeBtn.dataset.value;

  if (mode === "single") {
    p2 = cpuName;
    finalizeStart();
  } else {
    roomId = prompt("Enter a room name (for multiplayer):");
    if (!roomId) return alert("Room is required.");
    socket.emit('join', roomId);
    document.getElementById("wait-msg").hidden = false;
    document.getElementById("startBtn").disabled = true;
  }
}

/* ========== UI init ========== */
function finalizeStart() {
  document.getElementById("mode-entry").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("game").hidden = false;
  document.getElementById("wait-msg").hidden = true;
  document.getElementById("startBtn").disabled = false;

  buildBoard();
  updateInfo();
  overlaySetup();

  if (mode === "single" && current === "O") {
    setTimeout(cpuMove, 3000);
  }
}

/* ========== setup board ========== */
function buildBoard() {
  board.fill(null);
  current = "X";
  gameOver = false;
  boardEl.innerHTML = "";
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  board.forEach((_, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.addEventListener("click", cellClick);
    boardEl.appendChild(cell);
  });
}

/* ========== handle click ========== */
function cellClick(e) {
  const i = +e.target.dataset.i;
  if (gameOver || board[i]) return;

  if (mode === "single" && current === "X") {
    socket.emit('make-move', { index: i, player: "X", roomId });
  }
  if (mode === "multi") {
    socket.emit('make-move', { index: i, player: current, roomId });
  }
}

/* ========== apply move (from either socket or local) ========== */
function applyMove({ index, player }) {
  board[index] = player;
  const cell = boardEl.querySelector(`[data-i="${index}"]`);
  if (cell) cell.textContent = player;

  const winCombo = checkWin(player);
  if (winCombo) {
    gameOver = true;
    player === "X" ? scoreX++ : scoreO++;
    try { winSound.play(); } catch {}
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    animateWin(`🏆 ${player === "X" ? p1 : p2} wins this round! 🏆`);

    if (scoreX >= gameMode || scoreO >= gameMode) {
      return setTimeout(() => {
        alert(`${player === "X" ? p1 : p2} won the game!`);
        window.location.reload();
      }, 3500);
    }
    return setTimeout(resetRound, 5000);
  }

  if (board.every(Boolean)) {
    gameOver = true;
    try { drawSound.play(); } catch {}
    animateWin("It's a draw!");
    return setTimeout(resetRound, 5000);
  }

  current = current === "X" ? "O" : "X";
  updateInfo();

  // CPU turn
  if (mode === "single" && current === "O") {
    return setTimeout(cpuMove, 3000);
  }
}

/* ========== CPU logic ========== */
function cpuMove() {
  if (gameOver || current !== "O") return;

  const open = board.map((v, i) => v ? null : i).filter(i => i != null);
  const idx = open[Math.floor(Math.random() * open.length)];
  if (idx == null) return;

  socket.emit('make-move', { index: idx, player: "O", roomId });
}

/* ========== UI helpers + logic ========== */
function updateInfo() {
  document.getElementById("names").textContent = `${p1} (X) vs ${p2} (O)`;
  document.getElementById("turn").textContent = gameOver
    ? "Game Over" : `${current === "X" ? p1 : p2}'s turn (${current})`;
  document.getElementById("scores").textContent =
    `${p1}: ${scoreX} | ${p2}: ${scoreO} | First to ${gameMode}`;
}

function checkWin(p) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  return wins.find(combo => combo.every(i => board[i] === p));
}

function overlaySetup() {
  setTimeout(() => {
    overlay.width = boardEl.offsetWidth;
    overlay.height = boardEl.offsetHeight + 100;
    overlay.style.display = 'none';
  }, 0);
}

function animateWin(msg) {
  const el = document.getElementById("winMessage");
  el.textContent = `🏆 ${msg} 🏆`;
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