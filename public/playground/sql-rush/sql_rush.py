import json
import random

import pyxel
from js import window

WIDTH = 320
HEIGHT = 180
SAFE_LINE_Y = HEIGHT - 18
BASE_SPAWN_DELAY = 52
MIN_SPAWN_DELAY = 16
MAX_LIVES = 3
BASE_SPEED_RANGE = (0.32, 0.58)
SCORE_SPEED_STEP = 0.008
COLOR_BG = 0
COLOR_TEXT = 7
COLOR_MUTED = 13
COLOR_FAINT = 5
COLOR_ACCENT = 7
COLOR_DANGER = 7
COLOR_PANEL = 1
COLOR_PANEL_BORDER = 13

PROGRESS_STORAGE_KEY = "sql-rush:progress:v1"
MENU_TABS = ["PLAY", "WORDS"]

KEYS = {
    pyxel.KEY_0: "0",
    pyxel.KEY_1: "1",
    pyxel.KEY_2: "2",
    pyxel.KEY_3: "3",
    pyxel.KEY_4: "4",
    pyxel.KEY_5: "5",
    pyxel.KEY_6: "6",
    pyxel.KEY_7: "7",
    pyxel.KEY_8: "8",
    pyxel.KEY_9: "9",
    pyxel.KEY_A: "a",
    pyxel.KEY_B: "b",
    pyxel.KEY_C: "c",
    pyxel.KEY_D: "d",
    pyxel.KEY_E: "e",
    pyxel.KEY_F: "f",
    pyxel.KEY_G: "g",
    pyxel.KEY_H: "h",
    pyxel.KEY_I: "i",
    pyxel.KEY_J: "j",
    pyxel.KEY_K: "k",
    pyxel.KEY_L: "l",
    pyxel.KEY_M: "m",
    pyxel.KEY_N: "n",
    pyxel.KEY_O: "o",
    pyxel.KEY_P: "p",
    pyxel.KEY_Q: "q",
    pyxel.KEY_R: "r",
    pyxel.KEY_S: "s",
    pyxel.KEY_T: "t",
    pyxel.KEY_U: "u",
    pyxel.KEY_V: "v",
    pyxel.KEY_W: "w",
    pyxel.KEY_X: "x",
    pyxel.KEY_Y: "y",
    pyxel.KEY_Z: "z",
    pyxel.KEY_MINUS: "_",
    pyxel.KEY_PERIOD: ".",
    pyxel.KEY_SPACE: " ",
}


def load_words():
    rows = window.SQL_RUSH_WORDS.to_py()
    words = []

    for row in rows:
        if not row.get("active", False):
            continue

        words.append(
            {
                "text": str(row["word"]).lower(),
                "type": str(row["type"]),
                "difficulty": int(row["difficulty"]),
                "unlock_score": int(row["unlock_score"]),
            }
        )

    return words


SQL_WORDS = load_words()


def unlocked_words(score):
    return [word for word in SQL_WORDS if word["unlock_score"] <= score]


def choose_word(score):
    choices = unlocked_words(score)
    weights = [max(1, 12 - word["difficulty"]) for word in choices]
    return random.choices(choices, weights=weights, k=1)[0]


def readable_input(text):
    return (text).upper()


def text_width(text):
    return len(str(text)) * 4


def word_types():
    types = sorted({word["type"] for word in SQL_WORDS})
    return ["all", *types]


def get_progress():
    raw_progress = window.localStorage.getItem(PROGRESS_STORAGE_KEY)

    if not raw_progress:
        return {"highScore": 0, "lastScore": 0, "sessionsPlayed": 0}

    try:
        progress = json.loads(str(raw_progress))
    except Exception:
        return {"highScore": 0, "lastScore": 0, "sessionsPlayed": 0}

    return {
        "highScore": int(progress.get("highScore", 0)),
        "lastScore": int(progress.get("lastScore", 0)),
        "sessionsPlayed": int(progress.get("sessionsPlayed", 0)),
    }


def save_progress(progress):
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, json.dumps(progress))


