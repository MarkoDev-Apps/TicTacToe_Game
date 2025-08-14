const socket = (typeof window !== "undefined" && typeof window.io === "function")
  ? window.io()
  : (() => {
      const listeners = {};
      return {
        id: "local",
        on(evt, cb) { (listeners[evt] ||= []).push(cb); },
        emit(evt, payload) { (listeners[evt] || []).forEach(fn => fn(payload)); }
      };
    })();
const boardEl = document.getElementById("board");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");
let board = Array(9).fill(null);
let current = "X";
let gameOver = false;
let scoreX = 0, scoreO = 0;
let gameMode = 3;
const cpuName = "CPU";
let isHost = false;
let isMultiplayer = false;
let playerName = "";
let opponentName = "";
let myMark = "X";
let xName = "";
let oName = "";
let chatEl, chatMessages, chatInput, chatSend, chatToggle;
let holo;
let cpuThinking = false;
const CHAT_COLLAPSED_KEY = "chat-collapsed-v1";

/* ====== DOM Load ====== */
document.addEventListener("DOMContentLoaded", () => {
document.getElementById("startBtn").onclick = startGame;
document.getElementById("resetBtn").onclick = () => resetGame(true);
chatEl = document.getElementById("chat");
chatMessages = document.getElementById("chat-messages");
chatInput = document.getElementById("chat-input");
chatSend = document.getElementById("chat-send");
chatToggle = document.getElementById("chat-toggle");
const chatForm = document.getElementById("chat-input-row");
holo = document.getElementById("holo-rules");

function setChatCollapsed(collapsed) {
  if (!chatEl) return;
  chatEl.classList.toggle("collapsed", !!collapsed);
  if (chatToggle) {
    chatToggle.setAttribute("aria-expanded", String(!collapsed));
    chatToggle.textContent = collapsed ? "▸" : "▾";
  }
  try { localStorage.setItem(CHAT_COLLAPSED_KEY, collapsed ? "1" : "0"); } catch {}
}

const initialCollapsed = (localStorage.getItem(CHAT_COLLAPSED_KEY) === "1");
setChatCollapsed(initialCollapsed);

if (chatToggle) {
  chatToggle.addEventListener("click", () => {
    const c = chatEl.classList.contains("collapsed");
    setChatCollapsed(!c);
    if (!c) {
    } else {
      chatEl.classList.remove("unread");
    }
  });
}

if (chatEl) chatEl.hidden = true;

function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  const roomId = document.getElementById("game").dataset.room;
 if (!roomId) return;
  socket.emit("chat-message", { roomId, from: playerName || "Player", text });
  appendChat({ from: "Me", text, self: true });
  chatInput.value = "";
}

if (chatForm) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sendChat();
  });
}

chatSend.onclick = sendChat;
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

document.querySelectorAll(".holo-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".holo-tab").forEach(b => {
      b.classList.remove("is-active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");

    const pane = btn.dataset.pane;
    document.querySelectorAll("#holo-rules .pane").forEach(p => {
      p.classList.remove("is-active");
      p.hidden = true;
    });
    const active = document.getElementById(`pane-${pane}`);
    if (active) { active.hidden = false; active.classList.add("is-active"); }
  });
});

  // inside document.addEventListener("DOMContentLoaded", () => { ... here ... })
const multiBtn = document.getElementById("multiBtn");

// If you added the socket fallback I suggested earlier, this detects "no server"
const hasSocket =
  typeof window.io === "function" && socket && socket.id !== "local";

