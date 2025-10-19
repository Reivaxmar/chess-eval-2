'use client';

import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import axios from 'axios';
import { motion } from 'framer-motion';
import ChessBoard from './ChessBoard';
import EvalGraph from './EvalGraph';
import MoveInfo from './MoveInfo';

interface MoveAnalysis {
  move_number: number;
  move: string;
  eval_before: number | null;
  eval_after: number | null;
  classification: string;
  fen: string;
  from?: string;
  to?: string;
  best_move?: {
    move: string;
    from_square: string;
    to_square: string;
  } | null;
}

interface GameAnalysis {
  username: string;
  white_player: string;
  black_player: string;
  result: string;
  moves: MoveAnalysis[];
  pgn: string;
}

interface Game {
  index: number;
  white: string;
  black: string;
  result: string;
  time_class: string;
  url: string;
}

const API_BASE = 'http://localhost:8000';

export default function ChessAnalyzer() {
  const [username, setUsername] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [boardPosition, setBoardPosition] = useState('start');

  useEffect(() => {
    if (!analysis || currentMoveIndex < 0) {
      setBoardPosition('start');
    } else {
      setBoardPosition(analysis.moves[currentMoveIndex].fen);
    }
  }, [analysis, currentMoveIndex]);

  const fetchGames = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');
    setGames([]);
    setAnalysis(null);

    try {
      const response = await axios.get(`${API_BASE}/api/games/${username}`);
      setGames(response.data.games);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  const analyzeGame = async (gameIndex: number) => {
    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    setCurrentMoveIndex(-1);

    try {
      const response = await axios.post(`${API_BASE}/api/analyze`, {
        username,
        game_index: gameIndex,
      });

      // Parse the moves to extract from/to squares
      const chess = new Chess();
      const movesWithSquares = response.data.moves.map((move: MoveAnalysis) => {
        try {
          const moveObj = chess.move(move.move);
          return {
            ...move,
            from: moveObj?.from,
            to: moveObj?.to,
          };
        } catch {
          return move;
        }
      });

      setAnalysis({ ...response.data, moves: movesWithSquares });
      setSelectedGame(gameIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze game');
    } finally {
      setAnalyzing(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Chess.com Game Analyzer
        </h1>

        {/* Username Input */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <div className="flex gap-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Chess.com username"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && fetchGames()}
            />
            <button
              onClick={fetchGames}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Fetch Games'}
            </button>
          </div>
          {error && <p className="mt-2 text-red-600">{error}</p>}
        </motion.div>

        {/* Games List */}
        {games.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-md p-6 mb-6"
          >
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Recent Games</h2>
            <div className="grid gap-3">
              {games.map((game, idx) => (
                <motion.div
                  key={game.index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedGame === game.index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => analyzeGame(game.index)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {game.white} vs {game.black}
                    </span>
                    <span className="text-sm text-gray-600">
                      {game.time_class} • {game.result}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Analysis Loading */}
        {analyzing && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing game with Stockfish...</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && !analyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left Column: Board and Controls */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                  {analysis.white_player} vs {analysis.black_player}
                </h2>
                
                <ChessBoard
                  position={boardPosition}
                  currentMove={
                    currentMoveIndex >= 0 && analysis.moves[currentMoveIndex]
                      ? {
                          from: analysis.moves[currentMoveIndex].from || '',
                          to: analysis.moves[currentMoveIndex].to || '',
                          classification: analysis.moves[currentMoveIndex].classification,
                          best_move: analysis.moves[currentMoveIndex].best_move,
                        }
                      : null
                  }
                  onPositionChange={(fen: string) => {
                    // Update the controlled board position when a legal move is made on the board
                    setBoardPosition(fen);

                    // Try to match the new FEN to one of the analyzed moves and update currentMoveIndex
                    if (!analysis) return;
                    const foundIdx = analysis.moves.findIndex((m) => m.fen === fen);
                    if (foundIdx !== -1) {
                      setCurrentMoveIndex(foundIdx);
                    } else {
                      // If not found, set to last move if the FEN is identical to the final position
                      if (analysis.moves.length > 0 && analysis.moves[analysis.moves.length - 1].fen === fen) {
                        setCurrentMoveIndex(analysis.moves.length - 1);
                      }
                    }
                  }}
                />

                {/* Move Navigation */}
                <div className="flex gap-2 items-center justify-center mt-4">
                  <button
                    onClick={() => setCurrentMoveIndex(-1)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    disabled={currentMoveIndex === -1}
                  >
                    Start
                  </button>
                  <button
                    onClick={() => setCurrentMoveIndex(Math.max(-1, currentMoveIndex - 1))}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    disabled={currentMoveIndex <= -1}
                  >
                    ←
                  </button>
                  <span className="px-4 text-gray-700 font-medium">
                    {currentMoveIndex >= 0
                      ? `Move ${currentMoveIndex + 1}/${analysis.moves.length}`
                      : 'Start Position'}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentMoveIndex(Math.min(analysis.moves.length - 1, currentMoveIndex + 1))
                    }
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    disabled={currentMoveIndex >= analysis.moves.length - 1}
                  >
                    →
                  </button>
                  <button
                    onClick={() => setCurrentMoveIndex(analysis.moves.length - 1)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    disabled={currentMoveIndex === analysis.moves.length - 1}
                  >
                    End
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Evaluation Graph and Move Info */}
            <div className="space-y-6">
              <EvalGraph moves={analysis.moves} currentMoveIndex={currentMoveIndex} />
              <MoveInfo
                moves={analysis.moves}
                currentMoveIndex={currentMoveIndex}
                onMoveClick={(idx) => setCurrentMoveIndex(idx)}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

