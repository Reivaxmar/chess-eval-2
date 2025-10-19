# Chess.com Game Analyzer

A full-stack web application that fetches Chess.com games, analyzes them with Stockfish, and displays move quality classifications directly on an interactive board.

## Features

- **Fetch Games**: Enter any Chess.com username to retrieve their recent games
- **Engine Analysis**: Analyze games move-by-move using Stockfish chess engine
- **Move Classification**: Each move is classified as Best, Good, Inaccuracy, Mistake, or Blunder based on evaluation changes
- **Interactive Board**: Navigate through the game with visual move quality indicators
- **Evaluation Graph**: See the evaluation trend throughout the game
- **Move Statistics**: View a breakdown of move quality distribution

## Tech Stack

### Backend
- **Python 3.8+**
- **FastAPI**: Modern web framework for building APIs
- **python-chess**: Chess library for move validation and engine communication
- **Stockfish**: Chess engine for position evaluation
- **Requests**: HTTP library for Chess.com API integration

### Frontend
- **Next.js 15**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: Utility-first CSS framework
- **react-chessboard**: Interactive chess board component
- **chess.js**: Chess move validation and game logic
- **Recharts**: Data visualization library for evaluation graphs

## Installation

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **Stockfish** chess engine

Install Stockfish:
```bash
# Ubuntu/Debian
sudo apt-get install stockfish

# macOS
brew install stockfish

# Or download from https://stockfishchess.org/download/
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Running the Application

### Start the Backend

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

The backend API will run on `http://localhost:8000`

### Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. Open your browser to `http://localhost:3000`
2. Enter a Chess.com username (e.g., "hikaru", "magnuscarlsen")
3. Click "Fetch Games" to retrieve recent games
4. Select a game from the list to analyze it
5. Use the navigation buttons to step through moves
6. View move classifications, evaluation graph, and statistics

## Move Classification

Moves are classified based on the change in position evaluation (in pawns):

- **Best**: Improves position (+0.1 or better)
- **Good**: Maintains position (-0.1 to +0.1)
- **Inaccuracy**: Small mistake (-0.1 to -2.0)
- **Mistake**: Significant error (-2.0 to -4.0)
- **Blunder**: Major error (worse than -4.0)

## API Endpoints

### GET `/`
Health check endpoint

### GET `/api/games/{username}`
Fetch recent games for a Chess.com user
- Returns: List of up to 20 recent games

### POST `/api/analyze`
Analyze a specific game
- Request body: `{"username": "string", "game_index": number}`
- Returns: Full game analysis with move classifications and evaluations

## Project Structure

```
chess-eval-2/
├── backend/
│   ├── main.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   └── ChessAnalyzer.tsx  # Main analyzer component
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── package.json         # Node dependencies
│   └── tsconfig.json        # TypeScript config
└── README.md
```

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Chess.com for providing the public API
- Stockfish team for the powerful chess engine
- react-chessboard for the interactive board component
