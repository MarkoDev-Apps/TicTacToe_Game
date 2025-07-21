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
  document.getElementById("resetBtn").onclick = () => resetGame(true);

  // Restart game with R key
  window.addEventListener("keydown", e => {
    const gameVisible = !document.getElementById("game").hidden;
    if (gameVisible && e.key?.toLowerCase() === "r") {
      resetGame(true);
    }
  });

  // Prevent Enter in name input from refreshing the page
  document.getElementById("p1").addEventListener("keydown", e => {
    if (e.key === "Enter") e.preventDefault();
  });

  // 🌟 Add floating background X and O
  spawnFloatingSymbols();

  // === SOCKET.IO LISTENERS ===
  socket.on("make-move", applyMove);
  socket.on("restart-round", resetRound);
  socket.on("game-over", ({ result }) => {
    gameOver = true;
    const winnerName =
      result === "draw"
        ? "It's a draw!"
        : result === "X"
        ? document.getElementById("p1").value || "Player"
        : cpuName;
    animateWin(winnerName);
  });

  socket.on("room-full", () => {
    alert("This room is already full.");
  });
});

/* ====== Start Game ====== */
function startGame() {
  const name = document.getElementById("p1").value.trim();
  if (!name) {
    document.getElementById("p1").style.border = "2px solid red";
    return;
  }

  // Hide inputs and button
  document.getElementById("subtitle").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("p1").style.display = "none"; // NEW
  document.querySelector(".round-toggle").style.display = "none";
  document.getElementById("startBtn").style.display = "none";

  document.getElementById("game").hidden = false;

  const selectedMode = document.querySelector('input[name="modeWin"]:checked').value;
  gameMode = parseInt(selectedMode, 10);
  buildBoard();
  updateInfo();
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
  const p1Name = document.getElementById("p1").value || "Player";

  if (winCombo) {
    gameOver = true;
    if (player === "X") scoreX++;
    else scoreO++;

    try { winSound.play(); } catch {}
    const winnerName = player === "X" ? p1Name : cpuName;
    animateWin(`🏆 ${winnerName} wins! 🏆`);

    // Check for match win
    setTimeout(() => {
      if (scoreX === gameMode || scoreO === gameMode) {
        const finalWinner = scoreX === gameMode ? p1Name : cpuName;
        alert(`🎉 ${finalWinner} wins the match! Game will reset.`);
        resetGame(false);
      } else {
        socket.emit("restart-round");
      }
    }, 3000);

    return;
  }

  if (board.every(Boolean)) {
    gameOver = true;
    try { drawSound.play(); } catch {}
    animateWin("It's a draw!");

    setTimeout(() => socket.emit("restart-round"), 3000);
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

function resetGame(manual) {
  board.fill(null);
  scoreX = 0;
  scoreO = 0;
  current = "X";
  gameOver = false;

  // Reset board
  boardEl.innerHTML = ""; // ⬅️ Clear board from DOM
  document.getElementById("names").textContent = "";
document.getElementById("turn").textContent = "";
document.getElementById("scores").textContent = "";
  document.getElementById("game").hidden = true;
  document.getElementById("winMessage").textContent = "";

  // Show landing UI again
  document.getElementById("subtitle").style.display = "block";
  document.getElementById("name-entry").hidden = false;
  document.querySelector(".round-toggle").style.display = "flex";
  document.getElementById("startBtn").style.display = "inline-block";
  document.getElementById("p1").style.display = "inline-block";
  document.getElementById("p1").value = "";

  if (manual) location.reload(); // manual resets force refresh
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
  }, 3000);
}

function spawnFloatingSymbols() {
  const container = document.getElementById("floating-background");
  const symbols = ["X", "O"];

  for (let i = 0; i < 30; i++) {
    const span = document.createElement("span");
    span.className = "floating-symbol";
    span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    span.style.left = `${Math.random() * 100}%`;
    span.style.top = `${Math.random() * 100}%`;
    span.style.fontSize = `${Math.random() * 2 + 1}rem`;
    span.style.animationDuration = `${Math.random() * 15 + 10}s`;
    container.appendChild(span);
  }
}