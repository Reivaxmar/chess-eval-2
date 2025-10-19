from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
import chess
import chess.engine
import os
from pathlib import Path

app = FastAPI(title="Chess.com Game Analyzer")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stockfish engine path - will be set on first request
stockfish_path = None

class GameRequest(BaseModel):
    username: str
    game_index: int = 0

class MoveAnalysis(BaseModel):
    move_number: int
    move: str
    eval_before: Optional[float]
    eval_after: Optional[float]
    classification: str
    fen: str

class GameAnalysis(BaseModel):
    username: str
    white_player: str
    black_player: str
    result: str
    moves: List[MoveAnalysis]
    pgn: str

def get_stockfish_engine():
    """Get or initialize Stockfish engine."""
    global stockfish_path
    
    if stockfish_path is None:
        # Try common Stockfish locations
        possible_paths = [
            "/usr/games/stockfish",
            "/usr/bin/stockfish",
            "/usr/local/bin/stockfish",
            "/opt/homebrew/bin/stockfish",
            "stockfish",
        ]
        
        for path in possible_paths:
            if os.path.exists(path) or path == "stockfish":
                try:
                    engine = chess.engine.SimpleEngine.popen_uci(path)
                    stockfish_path = path
                    return engine
                except Exception:
                    continue
        
        raise HTTPException(
            status_code=500,
            detail="Stockfish not found. Please install Stockfish: apt-get install stockfish or brew install stockfish"
        )
    
    return chess.engine.SimpleEngine.popen_uci(stockfish_path)

def fetch_chess_com_games(username: str):
    """Fetch recent games from Chess.com API."""
    # Get current month's games
    import datetime
    now = datetime.datetime.now()
    year = now.year
    month = now.strftime("%m")
    
    url = f"https://api.chess.com/pub/player/{username}/games/{year}/{month}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if "games" not in data or len(data["games"]) == 0:
            # Try previous month
            prev_month = now.month - 1 if now.month > 1 else 12
            prev_year = year if now.month > 1 else year - 1
            url = f"https://api.chess.com/pub/player/{username}/games/{prev_year}/{prev_month:02d}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
        
        return data.get("games", [])
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch games: {str(e)}")

def classify_move(eval_before: Optional[float], eval_after: Optional[float], is_white_move: bool) -> str:
    """Classify move quality based on evaluation change."""
    if eval_before is None or eval_after is None:
        return "Unknown"
    
    # Convert from white's perspective
    if not is_white_move:
        eval_before = -eval_before
        eval_after = -eval_after
    
    delta = eval_after - eval_before
    
    # Classification thresholds (in pawns)
    if delta >= 0.1:
        return "Best"
    elif delta >= -0.1:
        return "Good"
    elif delta >= -2.0:
        return "Inaccuracy"
    elif delta >= -4.0:
        return "Mistake"
    else:
        return "Blunder"

def analyze_game(pgn_text: str):
    """Analyze a chess game using Stockfish."""
    import io
    import chess.pgn
    
    # Parse PGN
    pgn = io.StringIO(pgn_text)
    game = chess.pgn.read_game(pgn)
    
    if not game:
        raise HTTPException(status_code=400, detail="Invalid PGN")
    
    # Initialize engine
    engine = get_stockfish_engine()
    
    try:
        board = game.board()
        moves_analysis = []
        
        eval_before = None
        move_number = 1
        
        for move in game.mainline_moves():
            # Get evaluation before move
            if eval_before is None:
                info = engine.analyse(board, chess.engine.Limit(time=0.1, depth=15))
                score = info["score"].relative
                eval_before = score.score(mate_score=10000) / 100.0 if score.score(mate_score=10000) is not None else None
            
            # Determine whose move it is
            is_white_move = board.turn
            
            # Make the move
            san_move = board.san(move)
            board.push(move)
            
            # Get evaluation after move
            info = engine.analyse(board, chess.engine.Limit(time=0.1, depth=15))
            score = info["score"].relative
            eval_after = score.score(mate_score=10000) / 100.0 if score.score(mate_score=10000) is not None else None
            
            # Classify the move
            classification = classify_move(eval_before, eval_after, is_white_move)
            
            moves_analysis.append({
                "move_number": move_number,
                "move": san_move,
                "eval_before": eval_before,
                "eval_after": eval_after,
                "classification": classification,
                "fen": board.fen(),
            })
            
            # Update for next iteration
            eval_before = eval_after
            if not is_white_move:
                move_number += 1
        
        return {
            "white_player": game.headers.get("White", "Unknown"),
            "black_player": game.headers.get("Black", "Unknown"),
            "result": game.headers.get("Result", "*"),
            "moves": moves_analysis,
        }
    finally:
        engine.quit()

@app.get("/")
def read_root():
    return {"message": "Chess.com Game Analyzer API", "status": "running"}

@app.get("/api/games/{username}")
def get_games(username: str):
    """Fetch list of recent games for a Chess.com user."""
    games = fetch_chess_com_games(username)
    
    # Return simplified game list
    game_list = []
    for i, game in enumerate(games[:20]):  # Limit to 20 most recent games
        game_list.append({
            "index": i,
            "white": game.get("white", {}).get("username", "Unknown"),
            "black": game.get("black", {}).get("username", "Unknown"),
            "result": game.get("white", {}).get("result", "unknown"),
            "time_class": game.get("time_class", "unknown"),
            "url": game.get("url", ""),
        })
    
    return {"games": game_list}

@app.post("/api/analyze")
def analyze_game_endpoint(request: GameRequest):
    """Analyze a specific game from Chess.com."""
    games = fetch_chess_com_games(request.username)
    
    if request.game_index >= len(games):
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[request.game_index]
    pgn = game.get("pgn")
    
    if not pgn:
        raise HTTPException(status_code=400, detail="Game has no PGN data")
    
    # Analyze the game
    analysis = analyze_game(pgn)
    analysis["username"] = request.username
    analysis["pgn"] = pgn
    
    return analysis

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
