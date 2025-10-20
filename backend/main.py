from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
import chess
import chess.engine
import os
import math
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

class AnalyzeRequest(BaseModel):
    pgn: str

class BestMove(BaseModel):
    move: str
    from_square: str
    to_square: str

class MoveAnalysis(BaseModel):
    move_number: int
    move: str
    eval_before: Optional[float]
    eval_after: Optional[float]
    classification: str
    fen: str
    best_move: Optional[BestMove] = None
    win_percent_before: Optional[float] = None
    win_percent_after: Optional[float] = None
    accuracy: Optional[float] = None
    is_mate_before: Optional[bool] = None
    is_mate_after: Optional[bool] = None
    mate_in_before: Optional[int] = None
    mate_in_after: Optional[int] = None

class MoveAnalysisSimple(BaseModel):
    move: str
    eval: Optional[float]
    delta: Optional[float]
    label: str
    best_move: Optional[BestMove] = None
    is_mate: Optional[bool] = None
    mate_in: Optional[int] = None

class GameAnalysis(BaseModel):
    username: str
    white_player: str
    black_player: str
    result: str
    moves: List[MoveAnalysis]
    pgn: str
    white_accuracy: Optional[float] = None
    black_accuracy: Optional[float] = None

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

def centipawn_to_win_percent(cp: float) -> float:
    """Convert centipawn evaluation to win percentage using Lichess formula.
    
    Formula: Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
    
    Args:
        cp: Centipawn evaluation (positive favors white, negative favors black)
    
    Returns:
        Win percentage from white's perspective (0-100)
    """
    return 50 + 50 * (2 / (1 + math.exp(-0.00368208 * cp)) - 1)

def calculate_move_accuracy(win_percent_before: float, win_percent_after: float) -> float:
    """Calculate move accuracy using Lichess formula.
    
    Formula: Accuracy% = 103.1668 * exp(-0.04354 * (winBefore - winAfter)) - 3.1669
    Clamped to [0, 100]
    
    Args:
        win_percent_before: Win percentage before the move
        win_percent_after: Win percentage after the move (from mover's perspective)
    
    Returns:
        Move accuracy percentage (0-100)
    """
    # Calculate the win percentage loss
    win_loss = win_percent_before - win_percent_after
    
    # Apply Lichess formula
    accuracy = 103.1668 * math.exp(-0.04354 * win_loss) - 3.1669
    
    # Clamp to [0, 100]
    return max(0, min(100, accuracy))

def calculate_game_accuracy(accuracies: List[float]) -> float:
    """Calculate overall game accuracy as average of volatility-weighted and harmonic means.
    
    Args:
        accuracies: List of move accuracy percentages
    
    Returns:
        Overall game accuracy percentage
    """
    if not accuracies or len(accuracies) == 0:
        return 0.0
    
    # Filter out any invalid values
    valid_accuracies = [a for a in accuracies if a is not None and a > 0]
    if not valid_accuracies:
        return 0.0
    
    # Calculate arithmetic mean for volatility-weighted approximation
    # In a full implementation, volatility weights would be calculated based on position complexity
    # For now, we use simple arithmetic mean as the volatility-weighted mean
    arithmetic_mean = sum(valid_accuracies) / len(valid_accuracies)
    
    # Calculate harmonic mean
    # Harmonic mean = n / (sum(1/x_i))
    harmonic_mean = len(valid_accuracies) / sum(1/a for a in valid_accuracies)
    
    # Return average of the two means
    return (arithmetic_mean + harmonic_mean) / 2

