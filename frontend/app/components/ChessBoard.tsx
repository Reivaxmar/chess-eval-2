'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  onPositionChange?: (fen: string) => void;
}

export default function ChessBoard({ position, currentMove, onPositionChange }: ChessBoardProps) {
  const chessRef = useRef(new Chess());

  // keep internal chess.js instance in sync when parent position changes
  useEffect(() => {
    try {
      // recreate chess instance with the new FEN so it has correct history/state
      chessRef.current = new Chess(position);
    } catch (e) {
      // fallback to fresh game if fen is invalid
      chessRef.current = new Chess();
    }
  }, [position]);
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
        // Prevent illegal moves by validating with chess.js. onPieceDrop should
        // return true when the consumer has applied the new position (controlled mode),
        // or false to trigger a snapback for illegal moves.
        onPieceDrop={(sourceSquare: string, targetSquare: string, piece: string) => {
          const chess = chessRef.current;
          // don't allow moves when game is over
          if (typeof chess.isGameOver === 'function' && chess.isGameOver()) return false;

          // only allow dragging pieces of the side to move
          if (piece && typeof piece === 'string') {
            const pieceColor = piece[0]; // 'w' or 'b'
            if (typeof chess.turn === 'function' && chess.turn && ((chess.turn() === 'w' && pieceColor !== 'w') || (chess.turn() === 'b' && pieceColor !== 'b'))) {
              return false;
            }
          }

          // try to make the move using chess.js (always promote to queen for simplicity)
          let move = null;
          try {
            move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
          } catch (e) {
            // chess.js may throw on invalid move strings in some versions; treat as illegal
            return false;
          }
          if (move === null) {
            return false; // illegal move -> snapback
          }

          // legal move; notify parent with new FEN so it can update controlled position
          try {
            const newFen = chess.fen();
            if (typeof onPositionChange === 'function') {
              onPositionChange(newFen);
            }
          } catch (e) {
            // ignore
          }

          return true;
        }}
        // control which pieces are draggable: only pieces matching the side to move
        isDraggablePiece={(args: { piece: string; sourceSquare: string }) => {
          const chess = chessRef.current;
          const piece = args?.piece;
          if (!piece) return false;
          if (typeof chess.isGameOver === 'function' && chess.isGameOver()) return false;
          const pieceColor = piece[0];
          return typeof chess.turn === 'function' ? pieceColor === chess.turn() : true;
        }}
      />
    </motion.div>
  );
}