class App:
    def __init__(self):
        pyxel.init(WIDTH, HEIGHT, title="SQL RUSH", fps=30)
        pyxel.colors[0] = 0x000000
        pyxel.colors[1] = 0x18181B
        pyxel.colors[5] = 0x52525B
        pyxel.colors[7] = 0xFFFFFF
        pyxel.colors[13] = 0xA1A1AA
        self.mode = "menu"
        self.selected_tab = 0
        self.selected_word_type = 0
        self.words_scroll = 0
        self.progress = get_progress()
        self.word_type_tabs = word_types()
        self.reset()
        pyxel.run(self.update, self.draw)

    def reset(self):
        self.words = []
        self.typed = ""
        self.score = 0
        self.spawn_timer = 0
        self.game_over = False
        self.reported_game_over = False
        self.lives = MAX_LIVES
        self.words_cleared = 0
        self.max_difficulty = 1
        self.start_frame = pyxel.frame_count

    def start_game(self):
        self.reset()
        self.mode = "play"

    def current_level(self):
        unlocked = unlocked_words(self.score)
        if not unlocked:
            return 1

        return max(word["difficulty"] for word in unlocked)

    def unlocked_by_best_score(self):
        return unlocked_words(self.progress["highScore"])

    def tab_count(self, tab):
        all_words = (
            SQL_WORDS
            if tab == "all"
            else [word for word in SQL_WORDS if word["type"] == tab]
        )
        unlocked = (
            self.unlocked_by_best_score()
            if tab == "all"
            else [word for word in self.unlocked_by_best_score() if word["type"] == tab]
        )

        return f"{len(unlocked)}/{len(all_words)}"

    def selected_words(self):
        tab = self.word_type_tabs[self.selected_word_type]
        words = self.unlocked_by_best_score()

        if tab != "all":
            words = [word for word in words if word["type"] == tab]

        return sorted(words, key=lambda word: (word["unlock_score"], word["text"]))

    def is_targetable(self, word):
        return 0 <= word["y"] < SAFE_LINE_Y

    def spawn_word(self):
        if not unlocked_words(self.score):
            return

        word = choose_word(self.score)
        text = word["text"]
        x = random.randint(8, max(8, WIDTH - len(text) * 4 - 8))
        speed = random.uniform(*BASE_SPEED_RANGE) + self.score * SCORE_SPEED_STEP
        self.words.append(
            {
                "text": text,
                "type": word["type"],
                "difficulty": word["difficulty"],
                "x": x,
                "y": -8,
                "speed": speed,
                "value": max(1, word["difficulty"]),
            }
        )
        self.max_difficulty = max(self.max_difficulty, word["difficulty"])

    def spawn_delay(self):
        return max(MIN_SPAWN_DELAY, BASE_SPAWN_DELAY - self.score)

    def lose_life(self):
        self.lives -= 1
        self.words = []
        self.typed = ""
        self.spawn_timer = BASE_SPAWN_DELAY

        if self.lives <= 0:
            self.game_over = True

    def report_game_over(self):
        if self.reported_game_over:
            return

        self.progress = get_progress()
        self.progress["highScore"] = max(self.progress["highScore"], self.score)
        self.progress["lastScore"] = self.score
        self.progress["sessionsPlayed"] = self.progress["sessionsPlayed"] + 1
        save_progress(self.progress)

        payload = {
            "source": "sql-rush",
            "type": "game-over",
            "score": self.score,
            "maxDifficulty": self.max_difficulty,
            "wordsCleared": self.words_cleared,
            "durationMs": int((pyxel.frame_count - self.start_frame) * 1000 / 30),
        }
        window.parent.postMessage(json.dumps(payload), "*")
        self.reported_game_over = True

    def update(self):
        if not SQL_WORDS:
            return

        if self.mode == "menu":
            self.update_menu()
            return

        if self.mode == "words":
            self.update_words()
            return

        if self.game_over:
            self.report_game_over()
            if pyxel.btnp(pyxel.KEY_RETURN):
                self.start_game()
            if pyxel.btnp(pyxel.KEY_SPACE):
                self.mode = "menu"
            return

        if pyxel.btnp(pyxel.KEY_ESCAPE):
            self.mode = "menu"
            return

        self.spawn_timer -= 1
        if self.spawn_timer <= 0:
            self.spawn_word()
            self.spawn_timer = self.spawn_delay()

        for word in self.words:
            word["y"] += word["speed"]
            if word["y"] >= SAFE_LINE_Y:
                self.lose_life()
                break

        if pyxel.btnp(pyxel.KEY_BACKSPACE):
            self.typed = self.typed[:-1]

        for key, letter in KEYS.items():
            if pyxel.btnp(key):
                self.push_letter(letter)
                break

    def update_menu(self):
        if pyxel.btnp(pyxel.KEY_LEFT):
            self.selected_tab = (self.selected_tab - 1) % len(MENU_TABS)
        if pyxel.btnp(pyxel.KEY_RIGHT):
            self.selected_tab = (self.selected_tab + 1) % len(MENU_TABS)
        if pyxel.btnp(pyxel.KEY_RETURN):
            if self.selected_tab == 0:
                self.start_game()
            else:
                self.mode = "words"

    def update_words(self):
        visible_rows = self.visible_word_rows()
        if pyxel.btnp(pyxel.KEY_BACKSPACE):
            self.mode = "menu"
        if pyxel.btnp(pyxel.KEY_LEFT):
            self.selected_word_type = (self.selected_word_type - 1) % len(
                self.word_type_tabs
            )
            self.words_scroll = 0
        if pyxel.btnp(pyxel.KEY_RIGHT):
            self.selected_word_type = (self.selected_word_type + 1) % len(
                self.word_type_tabs
            )
            self.words_scroll = 0
        if pyxel.btnp(pyxel.KEY_UP):
            self.words_scroll = max(0, self.words_scroll - 1)
        if pyxel.btnp(pyxel.KEY_DOWN):
            self.words_scroll = min(
                max(0, len(self.selected_words()) - visible_rows),
                self.words_scroll + 1,
            )

    def push_letter(self, letter):
        candidate = self.typed + letter
        matches = [
            word
            for word in self.words
            if self.is_targetable(word) and word["text"].startswith(candidate)
        ]
        if not matches:
            return

        self.typed = candidate
        self.resolve_match()

    def resolve_match(self):
        exact_matches = [
            word
            for word in self.words
            if self.is_targetable(word) and word["text"] == self.typed
        ]
        if not exact_matches:
            return

        combo = len(exact_matches)
        base_value = max(max(word["value"] for word in exact_matches), combo)

        for target in exact_matches:
            self.words.remove(target)

        self.score += base_value * combo
        self.words_cleared += combo
        self.typed = ""

    def draw_hud(self):
        pyxel.text(8, 6, f"SCORE {self.score}", COLOR_TEXT)
        self.draw_lives()
        level_label = f"LVL {self.current_level()}"
        best_label = f"BEST {self.progress['highScore']}"
        pyxel.text(WIDTH - text_width(level_label) - 8, 6, level_label, COLOR_TEXT)
        pyxel.text(WIDTH - text_width(best_label) - 8, 15, best_label, COLOR_MUTED)
        pyxel.text(8, HEIGHT - 10, f"> {readable_input(self.typed)}", COLOR_TEXT)
        pyxel.line(0, SAFE_LINE_Y, WIDTH, SAFE_LINE_Y, COLOR_FAINT)

    def draw_lives(self):
        for index in range(self.lives):
            pyxel.circ(10 + index * 8, 17, 2, COLOR_TEXT)

    def draw_words(self):
        for word in self.words:
            self.draw_word_text(word)

    def draw_word_text(self, word):
        text = word["text"].upper()
        prefix_length = 0
        if (
            self.is_targetable(word)
            and self.typed
            and word["text"].startswith(self.typed)
        ):
            prefix_length = len(self.typed)

        for index, letter in enumerate(text):
            color = COLOR_TEXT if index < prefix_length else COLOR_MUTED
            pyxel.text(word["x"] + index * 4, word["y"], letter, color)

    def draw_centered_text(self, y, text, color):
        pyxel.text((WIDTH - text_width(text)) // 2, y, text, color)

    def visible_word_rows(self):
        return max(8, (HEIGHT - 52) // 12)

    def draw_tabs(self):
        tab_widths = [len(label) * 4 + 10 for label in MENU_TABS]
        total_width = sum(tab_widths) + (len(MENU_TABS) - 1) * 4
        x = (WIDTH - total_width) // 2

        for index, label in enumerate(MENU_TABS):
            width = tab_widths[index]
            is_selected = self.selected_tab == index
            pyxel.rect(x, 10, width, 13, COLOR_PANEL if is_selected else COLOR_BG)
            pyxel.rectb(x, 10, width, 13, COLOR_TEXT if is_selected else COLOR_FAINT)
            pyxel.text(x + 5, 14, label, COLOR_TEXT if is_selected else COLOR_MUTED)
            x += width + 4

    def draw_menu(self):
        self.draw_tabs()
        self.draw_centered_text(50, "SQL RUSH", COLOR_TEXT)
        self.draw_centered_text(68, "LEFT / RIGHT TO PICK TAB", COLOR_MUTED)
        self.draw_centered_text(80, "ENTER TO OPEN", COLOR_MUTED)
        self.draw_centered_text(
            110,
            f"BEST SCORE {self.progress['highScore']}",
            COLOR_TEXT,
        )
        self.draw_centered_text(122, f"WORDS {self.tab_count('all')}", COLOR_MUTED)

    def draw_words_bank(self):
        selected_type = self.word_type_tabs[self.selected_word_type]
        previous_type = self.word_type_tabs[
            (self.selected_word_type - 1) % len(self.word_type_tabs)
        ]
        next_type = self.word_type_tabs[
            (self.selected_word_type + 1) % len(self.word_type_tabs)
        ]
        words = self.selected_words()
        pyxel.text(8, 8, "WORDS", COLOR_TEXT)
        all_count = self.tab_count("all")
        pyxel.text(WIDTH - text_width(all_count) - 8, 8, all_count, COLOR_MUTED)
        pyxel.text(8, 22, f"< {previous_type.upper()}", COLOR_FAINT)
        self.draw_centered_text(
            22,
            f"{selected_type.upper()} {self.tab_count(selected_type)}",
            COLOR_TEXT,
        )
        pyxel.text(
            WIDTH - text_width(f"{next_type.upper()} >") - 8,
            22,
            f"{next_type.upper()} >",
            COLOR_FAINT,
        )
        pyxel.line(8, 35, WIDTH - 8, 35, COLOR_FAINT)

        visible_rows = self.visible_word_rows()
        visible_words = words[self.words_scroll : self.words_scroll + visible_rows]
        y = 43
        for word in visible_words:
            pyxel.text(12, y, word["text"].upper(), COLOR_TEXT)
            pyxel.text(WIDTH // 2 - 20, y, word["type"].upper(), COLOR_MUTED)
            difficulty_label = f"D{word['difficulty']}"
            pyxel.text(
                WIDTH - text_width(difficulty_label) - 12,
                y,
                difficulty_label,
                COLOR_MUTED,
            )
            y += 12

        if not visible_words:
            self.draw_centered_text(HEIGHT // 2, "NO WORDS UNLOCKED", COLOR_MUTED)

        pyxel.text(
            8,
            HEIGHT - 12,
            "BACKSPACE MENU  LEFT/RIGHT TYPE  UP/DOWN",
            COLOR_FAINT,
        )

    def draw_empty_state(self):
        self.draw_centered_text(HEIGHT // 2 - 8, "NO SQL RUSH WORDS", COLOR_TEXT)
        self.draw_centered_text(
            HEIGHT // 2 + 6,
            "CHECK SQL_RUSH_WORDS.JSON",
            COLOR_MUTED,
        )

    def draw_game_over(self):
        panel_width = 188
        panel_height = 50
        panel_x = (WIDTH - panel_width) // 2
        panel_y = (HEIGHT - panel_height) // 2
        pyxel.rect(panel_x, panel_y, panel_width, panel_height, COLOR_BG)
        pyxel.rectb(panel_x, panel_y, panel_width, panel_height, COLOR_MUTED)
        self.draw_centered_text(panel_y + 11, "QUERY FAILED", COLOR_TEXT)
        self.draw_centered_text(panel_y + 25, f"FINAL SCORE {self.score}", COLOR_TEXT)
        self.draw_centered_text(panel_y + 38, "ENTER RESTART  SPACE MENU", COLOR_MUTED)

    def draw(self):
        pyxel.cls(COLOR_BG)

        if not SQL_WORDS:
            self.draw_empty_state()
            return

        if self.mode == "menu":
            self.draw_menu()
            return

        if self.mode == "words":
            self.draw_words_bank()
            return

        self.draw_hud()
        self.draw_words()

        if self.game_over:
            self.draw_game_over()


App()
