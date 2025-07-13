// Colors & Constants
const BG = "#1caaa...", LINE = "#179187", CIRCLE = "#efe7c8", CROSS = "#545454";
const SIZE = 450, ROWS=3, COLS=3, SPACE=SIZE/4, C_WIDTH=6;
let board = [], p1="", p2="", current="X", gameOver=false;
const boardEl = document.getElementById("board"), overlay = document.getElementById("overlay");
overlay.width=450; overlay.height=555;
const ctx = overlay.getContext("2d");

// Init event listeners
document.getElementById("startBtn").onclick = startGame;
document.getElementById("resetBtn").onclick = restart;
window.onkeydown = e => { if(e.key==="r") restart(); };

// Create grid cells
for(let i=0;i<9;i++){
  const d = document.createElement("div");
  d.className="cell"; d.dataset.i=i;
  d.onclick = cellClick;
  boardEl.appendChild(d);
}

// Game flow functions
function startGame(){
  p1 = document.getElementById("p1").value.trim() || "Player X";
  p2 = document.getElementById("p2").value.trim() || "Player O";
  document.getElementById("name-entry").hidden = true;
  document.getElementById("game").hidden = false;
  initialize();
}

function initialize(){
  board = Array(9).fill(null);
  current="X"; gameOver=false;
  updateInfo();
  document.querySelectorAll(".cell").forEach(c=> c.textContent="");
  ctx.clearRect(0,0,overlay.width,overlay.height);
}

function updateInfo(){
  document.getElementById("names").textContent = `${p1} (X) vs ${p2} (O)`;
  document.getElementById("turn").textContent = `${current==="X"? p1: p2}'s turn (${current})`;
}

function cellClick(e){
  const idx = e.target.dataset.i;
  if(gameOver || board[idx]) return;
  board[idx]=current; e.target.textContent=current;
  if(checkWin(current)){
    gameOver=true; showEnd(`${current==="X"? p1: p2} wins!`);
  } else if(board.every(v=>v)){
    gameOver=true; showEnd("It's a draw!");
  } else {
    current = current==="X"? "O":"X";
    updateInfo();
  }
}

function restart(){
  initialize();
}

function checkWin(p){
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return wins.some(c=>c.every(i=>board[i]===p));
}

function showEnd(text){
  const font = "36px sans-serif";
  const tw = overlay.width, th=overlay.height;
  let alpha=0, fadeIn=true, start=Date.now();
  const anim = setInterval(()=>{
    ctx.clearRect(0,0,overlay.width,overlay.height);
    ctx.fillStyle = BG; ctx.fillRect(0,0,overlay.width,overlay.height);
    alpha += fadeIn ? 0.05 : -0.05;
    if(alpha>=1){ alpha=1; fadeIn=false; }
    if(alpha<=0){ alpha=0; fadeIn=true; }
    ctx.globalAlpha = alpha;
    ctx.font = font;
    ctx.fillStyle = "white";
    ctx.textAlign="center"; ctx.fillText(text, tw/2, SIZE/2);
    if(Date.now()-start>3000){
      clearInterval(anim); ctx.clearRect(0,0,overlay.width,overlay.height);
    }
  },33);
}
