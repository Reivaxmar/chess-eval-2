'use client';

import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MoveAnalysis {
  move_number: number;
  move: string;
  eval_before: number | null;
  eval_after: number | null;
  classification: string;
  fen: string;
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
      const response = await fetch(`${API_BASE}/api/games/${username}`);
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      setGames(data.games);
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
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          game_index: gameIndex,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze game');
      }

      const data = await response.json();
      setAnalysis(data);
      setSelectedGame(gameIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze game');
    } finally {
      setAnalyzing(false);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Best':
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

  const getEvalChartData = () => {
    if (!analysis) return [];
    
    return analysis.moves.map((move, idx) => ({
      moveNumber: move.move_number,
      evaluation: move.eval_after,
      name: `${move.move_number}. ${move.move}`,
    }));
  };

  const getMoveStats = () => {
    if (!analysis) return null;

    const stats = {
      Best: 0,
      Good: 0,
      Inaccuracy: 0,
      Mistake: 0,
      Blunder: 0,
    };

    analysis.moves.forEach((move) => {
      if (move.classification in stats) {
        stats[move.classification as keyof typeof stats]++;
      }
    });

    return stats;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Chess.com Game Analyzer
        </h1>

        {/* Username Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
        </div>

        {/* Games List */}
        {games.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Recent Games</h2>
            <div className="grid gap-3">
              {games.map((game) => (
                <div
                  key={game.index}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
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
                </div>
              ))}
            </div>
          </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Board and Controls */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                  {analysis.white_player} vs {analysis.black_player}
                </h2>
                <div className="mb-4 max-w-[500px] mx-auto">
                  <Chessboard
                    options={{
                      position: boardPosition,
                      boardOrientation: 'white',
                      boardStyle: {
                        borderRadius: '4px',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                      },
                    }}
                  />
                </div>

                {/* Move Navigation */}
                <div className="flex gap-2 items-center justify-center">
                  <button
                    onClick={() => setCurrentMoveIndex(-1)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    disabled={currentMoveIndex === -1}
                  >
                    Start
                  </button>
                  <button
                    onClick={() => setCurrentMoveIndex(Math.max(-1, currentMoveIndex - 1))}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    disabled={currentMoveIndex <= -1}
                  >
                    ←
                  </button>
                  <span className="px-4 text-gray-700">
                    {currentMoveIndex >= 0
                      ? `Move ${currentMoveIndex + 1}/${analysis.moves.length}`
                      : 'Start Position'}
                  </span>
                  <button
                    onClick={() => setCurrentMoveIndex(Math.min(analysis.moves.length - 1, currentMoveIndex + 1))}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    disabled={currentMoveIndex >= analysis.moves.length - 1}
                  >
                    →
                  </button>
                  <button
                    onClick={() => setCurrentMoveIndex(analysis.moves.length - 1)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    disabled={currentMoveIndex === analysis.moves.length - 1}
                  >
                    End
                  </button>
                </div>

                {/* Current Move Info */}
                {currentMoveIndex >= 0 && analysis.moves[currentMoveIndex] && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <span className="text-lg font-semibold">
                        {analysis.moves[currentMoveIndex].move}
                      </span>
                      <span
                        className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${getClassificationColor(
                          analysis.moves[currentMoveIndex].classification
                        )}`}
                      >
                        {analysis.moves[currentMoveIndex].classification}
                      </span>
                    </div>
                    {analysis.moves[currentMoveIndex].eval_after !== null && (
                      <p className="text-center mt-2 text-gray-600">
                        Eval: {analysis.moves[currentMoveIndex].eval_after?.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Move Statistics */}
              {getMoveStats() && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Move Statistics</h3>
                  <div className="space-y-2">
                    {Object.entries(getMoveStats()!).map(([classification, count]) => (
                      <div key={classification} className="flex justify-between items-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getClassificationColor(classification)}`}>
                          {classification}
                        </span>
                        <span className="text-gray-700 font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Evaluation Graph and Moves */}
            <div className="space-y-6">
              {/* Evaluation Graph */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Evaluation Chart</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getEvalChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="moveNumber" />
                    <YAxis domain={[-10, 10]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="evaluation" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Moves List */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Moves</h3>
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {analysis.moves.map((move, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                          currentMoveIndex === idx ? 'bg-blue-50 border border-blue-300' : 'border border-gray-200'
                        }`}
                        onClick={() => setCurrentMoveIndex(idx)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {move.move_number}. {move.move}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getClassificationColor(move.classification)}`}>
                            {move.classification}
                          </span>
                        </div>
                        {move.eval_after !== null && (
                          <p className="text-sm text-gray-600 mt-1">
                            Eval: {move.eval_after.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

