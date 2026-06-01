from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__)

# On Render (or any host) set the DB_PATH env-var to a writable path,
# e.g. /tmp/database.db (ephemeral) or /data/database.db (persistent disk).
DB_PATH = os.environ.get("DB_PATH", "database.db")

# Temas oficiais do jogo (ALINHADOS com o frontend)
ALLOWED_THEMES = [
    "Biomas",
]

def normalize_theme(theme: str) -> str:
    """Normaliza o tema para bater com a lista oficial."""
    if not theme:
        return ""

    theme = theme.strip()

    aliases = {
        "Ícones": "Icones",
        "Icones do Brasil": "Icones",

        # Relevos / Relevo agora viram Digital Devices
        "Relevo": "Digital Devices",
        "Relevos": "Digital Devices",
        "Relevos do Mundo": "Digital Devices",

        # Dispositivos Digitais
        "Dispositivos Digitais": "Digital Devices",
        "DigitalDevices": "Digital Devices",
        "Devices": "Digital Devices",
    }

    return aliases.get(theme, theme)

def init_db():
    """Cria a tabela e índices se eles não existirem."""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute(
            """CREATE TABLE IF NOT EXISTS rankings
            (id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                theme TEXT NOT NULL,
                time INTEGER NOT NULL)"""
        )

        c.execute("CREATE INDEX IF NOT EXISTS idx_theme_time ON rankings(theme, time)")
        conn.commit()
        conn.close()
        print(" Banco de dados inicializado com sucesso.")
    except Exception as e:
        print(f" Erro ao inicializar banco de dados: {e}")

init_db()

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
    return jsonify(ALLOWED_THEMES)

@app.route("/start_game", methods=["POST"])
def start_game():
    data = request.get_json(force=True) or {}

    theme = normalize_theme(data.get("theme", ""))
    player_name = (data.get("player_name") or "").strip()

    if not player_name:
        return jsonify({"error": "player_name is required"}), 400

    if len(player_name) > 20:
        return jsonify({"error": "player_name must be 20 characters or fewer"}), 400

    if theme not in ALLOWED_THEMES:
        return jsonify({"error": "Invalid theme", "allowed": ALLOWED_THEMES}), 400

    return jsonify({"status": "Game started", "theme": theme, "player_name": player_name})

@app.route("/save_score", methods=["POST"])
def save_score():
    data = request.get_json(force=True) or {}

    name = (data.get("playerName") or "").strip()
    theme = normalize_theme(data.get("theme", ""))
    elapsed_time = data.get("score", None)

    if not name:
        return jsonify({"error": "playerName is required"}), 400

    if len(name) > 20:
        return jsonify({"error": "playerName must be 20 characters or fewer"}), 400

    if theme not in ALLOWED_THEMES:
        return jsonify({"error": "Invalid theme", "allowed": ALLOWED_THEMES}), 400

    try:
        elapsed_time = int(elapsed_time)
        if elapsed_time <= 0:
            raise ValueError()
    except Exception:
        return jsonify({"error": "score must be a positive integer (seconds)"}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "INSERT INTO rankings (name, theme, time) VALUES (?, ?, ?)",
            (name, theme, elapsed_time),
        )
        conn.commit()
        conn.close()
        return jsonify({"status": "Score saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/get_rankings", methods=["GET"])
def get_rankings():
    theme = normalize_theme(request.args.get("theme", ""))

    if theme not in ALLOWED_THEMES:
        return jsonify({"error": "Invalid theme", "allowed": ALLOWED_THEMES}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "SELECT name, time FROM rankings WHERE theme = ? ORDER BY time ASC LIMIT 25",
            (theme,),
        )
        rankings = c.fetchall()
        conn.close()

        # Retorna objetos (o frontend vai ler .name e .time)
        return jsonify([{"name": r[0], "time": r[1]} for r in rankings])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