def fetch_chess_com_games(username: str):
    """Fetch recent games from Chess.com API."""
    # Get current month's games
    import datetime
    now = datetime.datetime.now()
    year = now.year
    month = now.strftime("%m")
    url = f"https://api.chess.com/pub/player/{username}/games/{year}/{month}"

    # Chess.com requires a User-Agent header; provide a descriptive one.
    headers = {
        "User-Agent": "chess-eval-2 (https://github.com/Reivaxmar/chess-eval-2)"
    }

    # Simple retry/backoff for transient 429/403 responses
    import time

    def _get_with_retries(target_url: str):
        retries = 3
        backoff = 1.0
        for attempt in range(1, retries + 1):
            try:
                resp = requests.get(target_url, headers=headers, timeout=10)
                # If chess.com returns 403, treat it specially
                if resp.status_code == 403:
                    # Forbidden - often due to blocked client or missing UA
                    raise requests.exceptions.HTTPError(f"403 Forbidden for url: {target_url}")
                if resp.status_code == 429:
                    # Rate limited - wait and retry
                    if attempt < retries:
                        time.sleep(backoff)
                        backoff *= 2
                        continue
                    else:
                        resp.raise_for_status()
                resp.raise_for_status()
                return resp
            except requests.exceptions.RequestException as e:
                # On last attempt, re-raise
                if attempt == retries:
                    raise
                time.sleep(backoff)
                backoff *= 2

    try:
        response = _get_with_retries(url)
        data = response.json()

        if "games" not in data or len(data["games"]) == 0:
            # Try previous month
            prev_month = now.month - 1 if now.month > 1 else 12
            prev_year = year if now.month > 1 else year - 1
            url = f"https://api.chess.com/pub/player/{username}/games/{prev_year}/{prev_month:02d}"
            response = _get_with_retries(url)
            data = response.json()

        return data.get("games", [])
    except requests.exceptions.HTTPError as e:
        # Map HTTPError to clearer client errors
        msg = str(e)
        if "403" in msg:
            raise HTTPException(status_code=403, detail=f"Access forbidden when fetching games for '{username}': {msg}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch games: {msg}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch games: {str(e)}")

def classify_move(eval_before: Optional[float], eval_after: Optional[float], is_white_move: bool) -> str:
    """Classify move quality based on centipawn loss.
    
    Classification thresholds (centipawn loss):
    - <20: Best
    - 20-50: Excellent
    - 50-150: Good
    - 150-300: Inaccuracy
    - 300-600: Mistake
    - >600: Blunder
    """
    if eval_before is None or eval_after is None:
        return "Unknown"
    
    # Handle mate scores (these will be ±100 after conversion from ±10000 / 100)
    # For mate positions, the move quality is determined by the move itself
    if abs(eval_before) >= 100 or abs(eval_after) >= 100:
        # If we're delivering or maintaining mate, it's a best move
        if abs(eval_after) >= 100:
            return "Best"
        # If we had mate but lost it, it's likely a blunder
        if abs(eval_before) >= 100:
            return "Blunder"
        return "Unknown"
    
    # Convert from white's perspective
    if not is_white_move:
        eval_before = -eval_before
        eval_after = -eval_after
    
    # Calculate delta (change in evaluation from player's perspective)
    delta = eval_after - eval_before
    
    # Convert to centipawns (from pawns) and round to avoid floating point issues
    centipawn_loss = round(-delta * 100, 1)
    
    # Classification based on centipawn loss
    # Ranges: [0,20), [20,50), [50,150), [150,300), [300,600), [600,∞)
    if centipawn_loss < 20:
        return "Best"
    elif centipawn_loss < 50:
        return "Excellent"
    elif centipawn_loss < 150:
        return "Good"
    elif centipawn_loss < 300:
        return "Inaccuracy"
    elif centipawn_loss < 600:
        return "Mistake"
    else:
        return "Blunder"