if (!hasSocket) {
  multiBtn.addEventListener("click", () => {
    alert("Multiplayer requires the Socket.IO server. Start it and reload.");
  });
} else {
  multiBtn.onclick = () => {
    const name = document.getElementById("p1").value.trim();
    if (!name) { alert("Enter your name first."); return; }
    const room = prompt("Enter a room name to join or create:");
    if (!room) return alert("Room name is required.");
    socket.emit("join-room", room);
  };
}

  // Restart game with R key
  window.addEventListener("keydown", (e) => {
  const t = e.target;
  const isTyping =
    t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  if (isTyping) return;

  const gameVisible = !document.getElementById("game").hidden;
  if (gameVisible && e.key && e.key.toLowerCase() === "r") {
    e.preventDefault();
    resetGame(true);
  }
});

  document.getElementById("p1").addEventListener("keydown", e => {
    if (e.key === "Enter") e.preventDefault();
  });

  spawnFloatingSymbols();

  socket.on("make-move", applyMove);
  socket.on("restart-round", resetRound);

  socket.on("match-won", ({ winnerName }) => {
  alert(`🎉 ${winnerName} wins the match! Game will reset.`);
  location.reload();
});

  socket.on("room-joined", ({ roomId, host }) => {
  isHost = host;
  document.getElementById("game").dataset.room = roomId;
  const p1 = document.getElementById("p1");
  if (p1.value.trim()) {
    playerName = p1.value.trim();
    socket.emit("set-name", { name: playerName, roomId });
  }
  alert(
    host
      ? `Created room ${roomId}. Share this room name with your opponent.`
      : `Joined room ${roomId}. The game will now begin!`
  );
});

  socket.on("assign-roles", ({ X, O }) => {
  isMultiplayer = true;
  xName = X.name;
  oName = O.name;
  if (socket.id === X.id) {
    myMark = "X";
    playerName = X.name;
    opponentName = O.name;
  } else {
    myMark = "O";
    playerName = O.name;
    opponentName = X.name;
  }

  if (holo) holo.style.display = "none";
  document.getElementById("subtitle").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("multiBtn").style.display = "none";
  document.getElementById("startBtn").style.display = "none";
  document.getElementById("p1").style.display = "none";
  document.querySelector(".round-toggle").style.display = "none";
  document.getElementById("game").hidden = false;
  document.getElementById("resetBtn").style.display = "inline-block";

 if (chatEl) chatEl.classList.remove("unread");
 if (chatEl && chatInput) {
 chatEl.hidden = false;
const collapsed = (localStorage.getItem(CHAT_COLLAPSED_KEY) === "1");
setChatCollapsed(collapsed);
if (chatInput && !collapsed) chatInput.focus();
   chatInput.placeholder = `Message ${opponentName || "Opponent"}...`;
   chatInput.focus();
 }

if (holo) holo.style.display = "none";

  buildBoard();
  updateInfo();
});

  socket.on("room-full", () => {
    alert("This room is already full.");
  });

socket.on("opponent-left", () => {
  alert("Opponent left the room. Returning to home.");
  location.reload();
});

socket.on("chat-message", ({ from, text }) => {
  if (from === playerName) return;
  appendChat({ from, text, self: false });
  if (chatEl && chatEl.classList.contains("collapsed")) {
  chatEl.classList.add("unread");
}
});

  socket.on("game-over", ({ result }) => {
    gameOver = true;
    const winnerName =
      result === "draw"
        ? "It's a draw!"
        : result === "X"
        ? document.getElementById("p1").value
        : cpuName;
    animateWin(winnerName);
  });
});

