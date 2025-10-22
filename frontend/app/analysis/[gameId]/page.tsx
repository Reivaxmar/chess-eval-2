'use client';

import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import ChessBoard from '../../components/ChessBoard';
import EvalGraph from '../../components/EvalGraph';
import MoveInfo from '../../components/MoveInfo';

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
  win_percent_before?: number | null;
  win_percent_after?: number | null;
  accuracy?: number | null;
  is_mate_before?: boolean | null;
  is_mate_after?: boolean | null;
  mate_in_before?: number | null;
  mate_in_after?: number | null;
}

interface GameAnalysis {
  username: string;
  white_player: string;
  black_player: string;
  result: string;
  moves: MoveAnalysis[];
  pgn: string;
  white_accuracy?: number | null;
  black_accuracy?: number | null;
}

const API_BASE = 'http://localhost:8000';

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [boardPosition, setBoardPosition] = useState('start');

  useEffect(() => {
    if (!analysis || currentMoveIndex < 0) {
      setBoardPosition('start');
    } else {
      setBoardPosition(analysis.moves[currentMoveIndex].fen);
    }
  }, [analysis, currentMoveIndex]);

  useEffect(() => {
    const analyzeGame = async () => {
      if (!gameId) return;
      
      setLoading(true);
      setError('');

      try {
        // Parse gameId which is in format "username-index"
        const parts = gameId.split('-');
        if (parts.length < 2) {
          throw new Error('Invalid game ID format');
        }
        
        const gameIndex = parseInt(parts[parts.length - 1], 10);
        const username = parts.slice(0, -1).join('-');

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze game');
      } finally {
        setLoading(false);
      }
    };

    analyzeGame();
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-md p-12 text-center max-w-md"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Game</h2>
          <p className="text-gray-600">
            Please wait while we analyze the game with Stockfish...
          </p>
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-8 max-w-md text-center"
        >
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Games
          </button>
        </motion.div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2"
          >
            ← Back to Games
          </button>
        </motion.div>

        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Game Analysis
        </h1>

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
                evaluation={
                  currentMoveIndex >= 0 && analysis.moves[currentMoveIndex]
                    ? analysis.moves[currentMoveIndex].eval_after
                    : null
                }
                isMate={
                  currentMoveIndex >= 0 && analysis.moves[currentMoveIndex]
                    ? analysis.moves[currentMoveIndex].is_mate_after ?? false
                    : false
                }
                mateInMoves={
                  currentMoveIndex >= 0 && analysis.moves[currentMoveIndex]
                    ? analysis.moves[currentMoveIndex].mate_in_after ?? undefined
                    : undefined
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
            <EvalGraph 
              moves={analysis.moves} 
              currentMoveIndex={currentMoveIndex}
              onMoveClick={(idx) => setCurrentMoveIndex(idx)}
            />
            <MoveInfo
              moves={analysis.moves}
              currentMoveIndex={currentMoveIndex}
              onMoveClick={(idx) => setCurrentMoveIndex(idx)}
              whiteAccuracy={analysis.white_accuracy}
              blackAccuracy={analysis.black_accuracy}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
