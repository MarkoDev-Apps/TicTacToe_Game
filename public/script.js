const socket = io();
const boardEl = document.getElementById("board");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");
const winMessage = document.getElementById("winMessage");

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
    alert("Please enter your name!");
    return;
  }

  document.getElementById("name-entry").style.display = "none";
  document.getElementById("subtitle").style.display = "none";
  document.getElementById("game").hidden = false;
  document.getElementById("names").textContent = `${name} (X) vs ${cpuName} (O)`;

  const winMode = document.querySelector("input[name='modeWin']:checked");
  gameMode = parseInt(winMode?.value || 3);

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

  updateInfo();
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
    animateWin(`🏆 ${player === "X" ? "You" : cpuName} win! 🏆`);
    updateInfo();
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

/* ====== Helpers ====== */
function resetRound() {
  buildBoard();
}

function updateInfo() {
  const name = document.getElementById("p1").value.trim();
  document.getElementById("turn").textContent = `${name}'s turn (${current})`;
  document.getElementById("scores").textContent = `${name}: ${scoreX} | ${cpuName}: ${scoreO} | First to ${gameMode}`;
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
  winMessage.textContent = msg;
  winMessage.classList.add("fade-text");

  setTimeout(() => {
    winMessage.classList.remove("fade-text");
    winMessage.textContent = "";
  }, 3000);
}
