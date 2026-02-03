from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

DB_PATH = "database.db"

# Temas oficiais do jogo (mantém consistência no ranking)
ALLOWED_THEMES = [
    "Elementos",
    "Estados",
    "Icones",
    "Relevos",
    "Rios",
    "Digital Devices",
]

def normalize_theme(theme: str) -> str:
    """Normaliza o tema para bater com a lista oficial."""
    if not theme:
        return ""

    theme = theme.strip()

    # Mapeamentos opcionais para aceitar variações do front
    aliases = {
        "Ícones": "Icones",
        "Icones do Brasil": "Icones",
        "Dispositivos Digitais": "Digital Devices",
        "DigitalDevices": "Digital Devices",
        "Devices": "Digital Devices",
    }

    theme = aliases.get(theme, theme)

    return theme

# Initialize the database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute(
        """CREATE TABLE IF NOT EXISTS rankings
           (id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            theme TEXT NOT NULL,
            time INTEGER NOT NULL)"""
    )

    # Índice ajuda quando tiver muitos scores
    c.execute("CREATE INDEX IF NOT EXISTS idx_theme_time ON rankings(theme, time)")
    conn.commit()
    conn.close()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/game")
def game():
    return render_template("game.html")

@app.route("/scores")
def scores():
    return render_template("scores.html")

@app.route("/themes", methods=["GET"])
def themes():
    """Front pode chamar isso pra montar o dropdown automaticamente."""
    return jsonify(ALLOWED_THEMES)

@app.route("/start_game", methods=["POST"])
def start_game():
    data = request.get_json(force=True) or {}

    theme = normalize_theme(data.get("theme", ""))
    player_name = (data.get("player_name") or "").strip()

    if not player_name:
        return jsonify({"error": "player_name is required"}), 400

    if theme not in ALLOWED_THEMES:
        return jsonify({"error": "Invalid theme", "allowed": ALLOWED_THEMES}), 400

    return jsonify({"status": "Game started", "theme": theme, "player_name": player_name})

@app.route("/save_score", methods=["POST"])
def save_score():
    data = request.get_json(force=True) or {}

    name = (data.get("playerName") or "").strip()
    theme = normalize_theme(data.get("theme", ""))
    elapsed_time = data.get("score", None)

    # validações básicas
    if not name:
        return jsonify({"error": "playerName is required"}), 400

    if theme not in ALLOWED_THEMES:
        return jsonify({"error": "Invalid theme", "allowed": ALLOWED_THEMES}), 400

    try:
        elapsed_time = int(elapsed_time)
        if elapsed_time < 0:
            raise ValueError()
    except Exception:
        return jsonify({"error": "score must be a non-negative integer (seconds)"}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO rankings (name, theme, time) VALUES (?, ?, ?)",
        (name, theme, elapsed_time),
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "Score saved"})

@app.route("/get_rankings", methods=["GET"])
def get_rankings():
    theme = normalize_theme(request.args.get("theme", ""))

    if theme not in ALLOWED_THEMES:
        return jsonify({"error": "Invalid theme", "allowed": ALLOWED_THEMES}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT name, time FROM rankings WHERE theme = ? ORDER BY time ASC LIMIT 10",
        (theme,),
    )
    rankings = c.fetchall()
    conn.close()

    # opcional: retorna como lista de objetos, mais fácil no front
    return jsonify([{"name": r[0], "time": r[1]} for r in rankings])

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
