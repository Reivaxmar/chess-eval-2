# API Usage Examples

This document shows how to use the Chess Game Analyzer API endpoints.

## Prerequisites

Make sure the backend server is running:
```bash
cd backend
python main.py
# Server will be available at http://localhost:8000
```

## Health Check

Check if the API is running:

```bash
curl http://localhost:8000/
```

Response:
```json
{
  "message": "Chess.com Game Analyzer API",
  "status": "running"
}
```

## Analyze a PGN

Analyze any chess game by providing a PGN string:

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "pgn": "[Event \"Test Game\"]\n[Site \"Test\"]\n[Date \"2025.01.01\"]\n[White \"Player1\"]\n[Black \"Player2\"]\n[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *"
  }'
```

Response:
```json
[
  {
    "move": "e4",
    "eval": -0.46,
    "delta": -0.83,
    "label": "Good"
  },
  {
    "move": "e5",
    "eval": 0.32,
    "delta": -0.78,
    "label": "Good"
  },
  ...
]
```

## Fetch Games from Chess.com

Fetch recent games for a Chess.com user:

```bash
curl http://localhost:8000/games/magnuscarlsen
```

Response:
```json
[
  {
    "pgn": "[Event \"Live Chess\"]\n[Site \"Chess.com\"]\n...",
    "white": "magnuscarlsen",
    "black": "opponent",
    "url": "https://www.chess.com/game/live/..."
  },
  ...
]
```

## Move Classification

Moves are classified based on centipawn loss:

| Classification | Centipawn Loss | Description |
|---------------|----------------|-------------|
| Best | <20 | Optimal or near-optimal move |
| Excellent | 20-50 | Very strong move |
| Good | 50-150 | Solid move |
| Inaccuracy | 150-300 | Minor mistake |
| Mistake | 300-600 | Significant error |
| Blunder | >600 | Major error |

## Python Example

```python
import requests

# Analyze a game
pgn = """[Event "Test"]
[Site "Test"]
[Date "2025.01.01"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 *"""

response = requests.post(
    "http://localhost:8000/analyze",
    json={"pgn": pgn}
)

moves = response.json()
for move in moves:
    print(f"{move['move']}: {move['label']} (eval: {move['eval']}, delta: {move['delta']})")
```

## JavaScript Example

```javascript
// Analyze a game
const pgn = `[Event "Test"]
[Site "Test"]
[Date "2025.01.01"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 *`;

const response = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ pgn })
});

const moves = await response.json();
moves.forEach(move => {
  console.log(`${move.move}: ${move.label} (eval: ${move.eval}, delta: ${move.delta})`);
});
```

## Legacy Endpoints

For backward compatibility, the following endpoints are still available:

### GET `/api/games/{username}`
Returns game metadata along with PGN data in a different format.

### POST `/api/analyze`
Accepts `{"username": "string", "game_index": number}` and fetches the game from Chess.com before analyzing.

## Notes

- The API requires Stockfish to be installed on the system
- Analysis depth is set to 15 with 0.1 seconds per position
- The API has CORS enabled for `localhost:3000` (for the frontend)
- Centipawn loss represents the amount of evaluation lost (always positive)
- Delta values in responses show evaluation change from the player's perspective
