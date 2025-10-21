'use client';

import EvalGraph from '../components/EvalGraph';
import { useState } from 'react';

export default function TestGraph() {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  
  // Mock data with various move classifications
  const mockMoves = [
    { move_number: 1, move: 'e4', eval_after: 0.3, classification: 'Best', is_mate_after: false, mate_in_after: null },
    { move_number: 1, move: 'e5', eval_after: 0.2, classification: 'Best', is_mate_after: false, mate_in_after: null },
    { move_number: 2, move: 'Nf3', eval_after: 0.4, classification: 'Excellent', is_mate_after: false, mate_in_after: null },
    { move_number: 2, move: 'Nc6', eval_after: 0.3, classification: 'Best', is_mate_after: false, mate_in_after: null },
    { move_number: 3, move: 'Bc4', eval_after: 0.5, classification: 'Best', is_mate_after: false, mate_in_after: null },
    { move_number: 3, move: 'd6', eval_after: 1.2, classification: 'Inaccuracy', is_mate_after: false, mate_in_after: null },
    { move_number: 4, move: 'd4', eval_after: 1.5, classification: 'Best', is_mate_after: false, mate_in_after: null },
    { move_number: 4, move: 'Bg4', eval_after: 3.0, classification: 'Mistake', is_mate_after: false, mate_in_after: null },
    { move_number: 5, move: 'dxe5', eval_after: 3.2, classification: 'Best', is_mate_after: false, mate_in_after: null },
    { move_number: 5, move: 'dxe5', eval_after: 6.5, classification: 'Blunder', is_mate_after: false, mate_in_after: null },
    { move_number: 6, move: 'Qxd8+', eval_after: 7.0, classification: 'Best', is_mate_after: false, mate_in_after: null },
    { move_number: 6, move: 'Kxd8', eval_after: 7.0, classification: 'Best', is_mate_after: false, mate_in_after: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Evaluation Graph Test
        </h1>
        <div className="max-w-4xl mx-auto">
          <EvalGraph 
            moves={mockMoves}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={(idx) => setCurrentMoveIndex(idx)}
          />
          
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Controls</h3>
            <div className="flex gap-2 items-center justify-center">
              <button
                onClick={() => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={currentMoveIndex === 0}
              >
                Previous
              </button>
              <span className="px-4 text-gray-700 font-medium">
                Move {currentMoveIndex + 1}/{mockMoves.length}
              </span>
              <button
                onClick={() => setCurrentMoveIndex(Math.min(mockMoves.length - 1, currentMoveIndex + 1))}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={currentMoveIndex === mockMoves.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
