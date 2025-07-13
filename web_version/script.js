const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset");

let board = ["","","","","","","","",""];
let currentPlayer = "X";
let gameEnded = false;

function checkWin() {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (let combo of wins) {
    const [a,b,c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  return board.includes("") ? null : "Draw";
}

function renderBoard() {
  boardEl.querySelectorAll(".cell").forEach((cell, i) => {
    cell.textContent = board[i];
  });
}

function handleCellClick(e) {
  const idx = e.target.dataset.index;
  if (gameEnded || board[idx]) return;
  board[idx] = currentPlayer;
  const winner = checkWin();
  if (winner) {
    statusEl.textContent = winner === "Draw" ? "It's a draw!" : `${winner} wins!`;
    gameEnded = true;
  } else {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusEl.textContent = `${currentPlayer}'s turn`;
  }
  renderBoard();
}

function resetGame() {
  board.fill("");
  currentPlayer = "X";
  gameEnded = false;
  statusEl.textContent = "X's turn";
  renderBoard();
}

boardEl.addEventListener("click", handleCellClick);
resetBtn.addEventListener("click", resetGame);
renderBoard();
