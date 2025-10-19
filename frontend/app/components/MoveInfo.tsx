'use client';

import { motion } from 'framer-motion';

interface MoveData {
  move_number: number;
  move: string;
  eval_before: number | null;
  eval_after: number | null;
  classification: string;
  fen: string;
  accuracy?: number | null;
}

interface MoveInfoProps {
  moves: MoveData[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
  whiteAccuracy?: number | null;
  blackAccuracy?: number | null;
}

export default function MoveInfo({ moves, currentMoveIndex, onMoveClick, whiteAccuracy, blackAccuracy }: MoveInfoProps) {
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Best':
        return 'text-green-600 bg-green-50';
      case 'Excellent':
        return 'text-green-600 bg-green-50';
      case 'Good':
        return 'text-blue-600 bg-blue-50';
      case 'Inaccuracy':
        return 'text-yellow-600 bg-yellow-50';
      case 'Mistake':
        return 'text-orange-600 bg-orange-50';
      case 'Blunder':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Calculate move statistics
  const getMoveStats = () => {
    const stats: Record<string, number> = {
      Best: 0,
      Excellent: 0,
      Good: 0,
      Inaccuracy: 0,
      Mistake: 0,
      Blunder: 0,
    };

    moves.forEach((move) => {
      if (move.classification in stats) {
        stats[move.classification]++;
      }
    });

    // Calculate accuracy as percentage of good moves
    const totalMoves = moves.length;
    const goodMoves = stats.Best + stats.Excellent + stats.Good;
    const accuracy = totalMoves > 0 ? ((goodMoves / totalMoves) * 100).toFixed(1) : '0.0';

    return { stats, accuracy };
  };

  const { stats, accuracy } = getMoveStats();

  return (
    <div className="space-y-6">
      {/* Current Move Display */}
      {currentMoveIndex >= 0 && moves[currentMoveIndex] && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Current Move</h3>
          <div className="text-center">
            <span className="text-2xl font-bold">
              {moves[currentMoveIndex].move_number}. {moves[currentMoveIndex].move}
            </span>
            <span
              className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${getClassificationColor(
                moves[currentMoveIndex].classification
              )}`}
            >
              {moves[currentMoveIndex].classification}
            </span>
          </div>
          {moves[currentMoveIndex].accuracy !== null && moves[currentMoveIndex].accuracy !== undefined && typeof moves[currentMoveIndex].accuracy === 'number' && (
            <p className="text-center mt-2 text-lg font-semibold text-indigo-600">
              Accuracy: {moves[currentMoveIndex].accuracy.toFixed(1)}%
            </p>
          )}
          {moves[currentMoveIndex].eval_after !== null && (
            <p className="text-center mt-1 text-gray-600">
              Evaluation: {moves[currentMoveIndex].eval_after.toFixed(2)}
            </p>
          )}
        </motion.div>
      )}

      {/* Move Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Move Statistics</h3>
        
        {/* Overall Game Accuracy (Lichess-style) */}
        {(whiteAccuracy !== null && whiteAccuracy !== undefined) || (blackAccuracy !== null && blackAccuracy !== undefined) ? (
          <div className="mb-4 space-y-2">
            {whiteAccuracy !== null && whiteAccuracy !== undefined && (
              <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-md font-semibold text-gray-900">White Accuracy</span>
                  <span className="text-xl font-bold text-slate-700">{whiteAccuracy.toFixed(1)}%</span>
                </div>
              </div>
            )}
            {blackAccuracy !== null && blackAccuracy !== undefined && (
              <div className="p-3 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-md font-semibold text-white">Black Accuracy</span>
                  <span className="text-xl font-bold text-white">{blackAccuracy.toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
        
        {/* Classification-based Accuracy Summary */}
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Move Quality</span>
            <span className="text-2xl font-bold text-blue-600">{accuracy}%</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {stats.Best + stats.Excellent + stats.Good} / {moves.length} moves classified as good or better
          </p>
        </div>

        {/* Classification Breakdown */}
        <div className="space-y-2">
          {Object.entries(stats).map(([classification, count]) => (
            <div key={classification} className="flex justify-between items-center">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getClassificationColor(
                  classification
                )}`}
              >
                {classification}
              </span>
              <span className="text-gray-700 font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Moves List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Moves</h3>
        <div className="max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {moves.map((move, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  currentMoveIndex === idx
                    ? 'bg-blue-50 border border-blue-300'
                    : 'border border-gray-200'
                }`}
                onClick={() => onMoveClick(idx)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {move.move_number}. {move.move}
                  </span>
                  <div className="flex gap-2 items-center">
                    {move.accuracy !== null && move.accuracy !== undefined && typeof move.accuracy === 'number' && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                        {move.accuracy.toFixed(1)}%
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getClassificationColor(
                        move.classification
                      )}`}
                    >
                      {move.classification}
                    </span>
                  </div>
                </div>
                {move.eval_after !== null && (
                  <p className="text-sm text-gray-600 mt-1">
                    Eval: {move.eval_after.toFixed(2)}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
