# Usage Guide

## Starting the Application

### 1. Start the Backend Server

```bash
cd backend

# Activate virtual environment (if using one)
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Run the server
python main.py
```

The backend will start on `http://localhost:8000`

You should see output like:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 2. Start the Frontend Development Server

In a new terminal:

```bash
cd frontend

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:3000`

You should see output like:
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

### 3. Access the Application

Open your web browser and navigate to `http://localhost:3000`

## Using the Application

### Step 1: Enter a Chess.com Username

1. Type a valid Chess.com username in the input field (e.g., "hikaru", "magnuscarlsen", or any other player)
2. Click the "Fetch Games" button or press Enter

### Step 2: Select a Game to Analyze

- A list of recent games will appear
- Each game shows:
  - White vs Black player names
  - Time control (e.g., "rapid", "blitz", "bullet")
  - Result (win/loss/draw)
- Click on any game to analyze it

### Step 3: Wait for Analysis

- Stockfish will analyze each move in the game
- This may take 30-60 seconds depending on game length
- A loading indicator will show during analysis

### Step 4: Review the Analysis

Once complete, you'll see:

#### Interactive Chessboard
- Shows the current position
- Use navigation buttons:
  - **Start**: Jump to starting position
  - **←**: Go to previous move
  - **→**: Go to next move
  - **End**: Jump to final position

#### Move Information
- Current move is highlighted with its classification
- Evaluation score is shown (positive = advantage for White, negative = advantage for Black)

#### Move Classifications
- **Best** (Green): Improves position significantly (+0.1 or better)
- **Good** (Blue): Maintains position (-0.1 to +0.1)
- **Inaccuracy** (Yellow): Small mistake (-0.1 to -2.0)
- **Mistake** (Orange): Significant error (-2.0 to -4.0)
- **Blunder** (Red): Major error (worse than -4.0)

#### Evaluation Graph
- Line chart showing evaluation over the course of the game
- X-axis: Move number
- Y-axis: Evaluation (in pawns)
- Hover over points to see specific values

#### Move Statistics
- Summary of move quality distribution
- Shows count of each classification type

#### Moves List
- Complete list of all moves with their classifications
- Click on any move to jump to that position on the board
- Shows evaluation after each move

## Tips

1. **Choose Recent Games**: The app fetches games from the current and previous month
2. **Analysis Time**: Longer games take more time to analyze
3. **Evaluation Scores**: 
   - +1.0 = advantage of 1 pawn for White
   - -1.0 = advantage of 1 pawn for Black
   - 0.0 = equal position
4. **Navigation**: Click on moves in the list to quickly jump to specific positions

## Troubleshooting

### Backend Issues

**"Stockfish not found" error:**
```bash
# Ubuntu/Debian
sudo apt-get install stockfish

# macOS
brew install stockfish
```

**"Failed to fetch games" error:**
- Verify the username exists on Chess.com
- Check your internet connection
- Chess.com API may be temporarily unavailable

### Frontend Issues

**Build errors:**
```bash
cd frontend
npm install  # Reinstall dependencies
npm run build
```

**Development server won't start:**
- Check if port 3000 is already in use
- Try: `PORT=3001 npm run dev` to use a different port

**Can't connect to backend:**
- Ensure backend is running on port 8000
- Check `API_BASE` in `frontend/app/components/ChessAnalyzer.tsx`

## Production Deployment

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

For production, consider using:
- Gunicorn with uvicorn workers
- Docker containerization
- Reverse proxy (nginx)

### Frontend

```bash
cd frontend
npm run build
npm start
```

For production deployment:
- Deploy to Vercel (recommended for Next.js)
- Or build and serve with nginx/Apache
- Update `API_BASE` to point to production backend URL

## API Reference

### GET `/api/games/{username}`

Fetch recent games for a Chess.com user.

**Response:**
```json
{
  "games": [
    {
      "index": 0,
      "white": "player1",
      "black": "player2",
      "result": "win",
      "time_class": "rapid",
      "url": "https://..."
    }
  ]
}
```

### POST `/api/analyze`

Analyze a specific game.

**Request:**
```json
{
  "username": "player1",
  "game_index": 0
}
```

**Response:**
```json
{
  "username": "player1",
  "white_player": "player1",
  "black_player": "player2",
  "result": "1-0",
  "moves": [
    {
      "move_number": 1,
      "move": "e4",
      "eval_before": 0.0,
      "eval_after": 0.3,
      "classification": "Good",
      "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    }
  ],
  "pgn": "[Event \"...\"]\n..."
}
```
