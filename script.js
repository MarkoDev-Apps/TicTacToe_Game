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
  p1 = document.getElementById("p1").value.trim();
  p2 = document.getElementById("p2").value.trim();

  if (!p1Name || !p2Name) {
    alert("Please enter names for both Player 1 and Player 2.");
    return;
  }

  p1 = p1Name;
  p2 = p2Name;

  document.getElementById("name-entry").hidden = true;
  document.getElementById("game").hidden = false;

  buildBoard();      // First, build the board
  updateInfo();      // Then, update scores/names

  // Delay overlay resizing just slightly
  setTimeout(() => {
    overlay.width = boardEL.offsetWidth;
    overlay.height = boardEL.offsetHeight + 100;
    overlay.style.display = 'none'; // Hide initially
  }, 0); // 0 ms lets the DOM update first
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
  document.getElementById('turn').textContent = `${current === "X" ? p1 : p2}'s turn (${current})`;
  document.getElementById('scores').textContent = `${p1}: ${scoreX} | ${p2}: ${scoreO}`;
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
    // Check for 3 wins and end game
if (scoreX === 3 || scoreO === 3) {
  setTimeout(() => {
    alert(`${scoreX === 3 ? p1 : p2} wins the series!`);
    location.reload(); // Reloads the page and goes back to start screen
  }, 500); // slight delay to allow win animation
  return;
}
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    document.getElementById("winSound").play();

    drawWinLine(winCombo);
    animateWin(`🏆 ${current === "X" ? p1 : p2} wins! 🏆`);
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
  const rects = combo.map(i => boardEL.children[i].getBoundingClientRect());
  const boardRect = boardEL.getBoundingClientRect();
  const [startCell, , endCell] = rects;

  const getCenter = rect => {
  const scale = 0.35; // smaller value = shorter line
  return {
    x: rect.left + rect.width * scale + rect.width * (1 - 2 * scale) / 2 - boardRect.left,
    y: rect.top + rect.height * scale + rect.height * (1 - 2 * scale) / 2 - boardRect.top
  };
};


  const { x: startX, y: startY } = getCenter(startCell);
  const { x: endX, y: endY } = getCenter(endCell);

  // Shorten the line by trimming both ends
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

  // Force reflow to restart animation
  msgEl.classList.remove("fade-text");
  void msgEl.offsetWidth; // trigger reflow
  msgEl.classList.add("fade-text");

  setTimeout(() => {
    msgEl.classList.remove("fade-text");
    msgEl.textContent = "";
    updateInfo();
  }, 3000);
}


