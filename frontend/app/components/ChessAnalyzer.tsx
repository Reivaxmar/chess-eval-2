'use client';

import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchGames = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');
    setGames([]);
    setHasMore(false);

    try {
      const response = await axios.get(`${API_BASE}/api/games/${username}`, {
        params: { offset: 0, limit: 20 }
      });
      setGames(response.data.games);
      setHasMore(response.data.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreGames = async () => {
    if (!username.trim() || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE}/api/games/${username}`, {
        params: { offset: games.length, limit: 20 }
      });
      setGames([...games, ...response.data.games]);
      setHasMore(response.data.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more games');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleGameClick = (gameIndex: number) => {
    // Navigate to the analysis page with gameId format: "username-index"
    router.push(`/analysis/${username}-${gameIndex}`);
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
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border-gray-200`}
                  onClick={() => handleGameClick(game.index)}
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
            
            {/* Load More Button */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadMoreGames}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? 'Loading...' : 'Load More Games'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

