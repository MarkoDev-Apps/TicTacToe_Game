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
let isHost = false;
let isMultiplayer = false;
let playerName = "";   // my name
let opponentName = ""; // opponent name
let myMark = "X";      // "X" or "O"
let xName = "";
let oName = "";
// Chat refs (available to all functions)
let chatEl, chatMessages, chatInput, chatSend, chatToggle;
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

// helper: set collapsed state + persist
function setChatCollapsed(collapsed) {
  if (!chatEl) return;
  chatEl.classList.toggle("collapsed", !!collapsed);
  if (chatToggle) {
    chatToggle.setAttribute("aria-expanded", String(!collapsed));
    chatToggle.textContent = collapsed ? "▸" : "▾"; // icon changes
  }
  try { localStorage.setItem(CHAT_COLLAPSED_KEY, collapsed ? "1" : "0"); } catch {}
}

// restore last state
const initialCollapsed = (localStorage.getItem(CHAT_COLLAPSED_KEY) === "1");
setChatCollapsed(initialCollapsed);

// toggle on click
if (chatToggle) {
  chatToggle.addEventListener("click", () => {
    const c = chatEl.classList.contains("collapsed");
    setChatCollapsed(!c);
    if (!c) {
      // collapsing — leave unread state alone
    } else {
      // expanding — clear unread highlight
      chatEl.classList.remove("unread");
    }
  });
}
// Force hidden at startup (single-player path)
if (chatEl) chatEl.hidden = true;

function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  const roomId = document.getElementById("game").dataset.room;
 if (!roomId) return; // not in a room yet
  socket.emit("chat-message", { roomId, from: playerName || "Player", text });
  // Optimistically render as self
  appendChat({ from: "Me", text, self: true });
  chatInput.value = "";
}

chatSend.onclick = sendChat;
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});


  // Multiplayer button handler
  document.getElementById("multiBtn").onclick = () => {
  const name = document.getElementById("p1").value.trim();
  if (!name) { alert("Enter your name first."); return; }
    const room = prompt("Enter a room name to join or create:");
    if (!room) return alert("Room name is required.");
    socket.emit("join-room", room);
  };

  // Restart game with R key
  window.addEventListener("keydown", (e) => {
  // If the user is typing in a field, don't trigger hotkeys
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

  // Prevent Enter in name input from refreshing the page
  document.getElementById("p1").addEventListener("keydown", e => {
    if (e.key === "Enter") e.preventDefault();
  });

  // 🌟 Add floating background X and O
  spawnFloatingSymbols();

  // Socket listeners
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
//    playerName = document.getElementById("p1").value.trim();
//    opponentName = p1.value.trim();
//    socket.emit("set-name", { name: opponentName, roomId });
    playerName = p1.value.trim();
    socket.emit("set-name", { name: playerName, roomId });
  }
  alert(
    host
      ? `Created room ${roomId}. Share this room name with your opponent.`
      : `Joined room ${roomId}. The game will now begin!`
  );
});

  //socket.on("assign-roles", ({ X, O }) => {
  //isMultiplayer = true;
  //playerName = X;
  //opponentName = O;
   // If the user matches the X name, they're X; otherwise they're O
  //const inputName = document.getElementById("p1").value.trim();
  //if (inputName === O) {
    //current = "O";
  //}
  socket.on("assign-roles", ({ X, O }) => {
  // X/O are { id, name }
  isMultiplayer = true;
  xName = X.name;
  oName = O.name;
  if (socket.id === X.id) {
    myMark = "X";
    playerName = X.name;
    opponentName = O.name;
    //current = "X";
  } else {
    myMark = "O";
    playerName = O.name;
    opponentName = X.name;
    //current = "O";
  }
  document.getElementById("subtitle").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("multiBtn").style.display = "none";
  document.getElementById("startBtn").style.display = "none";
  document.getElementById("p1").style.display = "none"; // 👈 HIDE NAME BOX
  document.querySelector(".round-toggle").style.display = "none"; // 👈 HIDE ROUND TOGGLE
  document.getElementById("game").hidden = false;
  document.getElementById("resetBtn").style.display = "inline-block";

  if (chatEl) chatEl.classList.remove("unread");

 if (chatEl && chatInput) {
   chatEl.hidden = false;
   // apply persisted collapsed state when showing chat
const collapsed = (localStorage.getItem(CHAT_COLLAPSED_KEY) === "1");
setChatCollapsed(collapsed);
if (chatInput && !collapsed) chatInput.focus();
   chatInput.placeholder = `Message ${opponentName || "Opponent"}...`;
   chatInput.focus();
 }


  buildBoard();
  updateInfo();
});

  socket.on("room-full", () => {
    alert("This room is already full.");
  });

   // Optional: UX when the other player leaves mid-game
socket.on("opponent-left", () => {
  alert("Opponent left the room. Returning to home.");
  location.reload();
});

//  socket.on("player-name", (name) => {
//  opponentName = name;
//  updateInfo(); // refresh UI when name is received
//});

