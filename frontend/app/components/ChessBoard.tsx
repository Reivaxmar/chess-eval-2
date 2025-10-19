'use client';

import { useState, useEffect, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';

interface ChessBoardProps {
  position: string;
  currentMove?: {
    from: string;
    to: string;
    classification: string;
  } | null;
}

export default function ChessBoard({ position, currentMove }: ChessBoardProps) {
  // Get the square to highlight with overlay
  const customSquareStyles = useMemo(() => {
    if (!currentMove) return {};

    // Determine overlay color based on classification
    let overlayColor = '';
    switch (currentMove.classification) {
      case 'Best':
      case 'Excellent':
        overlayColor = 'rgba(34, 197, 94, 0.4)'; // green
        break;
      case 'Good':
        overlayColor = 'rgba(59, 130, 246, 0.4)'; // blue
        break;
      case 'Inaccuracy':
        overlayColor = 'rgba(234, 179, 8, 0.5)'; // yellow
        break;
      case 'Mistake':
        overlayColor = 'rgba(249, 115, 22, 0.5)'; // orange
        break;
      case 'Blunder':
        overlayColor = 'rgba(239, 68, 68, 0.6)'; // red
        break;
      default:
        overlayColor = 'rgba(156, 163, 175, 0.3)'; // gray
    }

    return {
      [currentMove.to]: {
        backgroundColor: overlayColor,
        transition: 'background-color 0.3s ease',
      },
    };
  }, [currentMove]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-[500px] mx-auto"
    >
      <Chessboard
        position={position}
        boardOrientation="white"
        customSquareStyles={customSquareStyles}
        customBoardStyle={{
          borderRadius: '4px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
      />
    </motion.div>
  );
}
