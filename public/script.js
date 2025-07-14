const boardEl = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");
const socket = io();

let board = Array(9).fill(null);
let current = "X", gameOver = false;
let p1 = "", p2 = "", scoreX = 0, scoreO = 0;
let roomId = ""; // ✅ define globally

document.addEventListener("DOMContentLoaded", () => {
  roomId = prompt("Enter room name (same for both players):");
  socket.emit('join', roomId);

  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("resetBtn").onclick = restart;

  window.onkeydown = (e) => {
    if (document.activeElement.tagName !== "INPUT" && e.key.toLowerCase() === "r") {
      restart();
    }
  };

  socket.on('restart-round', () => {
    console.log('client: received restart-round');
    resetRound();
  });

  socket.on('make-move', ({ index, player }) => {
    console.log('client: received make-move', index, player);
    if (board[index] || gameOver) return;

    board[index] = player;
    const cell = boardEl.querySelector(`[data-i="${index}"]`);
    if (cell) {
      cell.textContent = player;
      cell.classList.add('filled');
    }

    const winCombo = checkWin(player);
    if (winCombo) {
      gameOver = true;
      try { winSound.play(); } catch (err) {}
      if (player === "X") scoreX++; else scoreO++;
      updateInfo();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      drawWinLine(winCombo);
      animateWin(`🏆 ${player === "X" ? p1 : p2} wins! 🏆`);
      setTimeout(() => resetRound(), 5000);
      return;
    }

    if (board.every(Boolean)) {
      gameOver = true;
      try { drawSound.play(); } catch (err) {}
      animateWin("It's a draw!");
      setTimeout(() => resetRound(), 5000);
    }

    current = player === "X" ? "O" : "X";
    updateInfo();
  });
});

function startGame() {
  console.log("🎮 startGame() called");

  const p1Name = document.getElementById("p1").value.trim();
  const p2Name = document.getElementById("p2").value.trim();

  if (!p1Name || !p2Name) {
    alert("Please enter names for both Player 1 and Player 2.");
    return;
  }

  p1 = p1Name;
  p2 = p2Name;

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

function buildBoard() {
  board = Array(9).fill(null);
  current = "X"; gameOver = false;
  boardEl.innerHTML = "";
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.onclick = cellClick;
    boardEl.appendChild(cell);
  }
}

function cellClick(e) {
  const i = e.target.dataset.i;
  if (gameOver || board[i]) return;

  socket.emit('make-move', { index: i, player: current, roomId }); // ✅ pass roomId
}

function updateInfo() {
  document.getElementById("names").textContent = `${p1} (X) vs ${p2} (O)`;
  document.getElementById("turn").textContent = `${current === "X" ? p1 : p2}'s turn (${current})`;
  document.getElementById("scores").textContent = `${p1}: ${scoreX} | ${p2}: ${scoreO}`;
}

function restart() {
  socket.emit('restart-round', { roomId }); // ✅ pass roomId
}

function checkWin(player) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return wins.find(combo => combo.every(i => board[i] === player));
}

function drawWinLine(combo) {
  const rects = combo.map(i => boardEl.children[i].getBoundingClientRect());
  const boardRect = boardEl.getBoundingClientRect();
  const [startCell, , endCell] = rects;

  const getCenter = rect => {
    const scale = 0.35;
    return {
      x: rect.left + rect.width * scale + rect.width * (1 - 2 * scale) / 2 - boardRect.left,
      y: rect.top + rect.height * scale + rect.height * (1 - 2 * scale) / 2 - boardRect.top
    };
  };

  const { x: startX, y: startY } = getCenter(startCell);
  const { x: endX, y: endY } = getCenter(endCell);

  const shortenFactor = 0.85;
  const dx = endX - startX;
  const dy = endY - startY;

  const adjustedStartX = startX + dx * (1 - shortenFactor) / 2;
  const adjustedStartY = startY + dy * (1 - shortenFactor) / 2;
  const adjustedEndX = endX - dx * (1 - shortenFactor) / 2;
  const adjustedEndY = endY - dy * (1 - shortenFactor) / 2;

  const totalSteps = 20;
  let step = 0;

  const draw = () => {
    const t = step / totalSteps;
    const currentX = adjustedStartX + (adjustedEndX - adjustedStartX) * t;
    const currentY = adjustedStartY + (adjustedEndY - adjustedStartY) * t;

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(adjustedStartX, adjustedStartY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    if (step < totalSteps) {
      step++;
      requestAnimationFrame(draw);
    }
  };
  draw();
}

function animateWin(text) {
  const msgEl = document.getElementById("winMessage");
  msgEl.textContent = `🏆 ${text} 🏆`;

  msgEl.classList.remove("fade-text");
  void msgEl.offsetWidth;
  msgEl.classList.add("fade-text");

  setTimeout(() => {
    msgEl.classList.remove("fade-text");
    msgEl.textContent = "";
    updateInfo();
  }, 3000);
}

function resetRound() {
  board = Array(9).fill(null);
  gameOver = false;
  current = "X";
  buildBoard();
  updateInfo();
}