function appendChat({ from, text, self = false }) {
  const row = document.createElement("div");
  row.className = "message" + (self ? " self" : "");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = `${from}: ${text}`;
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ====== Start Game ====== */
function startGame() {
  const name = document.getElementById("p1").value.trim();
  if (!name) {
    document.getElementById("p1").style.border = "2px solid red";
    return;
  }

  document.getElementById("subtitle").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("p1").style.display = "none";
  document.querySelector(".round-toggle").style.display = "none";
  document.getElementById("startBtn").style.display = "none";
  document.getElementById("multiBtn").style.display = "none";
  document.getElementById("game").hidden = false;
  const selectedMode = document.querySelector('input[name="modeWin"]:checked').value;
  gameMode = parseInt(selectedMode, 10);
  if (holo) holo.style.display = "none";
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

      if (!isMultiplayer && (current === "O" || cpuThinking)) return;

      const roomId = document.getElementById("game").dataset.room;

      if (isMultiplayer && roomId) {
        if (current !== myMark) return;
        socket.emit("move-room", { roomId, index: i, player: myMark });
      } else {

        applyMove({ index: i, player: current });

        cpuThinking = true;
        setTimeout(() => {
          if (!gameOver && current === "O") {
            const open = board.reduce((a, v, idx) => (v === null ? a.concat(idx) : a), []);
            if (open.length) {
              const cpuIdx = open[Math.floor(Math.random() * open.length)];
              applyMove({ index: cpuIdx, player: "O" });
            }
          }
          cpuThinking = false;
        }, 400);
      }
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
      let winnerName = isMultiplayer
     ? (player === "X" ? xName : oName)
    : (player === "X" ? p1Name : cpuName);
    animateWin(`🏆 ${winnerName} wins! 🏆`);

    setTimeout(() => {
      if (scoreX === gameMode || scoreO === gameMode) {
         const roomId = document.getElementById("game").dataset.room;
       const winnerMark = scoreX === gameMode ? "X" : "O";
   if (isMultiplayer && roomId) {
   if (isHost) {
     const finalWinner = winnerMark === "X" ? xName : oName;
     socket.emit("match-won", { winnerName: finalWinner, roomId });
   }
 } else {
   const finalWinner = winnerMark === "X" ? p1Name : cpuName;
   alert(`🎉 ${finalWinner} wins the match! Game will reset.`);
   resetGame(false);
 }
      } else {
            const roomId = document.getElementById("game").dataset.room;
    if (isMultiplayer && roomId) {
   if (isHost) socket.emit("restart-room", { roomId });
 } else {
   resetRound();
 }
      }
    }, 3000);

    return;
  }

  if (board.every(Boolean)) {
    gameOver = true;
    try { drawSound.play(); } catch {}
    animateWin("It's a draw!");
       setTimeout(() => {
      const roomId = document.getElementById("game").dataset.room;
   if (isMultiplayer && roomId) {
   if (isHost) socket.emit("restart-room", { roomId });
 } else {
   resetRound();
 }
   }, 3000);
    return;
  }

  current = current === "X" ? "O" : "X";
  updateInfo();
}

function updateInfo() {
  const name = document.getElementById("p1").value || "Player";

  if (isMultiplayer) {
    const pX = xName || "Player X";
    const pO = oName || "Player 2";
    document.getElementById("names").textContent = `${pX} (X) vs ${pO} (O)`;
   const turnName = current === "X" ? pX : pO;
   document.getElementById("turn").textContent = `${turnName}'s turn (${current})`;
    document.getElementById("scores").textContent = `${pX}: ${scoreX} | ${pO}: ${scoreO} | First to ${gameMode}`;
  } else {
    const opponent = "CPU";
    document.getElementById("names").textContent = `${name} (X) vs ${opponent} (O)`;
    document.getElementById("turn").textContent = `${name}'s turn (${current})`;
    document.getElementById("scores").textContent = `${name}: ${scoreX} | ${opponent}: ${scoreO} | First to ${gameMode}`;
  }
}

function resetRound() {
cpuThinking = false;
  buildBoard();
  updateInfo();
}

function resetGame(manual) {
  board.fill(null);
  scoreX = 0;
  scoreO = 0;
  current = "X";
  gameOver = false;
  playerName = "";
  opponentName = "";
  myMark = "X";
  xName = "";
  oName = "";
  cpuThinking = false;

  // Reset board
  boardEl.innerHTML = "";
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
  if (holo) holo.style.display = "";
  document.body.classList.remove("in-game");
 if (chatEl && chatMessages) {
   chatEl.hidden = true;
   chatMessages.innerHTML = "";
   chatEl.classList.remove("unread");
 }
  if (manual) location.reload();
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
