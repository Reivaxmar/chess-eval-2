'use client';

import { motion } from 'framer-motion';

interface EvalBarProps {
  evaluation: number | null;
  isMate?: boolean;
  mateInMoves?: number;
}

export default function EvalBar({ evaluation, isMate = false, mateInMoves }: EvalBarProps) {
  // Calculate the position of the dividing line
  // evaluation is in pawns from white's perspective
  // Positive = white winning, negative = black winning
  
  const getWhitePercentage = () => {
    if (isMate) {
      // If it's checkmate, fill the bar with the winning side's color
      if (mateInMoves !== undefined) {
        // Positive mate means white is winning, negative means black is winning
        return mateInMoves > 0 ? 100 : 0;
      }
      return evaluation !== null && evaluation > 0 ? 100 : 0;
    }
    
    if (evaluation === null) {
      // No evaluation available, show equal position
      return 50;
    }
    
    // Use a sigmoid-like function to map evaluation to percentage
    // This prevents extreme values from making the bar look too one-sided
    // At eval = 0, we want 50%
    // At eval = +3, we want ~80%
    // At eval = -3, we want ~20%
    // At eval = +6 or more, we want ~95%
    
    const clampedEval = Math.max(-10, Math.min(10, evaluation));
    
    // Sigmoid transformation: percentage = 50 + (50 * tanh(eval / 4))
    // This gives a nice smooth curve
    const percentage = 50 + (50 * Math.tanh(clampedEval / 4));
    
    return Math.max(0, Math.min(100, percentage));
  };

  const whitePercentage = getWhitePercentage();
  const blackPercentage = 100 - whitePercentage;

  return (
    <div className="flex flex-col h-full w-8 bg-gray-200 rounded-md overflow-hidden shadow-md">
      {/* Black section (top) */}
      <motion.div
        className="bg-gray-900"
        initial={{ height: `${blackPercentage}%` }}
        animate={{ height: `${blackPercentage}%` }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Optional: Display evaluation text for black side */}
        {isMate && mateInMoves !== undefined && mateInMoves < 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-white text-xs font-bold transform -rotate-90 whitespace-nowrap">
              M{Math.abs(mateInMoves)}
            </span>
          </div>
        )}
      </motion.div>
      
      {/* White section (bottom) */}
      <motion.div
        className="bg-white"
        initial={{ height: `${whitePercentage}%` }}
        animate={{ height: `${whitePercentage}%` }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Optional: Display evaluation text for white side */}
        {isMate && mateInMoves !== undefined && mateInMoves > 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-900 text-xs font-bold transform -rotate-90 whitespace-nowrap">
              M{Math.abs(mateInMoves)}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
