import pygame
import sys

pygame.init()

# Constants
WIDTH, HEIGHT = 450, 555  # Extra space for names and info
LINE_WIDTH = 6
BOARD_ROWS = 3
BOARD_COLS = 3
SQUARE_SIZE = WIDTH // BOARD_COLS
CIRCLE_RADIUS = SQUARE_SIZE // 3
CIRCLE_WIDTH = 10
CROSS_WIDTH = 15
SPACE = SQUARE_SIZE // 4

# Colors
BG_COLOR = (28, 170, 156)
LINE_COLOR = (23, 145, 135)
CIRCLE_COLOR = (239, 231, 200)
CROSS_COLOR = (84, 84, 84)
TEXT_COLOR = (255, 255, 255)

# Set up the display
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption('Tic Tac Toe')

FONT = pygame.font.SysFont(None, 28)
BIG_FONT = pygame.font.SysFont(None, 36)

def draw_lines():
    for row in range(1, BOARD_ROWS):
        pygame.draw.line(screen, LINE_COLOR, (0, row * SQUARE_SIZE), (WIDTH, row * SQUARE_SIZE), LINE_WIDTH)
    for col in range(1, BOARD_COLS):
        pygame.draw.line(screen, LINE_COLOR, (col * SQUARE_SIZE, 0), (col * SQUARE_SIZE, SQUARE_SIZE * BOARD_ROWS), LINE_WIDTH)

def draw_figures(board):
    for row in range(BOARD_ROWS):
        for col in range(BOARD_COLS):
            if board[row][col] == 'O':
                pygame.draw.circle(screen, CIRCLE_COLOR, (int(col * SQUARE_SIZE + SQUARE_SIZE/2), int(row * SQUARE_SIZE + SQUARE_SIZE/2)), CIRCLE_RADIUS, CIRCLE_WIDTH)
            elif board[row][col] == 'X':
                start_desc = (col * SQUARE_SIZE + SPACE, row * SQUARE_SIZE + SPACE)
                end_desc = (col * SQUARE_SIZE + SQUARE_SIZE - SPACE, row * SQUARE_SIZE + SQUARE_SIZE - SPACE)
                pygame.draw.line(screen, CROSS_COLOR, start_desc, end_desc, CROSS_WIDTH)
                start_asc = (col * SQUARE_SIZE + SPACE, row * SQUARE_SIZE + SQUARE_SIZE - SPACE)
                end_asc = (col * SQUARE_SIZE + SQUARE_SIZE - SPACE, row * SQUARE_SIZE + SPACE)
                pygame.draw.line(screen, CROSS_COLOR, start_asc, end_asc, CROSS_WIDTH)

def mark_square(board, row, col, player):
    board[row][col] = player

def available_square(board, row, col):
    return board[row][col] is None

def is_board_full(board):
    for row in board:
        for cell in row:
            if cell is None:
                return False
    return True

def check_win(board, player):
    for row in board:
        if all([cell == player for cell in row]):
            return True
    for col in range(BOARD_COLS):
        if all([board[row][col] == player for row in range(BOARD_ROWS)]):
            return True
    if all([board[i][i] == player for i in range(BOARD_ROWS)]):
        return True
    if all([board[i][BOARD_ROWS - i - 1] == player for i in range(BOARD_ROWS)]):
        return True
    return False

def restart(board):
    for row in range(BOARD_ROWS):
        for col in range(BOARD_COLS):
            board[row][col] = None

def draw_names(player1_name, player2_name):
    names_text = f"{player1_name} (X) vs {player2_name} (O)"
    text = FONT.render(names_text, True, TEXT_COLOR)
    screen.fill(BG_COLOR, (0, SQUARE_SIZE * BOARD_ROWS, WIDTH, 30))
    screen.blit(text, (10, SQUARE_SIZE * BOARD_ROWS + 5))

def draw_turn(current_player, player1_name, player2_name):
    turn = player1_name if current_player == 'X' else player2_name
    turn_text = f"{turn}'s turn ({current_player})"
    text = FONT.render(turn_text, True, TEXT_COLOR)
    screen.fill(BG_COLOR, (0, SQUARE_SIZE * BOARD_ROWS + 30, WIDTH, 30))
    screen.blit(text, (10, SQUARE_SIZE * BOARD_ROWS + 35))