socket.on("chat-message", ({ from, text }) => {
  // If it's mine, we already appended “Me”; avoid duplicates by checking name
  if (from === playerName) return;
  appendChat({ from, text, self: false });
  if (chatEl && chatEl.classList.contains("collapsed")) {
  chatEl.classList.add("unread"); // subtle header highlight
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
  // Prevent XSS: use textContent (not innerHTML)
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

  // Hide inputs and button
  document.getElementById("subtitle").style.display = "none";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("p1").style.display = "none"; // NEW
  document.querySelector(".round-toggle").style.display = "none";
  document.getElementById("startBtn").style.display = "none";
  document.getElementById("multiBtn").style.display = "none";
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

    const roomId = document.getElementById("game").dataset.room;
    if (isMultiplayer && roomId) {
     // socket.emit("move-room", { roomId, index: i, player: current });
     // Only play on your turn
    if (current !== myMark) return;
     socket.emit("move-room", { roomId, index: i, player: myMark });
    } else {
      socket.emit("make-move", { index: i, player: current });
    }

    if (!isMultiplayer) {
      setTimeout(() => {
        if (!gameOver) {
          const open = board.reduce((a, v, idx) => v === null ? a.concat(idx) : a, []);
          if (open.length) {
            const cpuIdx = open[Math.floor(Math.random() * open.length)];
            socket.emit("make-move", { index: cpuIdx, player: "O" });
          }
        }
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
  //  let winnerName;
  //  if (isMultiplayer) {
  //  winnerName = player === "X" ? playerName : opponentName;
   // } else {
   // winnerName = player === "X" ? p1Name : cpuName;
   // }
      let winnerName = isMultiplayer
     ? (player === "X" ? xName : oName)
    : (player === "X" ? p1Name : cpuName);
    animateWin(`🏆 ${winnerName} wins! 🏆`);

    // Check for match win
    setTimeout(() => {
      if (scoreX === gameMode || scoreO === gameMode) {
     //   const finalWinner = scoreX === gameMode ? p1Name : cpuName;
     //   const roomId = document.getElementById("game").dataset.room;
   // if (isMultiplayer && roomId) {
 // socket.emit("match-won", { winnerName: finalWinner, roomId });
   // } else {
  //alert(`🎉 ${finalWinner} wins the match! Game will reset.`);
 // resetGame(false);
   // }
         const roomId = document.getElementById("game").dataset.room;
       const winnerMark = scoreX === gameMode ? "X" : "O";
   //   if (isMultiplayer && roomId) {
   if (isMultiplayer && roomId) {
   if (isHost) {
     const finalWinner = winnerMark === "X" ? xName : oName;
     socket.emit("match-won", { winnerName: finalWinner, roomId });
   }
   // non-host: no-op; will receive "match-won" from server
 } else {
   const finalWinner = winnerMark === "X" ? p1Name : cpuName;
   alert(`🎉 ${finalWinner} wins the match! Game will reset.`);
   resetGame(false);
 }
      } else {
       // socket.emit("restart-round");
            const roomId = document.getElementById("game").dataset.room;
       //if (isMultiplayer && roomId) {
    if (isMultiplayer && roomId) {
   if (isHost) socket.emit("restart-room", { roomId });
 } else {
   socket.emit("restart-round");
 }
      }
    }, 3000);

    return;
  }

  if (board.every(Boolean)) {
    gameOver = true;
    try { drawSound.play(); } catch {}
    animateWin("It's a draw!");

   // setTimeout(() => socket.emit("restart-round"), 3000);
       setTimeout(() => {
      const roomId = document.getElementById("game").dataset.room;
   if (isMultiplayer && roomId) {
   if (isHost) socket.emit("restart-room", { roomId });
 } else {
   socket.emit("restart-round");
 }
   }, 3000);
    return;
  }

  current = current === "X" ? "O" : "X";
  updateInfo();
}

function updateInfo() {
  const name = document.getElementById("p1").value || "Player";
 // const isPlayerX = current === "X";

  if (isMultiplayer) {
  //  const pX = playerName || name;
 //   const pO = opponentName || "Player 2";
    const pX = xName || "Player X";
    const pO = oName || "Player 2";
    document.getElementById("names").textContent = `${pX} (X) vs ${pO} (O)`;
  //  document.getElementById("turn").textContent = `${
   const turnName = current === "X" ? pX : pO;
   document.getElementById("turn").textContent = `${turnName}'s turn (${current})`;
     // isPlayerX ? pX : pO
   // }'s turn (${current})`;
    document.getElementById("scores").textContent = `${pX}: ${scoreX} | ${pO}: ${scoreO} | First to ${gameMode}`;
  } else {
    const opponent = "CPU";
    document.getElementById("names").textContent = `${name} (X) vs ${opponent} (O)`;
    document.getElementById("turn").textContent = `${name}'s turn (${current})`;
    document.getElementById("scores").textContent = `${name}: ${scoreX} | ${opponent}: ${scoreO} | First to ${gameMode}`;
  }
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
  playerName = "";
  opponentName = "";
  myMark = "X";
  xName = "";
  oName = "";

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

 if (chatEl && chatMessages) {
   chatEl.hidden = true;
   chatMessages.innerHTML = "";
   chatEl.classList.remove("unread");   // ← add this line here
 }

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
