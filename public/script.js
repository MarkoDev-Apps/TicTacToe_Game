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
let mode = "";
const cpuName = "CPU";

/* ========== on DOM load ========== */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('input[name="mode"]').forEach(r =>
    r.addEventListener("change", () => {
      mode = r.value;
      document.getElementById("p2").hidden = (mode === "single");
    })
  );

  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("resetBtn").onclick = () => socket.emit('restart-round', { roomId });
  window.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "r") socket.emit('restart-round', { roomId });
  });

  socket.on('player-ready', () => {
    document.getElementById("wait-msg").hidden = false;
  });

  socket.on('join-success', () => {
    socket.emit('player-ready', {
      roomId,
      name: document.getElementById("p2").value.trim()
    });
  });

  socket.on('both-ready', ({ p2name }) => {
    p2 = p2name;
    finalizeStart();
  });

  socket.on('make-move', applyMove);
  socket.on('restart-round', resetRound);
});

/* ========== initialize game on click ========== */
function startGame() {
  const selectedMode = document.querySelector('input[name="mode"]:checked');
  const selectedWin   = document.querySelector('input[name="modeWin"]:checked');
  p1 = document.getElementById("p1").value.trim();
  p2 = document.getElementById("p2").value.trim();

  if (!selectedMode || !selectedWin) {
    return alert("Please choose game mode and winning condition.");
  }
  mode = selectedMode.value;
  gameMode = parseInt(selectedWin.value);

  if (!p1 || (mode === "multi" && !p2)) {
    return alert("Please enter required player names.");
  }

  if (mode === "single") {
    p2 = cpuName;
    finalizeStart();
  } else {
    if (!roomId) {
      roomId = prompt("Enter a room name (for multiplayer):");
      if (!roomId) return alert("A room name is required for multiplayer.");
      socket.emit('join-room', { roomId, name: p1 });
      document.getElementById("wait-msg").hidden = false;
    }
  }
}

/* ========== finalize start UI ========== */
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

/* ========== board setup ========== */
function buildBoard() {
  board = Array(9).fill(null);
  current = "X"; gameOver = false;
  boardEl.innerHTML = "";
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
  } else if (mode === "multi") {
    socket.emit('make-move', { index: i, player: current, roomId });
  }
}

/* ========== apply moves ========== */
function applyMove({ index, player }) {
  if (board[index]) return;
  board[index] = player;
  const cell = boardEl.querySelector(`[data-i="${index}"]`);
  if (cell) {
    cell.textContent = player;
    cell.classList.add('filled');
  }

  const winCombo = checkWin(player);
  if (winCombo) {
    gameOver = true;
    player === "X" ? scoreX++ : scoreO++;
    try { winSound.play(); } catch {}
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    drawWinLine(winCombo);
    animateWin(`🏆 ${player === "X" ? p1 : p2} wins this round! 🏆`);
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

  current = (current === "X") ? "O" : "X";
  updateInfo();

  if (mode === "single" && current === "O") {
    setTimeout(cpuMove, 3000);
  }
}

/* ========== CPU logic ========== */
function cpuMove() {
  if (gameOver || current !== "O") return;
  const available = board.map((v, i) => v === null ? i : null).filter(i => i !== null);
  if (!available.length) return;
  const idx = available[Math.floor(Math.random() * available.length)];
  socket.emit('make-move', { index: idx, player: "O", roomId });
}

/* ========== UI helpers ========== */
function updateInfo() {
  document.getElementById("names").textContent = `${p1} (X) vs ${p2} (O)`;
  document.getElementById("turn").textContent = gameOver
    ? "Game Over"
    : `${current === "X" ? p1 : p2}'s turn (${current})`;
  document.getElementById("scores").textContent = `${p1}: ${scoreX} | ${p2}: ${scoreO} | First to ${gameMode}`;
}

function checkWin(p) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return wins.find(c => c.every(i => board[i] === p));
}

function drawWinLine(combo) { /* … same as before … */ }

function animateWin(msg) { /* … same as before … */ }

function resetRound() {
  board = Array(9).fill(null);
  current = "X";
  gameOver = false;
  buildBoard();
  updateInfo();
}