def draw_winner(winner_player, player1_name, player2_name):
    winner = player1_name if winner_player == 'X' else player2_name
    animate_winner_text(screen, f"{winner} wins!", BIG_FONT, (255, 255, 255), WIDTH, HEIGHT, duration=4)

def draw_draw():
    text = BIG_FONT.render("It's a draw!", True, TEXT_COLOR)
    screen.blit(text, (10, SQUARE_SIZE * BOARD_ROWS + 65))

def animate_winner_text(screen, text, font, color, width, height, duration=3):
    import time
    clock = pygame.time.Clock()
    start_time = time.time()
    alpha = 0
    fade_in = True

    text_surface = font.render(text, True, color)
    text_surface = text_surface.convert_alpha()

    while time.time() - start_time < duration:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

        screen.fill((28, 170, 156))  # Background color

        # Fade in and out logic
        if fade_in:
            alpha += 5
            if alpha >= 255:
                alpha = 255
                fade_in = False
        else:
            alpha -= 5
            if alpha <= 0:
                alpha = 0
                fade_in = True

        text_surface.set_alpha(alpha)
        text_rect = text_surface.get_rect(center=(width // 2, height // 2))
        screen.blit(text_surface, text_rect)

        pygame.display.update()
        clock.tick(30)


def get_player_names():
    input_boxes = [
        {'prompt': "Enter name for Player X:", 'text': '', 'active': True},
        {'prompt': "Enter name for Player O:", 'text': '', 'active': False}
    ]
    current_box = 0
    clock = pygame.time.Clock()
    done = False

    while not done:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if input_boxes[current_box]['active']:
                    if event.key == pygame.K_RETURN:
                        if input_boxes[current_box]['text'].strip() == '':
                            input_boxes[current_box]['text'] = f"Player {'X' if current_box == 0 else 'O'}"
                        input_boxes[current_box]['active'] = False
                        if current_box == 0:
                            current_box = 1
                            input_boxes[1]['active'] = True
                        else:
                            done = True
                    elif event.key == pygame.K_BACKSPACE:
                        input_boxes[current_box]['text'] = input_boxes[current_box]['text'][:-1]
                    else:
                        if len(input_boxes[current_box]['text']) < 15 and event.unicode.isprintable():
                            input_boxes[current_box]['text'] += event.unicode

        # Draw input screen
        screen.fill(BG_COLOR)
        for idx, box in enumerate(input_boxes):
            prompt = FONT.render(box['prompt'], True, TEXT_COLOR)
            text = FONT.render(box['text'] + ('|' if box['active'] else ''), True, TEXT_COLOR)
            y = HEIGHT // 2 - 40 + idx * 60
            screen.blit(prompt, (20, y))
            screen.blit(text, (20, y + 30))
        pygame.display.update()
        clock.tick(30)

    return input_boxes[0]['text'], input_boxes[1]['text']

def main():
    # Get player names
    player1_name, player2_name = get_player_names()

    board = [[None for _ in range(BOARD_COLS)] for _ in range(BOARD_ROWS)]
    player = 'X'
    game_over = False

    screen.fill(BG_COLOR)
    draw_lines()
    draw_names(player1_name, player2_name)
    draw_turn(player, player1_name, player2_name)
    draw_figures(board)

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.MOUSEBUTTONDOWN and not game_over:
                mouseX = event.pos[0]
                mouseY = event.pos[1]
                if mouseY < SQUARE_SIZE * BOARD_ROWS:
                    clicked_row = mouseY // SQUARE_SIZE
                    clicked_col = mouseX // SQUARE_SIZE
                    if available_square(board, clicked_row, clicked_col):
                        mark_square(board, clicked_row, clicked_col, player)
                        if check_win(board, player):
                            draw_figures(board)
                            draw_winner(player, player1_name, player2_name)
                            game_over = True
                        elif is_board_full(board):
                            draw_figures(board)
                            draw_draw()
                            game_over = True
                        else:
                            player = 'O' if player == 'X' else 'X'
                            draw_figures(board)
                            draw_turn(player, player1_name, player2_name)
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    restart(board)
                    screen.fill(BG_COLOR)
                    draw_lines()
                    draw_names(player1_name, player2_name)
                    player = 'X'
                    game_over = False
                    draw_turn(player, player1_name, player2_name)
                    draw_figures(board)

        pygame.display.update()

if __name__ == "__main__":
    main()

