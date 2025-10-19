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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [boardWidth, setBoardWidth] = useState<number>(0);

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

  // Measure board width to compute square coordinates for overlays
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setBoardWidth(containerRef.current.clientWidth);
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
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
        overlayColor = 'rgba(94, 129, 87, 0.45)'; // greyish-green
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
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
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

        {/* Move classification icon overlay */}
        {currentMove && currentMove.to && currentMove.classification && boardWidth > 0 && (() => {
          // map classification to an icon filename. Put your PNGs in `frontend/public/icons/`
          const map: Record<string, string> = {
            best: 'best.png',
            excellent: 'excellent.png',
            good: 'good.png',
            inaccuracy: 'inaccuracy.png',
            mistake: 'mistake.png',
            blunder: 'blunder.png',
          };

          const clsKey = String(currentMove.classification).toLowerCase();
          const iconFile = map[clsKey];
          if (!iconFile) return null;

          // Compute square position (top-left corner in pixels)
          const squareSize = boardWidth / 8;
          // file: a-h -> 0..7, rank: 1-8
          const file = currentMove.to[0];
          const rank = parseInt(currentMove.to[1], 10);
          const fileIdx = 'abcdefgh'.indexOf(file);
          // row index from top: for white orientation row 0 is rank 8, so row = 8 - rank
          const rowIdx = 8 - rank;

          const x = fileIdx * squareSize;
          const y = rowIdx * squareSize;

          const iconSize = Math.min(32, Math.max(16, Math.floor(squareSize * 0.35)));
          const padding = 4;
          const left = x + squareSize - iconSize - padding;
          const top = y + padding;

          const src = `/icons/${iconFile}`;

          return (
            <img
              src={src}
              alt={currentMove.classification}
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${iconSize}px`,
                height: `${iconSize}px`,
                pointerEvents: 'none',
                zIndex: 50,
              }}
            />
          );
        })()}
      </div>
    </motion.div>
  );
}