def to_white_perspective(eval_relative: Optional[float], is_white_turn: bool) -> Optional[float]:
    """Convert evaluation from side-to-move perspective to white's perspective.
    
    Args:
        eval_relative: Evaluation from the perspective of the side to move
        is_white_turn: True if white is to move, False if black is to move
    
    Returns:
        Evaluation from white's perspective (positive = white better, negative = black better)
    
    Example:
        If white is to move and eval_relative is +0.5, returns +0.5 (white is better)
        If black is to move and eval_relative is +0.5, returns -0.5 (black sees +0.5 but white sees -0.5)
    """
    if eval_relative is None:
        return None
    return eval_relative if is_white_turn else -eval_relative

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
        
        # Analyze starting position
        info = engine.analyse(board, chess.engine.Limit(time=0.1, depth=15))
        score = info["score"].relative
        
        # Check if it's a mate score
        is_mate_before = score.is_mate()
        mate_in_before = score.mate() if is_mate_before else None
        
        score_value = score.score(mate_score=10000)
        eval_relative = score_value / 100.0 if score_value is not None else None
        eval_before = to_white_perspective(eval_relative, board.turn)
        
        # Adjust mate_in for white's perspective
        if mate_in_before is not None:
            mate_in_before = mate_in_before if board.turn else -mate_in_before
        
        move_number = 1
        
        for move in game.mainline_moves():
            # Get best move from previous analysis (before the actual move is made)
            info = engine.analyse(board, chess.engine.Limit(time=0.1, depth=15))
            best_move_info = None
            if info.get("pv") and len(info["pv"]) > 0:
                best_move_obj = info["pv"][0]
                best_move_info = {
                    "move": board.san(best_move_obj),
                    "from_square": chess.square_name(best_move_obj.from_square),
                    "to_square": chess.square_name(best_move_obj.to_square),
                }
            
            # Determine whose move it is
            is_white_move = board.turn
            
            # Make the move
            san_move = board.san(move)
            board.push(move)
            
            # Get evaluation after move
            info = engine.analyse(board, chess.engine.Limit(time=0.1, depth=15))
            score = info["score"].relative
            
            # Check if it's a mate score
            is_mate_after = score.is_mate()
            mate_in_after = score.mate() if is_mate_after else None
            
            score_value = score.score(mate_score=10000)
            eval_relative = score_value / 100.0 if score_value is not None else None
            # Convert to white's perspective: board.turn now indicates the next side to move (opponent)
            eval_after = to_white_perspective(eval_relative, board.turn)
            
            # Adjust mate_in_after for white's perspective
            if mate_in_after is not None:
                mate_in_after = mate_in_after if board.turn else -mate_in_after
            
            # Classify the move
            classification = classify_move(eval_before, eval_after, is_white_move)
            
            # Calculate accuracy metrics
            win_percent_before = None
            win_percent_after = None
            accuracy = None
            
            if eval_before is not None and eval_after is not None:
                # Convert evaluations to centipawns
                cp_before = eval_before * 100
                cp_after = eval_after * 100
                
                # Calculate win percentages from white's perspective
                win_percent_before_white = centipawn_to_win_percent(cp_before)
                win_percent_after_white = centipawn_to_win_percent(cp_after)
                
                # Convert to current player's perspective for accuracy calculation
                if is_white_move:
                    win_percent_before = win_percent_before_white
                    win_percent_after = win_percent_after_white
                else:
                    # For black, flip the win percentages
                    win_percent_before = 100 - win_percent_before_white
                    win_percent_after = 100 - win_percent_after_white
                
                # Calculate move accuracy
                accuracy = calculate_move_accuracy(win_percent_before, win_percent_after)
            
            # Only include best_move if the played move is not the best
            best_move_data = None
            if classification != "Best" and best_move_info:
                best_move_data = best_move_info
            
            moves_analysis.append({
                "move_number": move_number,
                "move": san_move,
                "eval_before": eval_before,
                "eval_after": eval_after,
                "classification": classification,
                "fen": board.fen(),
                "best_move": best_move_data,
                "win_percent_before": win_percent_before,
                "win_percent_after": win_percent_after,
                "accuracy": accuracy,
                "is_mate_before": is_mate_before,
                "is_mate_after": is_mate_after,
                "mate_in_before": mate_in_before,
                "mate_in_after": mate_in_after,
            })
            
            # Update for next iteration
            eval_before = eval_after
            is_mate_before = is_mate_after
            mate_in_before = mate_in_after
            if not is_white_move:
                move_number += 1
        
        # Calculate overall accuracy for white and black
        # White plays on even indices (0, 2, 4, ...), Black plays on odd indices (1, 3, 5, ...)
        white_moves = [m for i, m in enumerate(moves_analysis) if i % 2 == 0]
        black_moves = [m for i, m in enumerate(moves_analysis) if i % 2 == 1]
        
        white_accuracies = [m["accuracy"] for m in white_moves if m.get("accuracy") is not None]
        black_accuracies = [m["accuracy"] for m in black_moves if m.get("accuracy") is not None]
        
        white_accuracy = calculate_game_accuracy(white_accuracies) if white_accuracies else None
        black_accuracy = calculate_game_accuracy(black_accuracies) if black_accuracies else None
        
        return {
            "white_player": game.headers.get("White", "Unknown"),
            "black_player": game.headers.get("Black", "Unknown"),
            "result": game.headers.get("Result", "*"),
            "moves": moves_analysis,
            "white_accuracy": white_accuracy,
            "black_accuracy": black_accuracy,
        }
    finally:
        engine.quit()

