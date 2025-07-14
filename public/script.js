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
  // Show/hide P2 on mode change
  document.querySelectorAll('input[name="mode"]').forEach(r =>
    r.addEventListener("change", () => {
      mode = r.value;
      document.getElementById("p2").hidden = mode === "single";
    })
  );

  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("resetBtn").onclick = () => socket.emit('restart‑round', { roomId });
  window.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "r") socket.emit('restart‑round', { roomId });
  });

  socket.on('join‑success', () => {
    socket.emit('player‑ready', {
      roomId,
      name: document.getElementById("p2").value.trim()
    });
  });

  socket.on('both‑ready', ({ p2name }) => {
    p2 = p2name;
    finalizeStart();
  });

  socket.on('make‑move', applyMove);
  socket.on('restart‑round', resetRound);
});

/* ========== initialize game on click ========== */
function startGame() {
  p1 = document.getElementById("p1").value.trim();
  p2 = document.getElementById("p2").value.trim();
  gameMode = parseInt(document.querySelector('input[name="modeWin"]:checked')?.value || "");

  // ✅ Mandatory checks
  if (!mode) return alert("Choose single or multiplayer mode.");
  if (!gameMode) return alert("Choose first‑to‑3 or first‑to‑5.");
  if (!p1 || (mode === "multi" && !p2)) {
    return alert("Please enter the required player names.");
  }

  if (mode === "single") {
    p2 = cpuName;
    finalizeStart();
  } else {
    roomId = prompt("Enter a room name (for multiplayer):");
    if (!roomId) return alert("A room name is required for multiplayer.");
    socket.emit('join‑room', roomId);
  }
}

/* ========== finalize start UI ========== */
function finalizeStart() {
  document.getElementById("mode-entry").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("wait-msg").hidden = true;
  document.getElementById("game").hidden = false;
  buildBoard();
  updateInfo();
  overlaySetup();
}

/* ========== overlay + board ========== */
function overlaySetup() {
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

  board.forEach((_, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.addEventListener("click", cellClick);
    boardEl.appendChild(cell);
  });
}

/* ========== click handler ========== */
function cellClick(e) {
  const i = +e.target.dataset.i;
  if (gameOver || board[i]) return;

  if (mode === "single") {
    applyMove({ index: i, player: current });
    if (!gameOver) setTimeout(cpuMove, 800);  // wait before CPU responds
  } else {
    socket.emit('make-move', { index: i, player: current, roomId });
  }
}

/* ========== apply moves ========== */
function applyMove({ index, player }) {
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

  current = current === "X" ? "O" : "X";
  updateInfo();

  if (mode === "single" && current === "O") {
    setTimeout(cpuMove, 300);
  }
}

/* ========== CPU smart move ========== */
function cpuMove() {
  // 1) Try to win
  const winner = findBestMove("O");
  if (winner !== null) return applyMove({ index: winner, player: "O" });

  // 2) Block player
  const block = findBestMove("X");
  if (block !== null) return applyMove({ index: block, player: "O" });

  // 3) Random fallback
  const avail = board.map((v,i)=>v===null?i:null).filter(v=>v!==null);
  const idx = avail[Math.floor(Math.random()*avail.length)];
  if (idx!==undefined) applyMove({ index: idx, player: "O" });
}

function findBestMove(p) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],[0,3,6],
    [1,4,7],[2,5,8],[0,4,8],[2,4,6]
  ];
  return wins.reduce((best, combo) => {
    const marks = combo.map(i => board[i]);
    if (marks.filter(v => v === p).length === 2 && marks.filter(v => !v).length === 1) {
      const idx = combo[marks.indexOf(null)];
      return (best === null) ? idx : best;
    }
    return best;
  }, null);
}

/* ========== UI + logic ========== */
function updateInfo() {
  document.getElementById("names").textContent = `${p1} (X) vs ${p2} (O)`;
  document.getElementById("turn").textContent = gameOver ?
    "Game Over" : `${current === "X" ? p1 : p2}'s turn (${current})`;
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
  const [ac,, bc] = rects;
  const getCenter = r => ({
    x: r.left + r.width*0.35 + r.width*(1-0.7)/2 - boardRect.left,
    y: r.top + r.height*0.35 + r.height*(1-0.7)/2 - boardRect.top
  });

  const {x: sx, y: sy} = getCenter(ac);
  const {x: ex, y: ey} = getCenter(bc);
  const dx = ex - sx, dy = ey - sy;
  const sX = sx + dx*0.075, sY = sy + dy*0.075;
  const eX = ex - dx*0.075, eY = ey - dy*0.075;

  let t = 0, steps = 20;
  const animateLine = () => {
    const pct = t/steps;
    const cX = sX + (eX - sX)*pct;
    const cY = sY + (eY - sY)*pct;
    ctx.clearRect(0,0,overlay.width,overlay.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sX,sY);
    ctx.lineTo(cX,cY);
    ctx.stroke();
    if (t++ < steps) requestAnimationFrame(animateLine);
  };
  animateLine();
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
  board = Array(9).fill(null);
  current = "X"; gameOver = false;
  buildBoard();
  updateInfo();
}