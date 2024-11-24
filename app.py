from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

# Initialize the database
def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS rankings
                 (id INTEGER PRIMARY KEY, name TEXT, theme TEXT, time INTEGER)''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game')
def game():
    return render_template('game.html')

@app.route('/scores')
def scores():
    return render_template('scores.html')

@app.route('/start_game', methods=['POST'])
def start_game():
    data = request.json
    theme = data['theme']
    player_name = data['player_name']
    return jsonify({'status': 'Game started', 'theme': theme, 'player_name': player_name})

@app.route('/save_score', methods=['POST'])
def save_score():
    data = request.json
    name = data['playerName']
    theme = data['theme']
    elapsed_time = data['score']
    
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute("INSERT INTO rankings (name, theme, time) VALUES (?, ?, ?)", (name, theme, elapsed_time))
    conn.commit()
    conn.close()

    return jsonify({'status': 'Score saved'})

@app.route('/get_rankings', methods=['GET'])
def get_rankings():
    theme = request.args.get('theme')
    
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute("SELECT name, time FROM rankings WHERE theme = ? ORDER BY time LIMIT 10", (theme,))
    rankings = c.fetchall()
    conn.close()
    
    return jsonify(rankings)

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
