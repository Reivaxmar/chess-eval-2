# Project Structure

```
chess-eval-2/
├── README.md                          # Main documentation
├── USAGE.md                           # User guide
├── LICENSE                            # MIT License
├── .gitignore                         # Git ignore rules
│
├── backend/                           # Python FastAPI backend
│   ├── main.py                        # Main FastAPI application
│   ├── requirements.txt               # Python dependencies
│   └── test_analysis.py               # Test script for analysis
│
└── frontend/                          # Next.js React frontend
    ├── app/
    │   ├── components/
    │   │   └── ChessAnalyzer.tsx      # Main analyzer component
    │   ├── layout.tsx                 # Root layout
    │   ├── page.tsx                   # Home page
    │   ├── globals.css                # Global styles
    │   └── favicon.ico                # Favicon
    ├── public/                        # Static assets
    │   ├── *.svg                      # SVG icons
    │   └── ...
    ├── package.json                   # Node dependencies
    ├── package-lock.json              # Locked dependencies
    ├── next.config.ts                 # Next.js configuration
    ├── tsconfig.json                  # TypeScript configuration
    ├── postcss.config.mjs             # PostCSS configuration
    └── README.md                      # Frontend-specific docs
```

## Key Files

### Backend
- **main.py**: Core FastAPI application with:
  - Chess.com API integration
  - Stockfish engine integration
  - Move analysis and classification
  - REST API endpoints
  
- **test_analysis.py**: Test script to verify analysis functionality

### Frontend
- **ChessAnalyzer.tsx**: Main React component with:
  - Username input and game fetching
  - Interactive chessboard display
  - Move navigation controls
  - Evaluation graph
  - Move statistics
  - Moves list

## API Endpoints

### GET `/`
Health check endpoint

### GET `/api/games/{username}`
Fetch recent Chess.com games for a user

### POST `/api/analyze`
Analyze a specific game with Stockfish

## Features Implemented

✅ Chess.com game fetching
✅ Stockfish engine analysis
✅ Move classification (Best, Good, Inaccuracy, Mistake, Blunder)
✅ Interactive chessboard
✅ Move navigation
✅ Evaluation graph
✅ Move statistics
✅ Responsive design with TailwindCSS
✅ TypeScript type safety
✅ Complete documentation

## Technology Stack

**Backend:**
- Python 3.8+
- FastAPI 0.109.0
- python-chess 1.999
- Stockfish chess engine
- uvicorn (ASGI server)

**Frontend:**
- Next.js 15.5.6
- React 18
- TypeScript 5
- TailwindCSS 3
- react-chessboard 5.7.0
- chess.js 1.x
- Recharts 2.x

## Running the Application

See [README.md](README.md) and [USAGE.md](USAGE.md) for detailed setup and usage instructions.
