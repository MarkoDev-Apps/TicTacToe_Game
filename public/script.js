const socket = io();
const boardEl = document.getElementById("board");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");

let board = Array(9).fill(null);
let current = "X";
let gameOver = false;
let scoreX = 0, scoreO = 0;
let gameMode = 3;
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
  const name = document.getElementById("p1").value.trim();
  if (!name) {
    document.getElementById("p1").style.border = "2px solid red";
    return;
  }

  document.getElementById("subtitle").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("game").hidden = false;

  const selectedMode = document.querySelector('input[name="modeWin"]:checked').value;
  gameMode = parseInt(selectedMode, 10);
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
      }, 400);
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
    try { winSound.play(); } catch {}
    animateWin(`🏆 ${player === "X" ? "You" : cpuName} wins! 🏆`);
    return;
  }

  if (board.every(Boolean)) {
    gameOver = true;
    try { drawSound.play(); } catch {}
    animateWin("It's a draw!");
    return;
  }

  current = current === "X" ? "O" : "X";
  updateInfo();
}

function updateInfo() {
  const name = document.getElementById("p1").value || "Player";
  document.getElementById("names").textContent = `${name} (X) vs CPU (O)`;
  document.getElementById("turn").textContent = `${name}'s turn (${current})`;
  document.getElementById("scores").textContent = `${name}: ${scoreX} | CPU: ${scoreO} | First to ${gameMode}`;
}

function resetRound() {
  buildBoard();
  updateInfo();
}

function checkWin(p) {
  const combos = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return combos.find(c => c.every(i => board[i] === p));
}

function animateWin(msg) {
  const el = document.getElementById("winMessage");
  el.textContent = msg;
  el.classList.add("fade-text");
  setTimeout(() => {
    el.classList.remove("fade-text");
    el.textContent = "";
  }, 3000); // 🕒 winner message shows for 3 seconds
}