@app.get("/")
def read_root():
    return {"message": "Chess.com Game Analyzer API", "status": "running"}

@app.get("/games/{username}")
def get_games_simple(username: str):
    """Fetch PGNs for a Chess.com user (simplified endpoint per problem statement)."""
    games = fetch_chess_com_games(username)
    
    # Return list of PGNs
    pgn_list = []
    for game in games[:20]:  # Limit to 20 most recent games
        pgn = game.get("pgn")
        if pgn:
            pgn_list.append({
                "pgn": pgn,
                "white": game.get("white", {}).get("username", "Unknown"),
                "black": game.get("black", {}).get("username", "Unknown"),
                "url": game.get("url", ""),
            })
    
    return pgn_list

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

@app.post("/analyze")
def analyze_pgn_endpoint(request: AnalyzeRequest):
    """Analyze a PGN directly (endpoint per problem statement).
    
    Input: {"pgn": "..."}
    Output: List of moves with {move, eval, delta, label}
    """
    import io
    import chess.pgn
    
    # Parse PGN
    pgn_io = io.StringIO(request.pgn)
    game = chess.pgn.read_game(pgn_io)
    
    if not game:
        raise HTTPException(status_code=400, detail="Invalid PGN")
    
    # Initialize engine
    engine = get_stockfish_engine()
    
    try:
        board = game.board()
        moves_analysis = []
        
        # Analyze starting position
        info = engine.analyse(board, chess.engine.Limit(time=0.1, depth=15))
        score = info["score"].relative
        is_mate_before = score.is_mate()
        mate_in_before = score.mate() if is_mate_before else None
        
        score_value = score.score(mate_score=10000)
        eval_relative = score_value / 100.0 if score_value is not None else None
        eval_before = to_white_perspective(eval_relative, board.turn)
        
        if mate_in_before is not None:
            mate_in_before = mate_in_before if board.turn else -mate_in_before
        
        for move in game.mainline_moves():
            # Get best move from previous analysis (before the actual move is made)
            info = engine.analyse(board, chess.engine.Limit(time=0.1, depth=15))
            best_move_info = None
            if info.get("pv") and len(info["pv"]) > 0:
                best_move_obj = info["pv"][0]
                best_move_info = {
                    "move": board.san(best_move_obj),
                    "from_square": chess.square_name(best_move_obj.from_square),
                    "to_square": chess.square_name(best_move_obj.to_square),
                }
            
            # Determine whose move it is
            is_white_move = board.turn
            
            # Make the move
            san_move = board.san(move)
            board.push(move)
            
            # Get evaluation after move
            info = engine.analyse(board, chess.engine.Limit(time=0.1, depth=15))
            score = info["score"].relative
            is_mate_after = score.is_mate()
            mate_in_after = score.mate() if is_mate_after else None
            
            score_value = score.score(mate_score=10000)
            eval_relative = score_value / 100.0 if score_value is not None else None
            # Convert to white's perspective: board.turn now indicates the next side to move (opponent)
            eval_after = to_white_perspective(eval_relative, board.turn)
            
            if mate_in_after is not None:
                mate_in_after = mate_in_after if board.turn else -mate_in_after
            
            # Calculate delta (from player's perspective)
            delta = None
            if eval_before is not None and eval_after is not None:
                # Convert to player's perspective
                eval_before_player = eval_before if is_white_move else -eval_before
                eval_after_player = eval_after if is_white_move else -eval_after
                delta = eval_after_player - eval_before_player
            
            # Classify the move
            label = classify_move(eval_before, eval_after, is_white_move)
            
            # Only include best_move if the played move is not the best
            best_move_data = None
            if label != "Best" and best_move_info:
                best_move_data = best_move_info
            
            moves_analysis.append({
                "move": san_move,
                "eval": eval_after,
                "delta": delta,
                "label": label,
                "best_move": best_move_data,
                "is_mate": is_mate_after,
                "mate_in": mate_in_after,
            })
            
            # Update for next iteration
            eval_before = eval_after
            is_mate_before = is_mate_after
            mate_in_before = mate_in_after
        
        return moves_analysis
    finally:
        engine.quit()

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
