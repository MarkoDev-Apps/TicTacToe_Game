const boardEl = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");

let board = Array(9).fill(null);
let current = "X", gameOver = false;
let p1 = "", p2 = "", scoreX = 0, scoreO = 0;

document.getElementById("startBtn").onclick = startGame;
document.getElementById("resetBtn").onclick = restart;
window.onkeydown = (e) => {
  if (document.activeElement.tagName !== "INPUT" && e.key.toLowerCase() === "r") {
    restart();
  }
};

function startGame() {
  p1 = document.getElementById("p1").value.trim() || "Player X";
  p2 = document.getElementById("p2").value.trim() || "Player O";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("game").hidden = false;
  overlay.width = boardEl.offsetWidth;
  overlay.height = boardEl.offsetHeight + 100; // Add extra space below board
  buildBoard();
  updateInfo();
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

function updateInfo() {
  document.getElementById("names").textContent = `${p1} (X) vs ${p2} (O)`;
  document.getElementById("turn").textContent = gameOver ? "" : `${current === "X" ? p1 : p2}'s turn (${current})`;
  document.getElementById("scores").textContent = `${p1}: ${scoreX} | ${p2}: ${scoreO}`;
}

function cellClick(e) {
  const i = e.target.dataset.i;
  if (gameOver || board[i]) return;
  board[i] = current;
  e.target.textContent = current;
  const winCombo = checkWin(current);
  if (winCombo) {
    gameOver = true;
    if (current === "X") scoreX++; else scoreO++;
    drawWinLine(winCombo);
    animateWin(`${current === "X" ? p1 : p2} wins!`);
  } else if (board.every(Boolean)) {
    gameOver = true;
    animateWin("It's a draw!");
  } else {
    current = current === "X" ? "O" : "X";
    updateInfo();
  }
}

function restart() {
  buildBoard();
  updateInfo();
}

function checkWin(player) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return wins.find(combo => combo.every(i => board[i] === player));
}

function drawWinLine(combo) {
  const rects = combo.map(i => boardEl.children[i].getBoundingClientRect());
  const [start, end] = [rects[0], rects[2]];
  const startX = start.left + start.width/2 - boardEl.getBoundingClientRect().left;
  const startY = start.top + start.height/2 - boardEl.getBoundingClientRect().top;
  const endX = end.left + end.width/2 - boardEl.getBoundingClientRect().left;
  const endY = end.top + end.height/2 - boardEl.getBoundingClientRect().top;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function animateWin(text) {
  const msgEl = document.getElementById("winMessage");
  msgEl.textContent = text;
  msgEl.classList.add("visible");

  setTimeout(() => {
    msgEl.classList.remove("visible");
    msgEl.textContent = "";
    updateInfo();
  }, 3000);
}

