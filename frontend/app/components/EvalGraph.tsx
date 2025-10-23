'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface MoveData {
  move_number: number;
  move: string;
  eval_after: number | null;
  classification: string;
  is_mate_after?: boolean | null;
  mate_in_after?: number | null;
}

interface EvalGraphProps {
  moves: MoveData[];
  currentMoveIndex: number;
  onMoveClick?: (index: number) => void;
}

export default function EvalGraph({ moves, currentMoveIndex, onMoveClick }: EvalGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; data: any } | null>(null);

  const chartData = moves.map((move, idx) => {
    const isBadMove = ['Inaccuracy', 'Mistake', 'Blunder', 'Miss'].includes(move.classification);
    
    let displayEval = move.eval_after;
    if (move.is_mate_after && move.mate_in_after !== null && move.mate_in_after !== undefined) {
      // Use a large value for mate, but keep the sign
      displayEval = move.mate_in_after > 0 ? 100 : -100;
    } else if (displayEval !== null) {
      // Clamp extreme evaluations to ±10 to keep them on the graph
      displayEval = Math.max(-10, Math.min(10, displayEval));
    }
    
    const isWhiteMove = idx % 2 === 0;
    const displayMoveNumber = isWhiteMove ? `${move.move_number}.` : `${move.move_number}...`;
    
    return {
      moveIndex: idx,
      moveNumber: move.move_number,
      evaluation: displayEval,
      rawEvaluation: move.eval_after, // Keep the raw value for tooltip
      name: `${displayMoveNumber} ${move.move}`,
      isCurrentMove: idx === currentMoveIndex,
      isBadMove: isBadMove,
      classification: move.classification,
      isMate: move.is_mate_after ?? false,
      mateIn: move.mate_in_after ?? null,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = container.clientWidth;
    const height = 300;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Chart dimensions
    const padding = { top: 30, right: 20, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Helper functions
    const getX = (index: number) => padding.left + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
    
    // Non-linear transformation using tanh (same as EvalBar)
    const getY = (value: number) => {
      // For mate positions, show at the very top or bottom
      if (Math.abs(value) >= 100) {
        return value > 0 ? padding.top + chartHeight : padding.top;
      }
      
      // Use tanh transformation for non-linear scaling (same as EvalBar)
      // This maps eval to percentage, then to Y coordinate
      // At eval = 0, we want 50% (middle)
      // At eval = +3, we want ~80%
      // At eval = -3, we want ~20%
      const clampedEval = Math.max(-10, Math.min(10, value));
      
      // Sigmoid transformation: percentage = 50 + (50 * tanh(eval / 4))
      const percentage = 50 + (50 * Math.tanh(clampedEval / 4));
      
      // Convert percentage to Y coordinate (inverted: white at bottom, black at top)
      // percentage 100 = white winning = bottom of chart
      // percentage 0 = black winning = top of chart
      return padding.top + ((100 - percentage) / 100) * chartHeight;
    };

    // Draw white background for area under the line
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

    // Create path for the line
    const linePath = new Path2D();
    chartData.forEach((data, i) => {
      if (data.evaluation !== null) {
        const x = getX(i);
        const y = getY(data.evaluation);
        if (i === 0) {
          linePath.moveTo(x, y);
        } else {
          linePath.lineTo(x, y);
        }
      }
    });

    // Fill area above the line with black
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
    ctx.clip();
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    chartData.forEach((data, i) => {
      if (data.evaluation !== null) {
        const x = getX(i);
        const y = getY(data.evaluation);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    // Close path by going to top-right, then top-left
    if (chartData.length > 0) {
      ctx.lineTo(getX(chartData.length - 1), padding.top);
      ctx.lineTo(getX(0), padding.top);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();

    // Draw grid
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }
    
    // Vertical grid lines
    for (let i = 0; i <= chartData.length - 1; i += Math.ceil(chartData.length / 10)) {
      const x = getX(i);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);

    // Draw y=0 reference line
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    const y0 = getY(0);
    ctx.moveTo(padding.left, y0);
    ctx.lineTo(padding.left + chartWidth, y0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw the evaluation line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke(linePath);

    // Draw dots and bad move markers
    chartData.forEach((data, i) => {
      if (data.evaluation === null) return;
      
      const x = getX(i);
      const y = getY(data.evaluation);

      // Draw regular dot
      ctx.fillStyle = data.isCurrentMove ? '#3b82f6' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, data.isCurrentMove ? 6 : 3, 0, Math.PI * 2);
      ctx.fill();
      
      if (data.isCurrentMove) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw bad move marker
      if (data.isBadMove) {
        const color = 
          data.classification === 'Inaccuracy' ? '#eab308' :
          data.classification === 'Mistake' ? '#f97316' : 
          data.classification === 'Miss' ? '#a855f7' : '#ef4444';
        
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // Draw axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Draw Y-axis labels
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Draw labels at specific percentage points
    const labels = [
      { percent: 0, label: 'M (B)' },    // Top (black mate)
      { percent: 25, label: '+3' },       // 75% white winning
      { percent: 50, label: '0' },        // Equal
      { percent: 75, label: '-3' },       // 75% black winning
      { percent: 100, label: 'M (W)' },   // Bottom (white mate)
    ];
    
    labels.forEach(({ percent, label }) => {
      const y = padding.top + (percent / 100) * chartHeight;
      ctx.fillText(label, padding.left - 10, y);
    });

    // Draw X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i < chartData.length; i += Math.ceil(chartData.length / 10)) {
      const data = chartData[i];
      const x = getX(i);
      const isWhite = i % 2 === 0;
      const label = isWhite ? `${data.moveNumber}` : `${data.moveNumber}...`;
      ctx.fillText(label, x, padding.top + chartHeight + 10);
    }

    // Draw axis titles
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Evaluation (White bottom, Black top)', 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillText('Move Index', width / 2, height - 10);

  }, [chartData, currentMoveIndex]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onMoveClick) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const padding = { left: 60, right: 20 };
    const chartWidth = width - padding.left - padding.right;

    const relativeX = (x - padding.left) / chartWidth;
    const index = Math.round(relativeX * (chartData.length - 1));

    if (index >= 0 && index < chartData.length) {
      onMoveClick(index);
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, left: 60, right: 20, bottom: 50 };
    
    // Check if we're hovering over a data point
    const chartWidth = width - padding.left - padding.right;
    const relativeX = (x - padding.left) / chartWidth;
    const index = Math.round(relativeX * (chartData.length - 1));

    if (index >= 0 && index < chartData.length && chartData[index].evaluation !== null) {
      const dataX = padding.left + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
      const distance = Math.abs(x - dataX);
      
      if (distance < 10) {
        setHoveredIndex(index);
        setTooltipData({
          x: e.clientX,
          y: e.clientY,
          data: chartData[index]
        });
        return;
      }
    }

    setHoveredIndex(null);
    setTooltipData(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Evaluation Chart</h3>
      <div ref={containerRef} className="relative" style={{ width: '100%', height: 300 }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          onMouseLeave={() => {
            setHoveredIndex(null);
            setTooltipData(null);
          }}
          className="cursor-pointer"
        />
        
        {/* Render icons on top of canvas */}
        {chartData.map((data, idx) => {
          if (!data.isBadMove || data.evaluation === null || !containerRef.current) return null;
          
          const width = containerRef.current.clientWidth;
          const padding = { top: 30, left: 60, right: 20, bottom: 50 };
          const chartWidth = width - padding.left - padding.right;
          const chartHeight = 300 - padding.top - padding.bottom;
          
          const x = padding.left + (idx / Math.max(chartData.length - 1, 1)) * chartWidth;
          
          // Use the same non-linear transformation as in the canvas
          let y;
          if (Math.abs(data.evaluation) >= 100) {
            y = data.evaluation > 0 ? padding.top + chartHeight : padding.top;
          } else {
            const clampedEval = Math.max(-10, Math.min(10, data.evaluation));
            const percentage = 50 + (50 * Math.tanh(clampedEval / 4));
            y = padding.top + ((100 - percentage) / 100) * chartHeight;
          }
          
          const iconSize = 20;
          
          return (
            <div
              key={`icon-${idx}`}
              style={{
                position: 'absolute',
                left: x - iconSize / 2,
                top: y - iconSize / 2,
                width: iconSize,
                height: iconSize,
                pointerEvents: 'none'
              }}
            >
              <Image 
                src={`/icons/${data.classification}.png`}
                alt={data.classification}
                width={iconSize}
                height={iconSize}
                style={{ objectFit: 'contain' }}
              />
            </div>
          );
        })}
        
        {/* Tooltip */}
        {tooltipData && (
          <div
            style={{
              position: 'fixed',
              left: tooltipData.x + 10,
              top: tooltipData.y - 50,
              pointerEvents: 'none',
              zIndex: 1000
            }}
            className="bg-white p-3 border border-gray-200 rounded shadow-md"
          >
            <p className="font-semibold">{tooltipData.data.name}</p>
            <p className="text-sm text-gray-600">
              {tooltipData.data.isMate && tooltipData.data.mateIn !== null 
                ? `M${Math.abs(tooltipData.data.mateIn)}` 
                : tooltipData.data.rawEvaluation !== null && tooltipData.data.rawEvaluation !== undefined
                  ? `Eval: ${tooltipData.data.rawEvaluation.toFixed(2)}`
                  : `Eval: ${tooltipData.data.evaluation !== null ? tooltipData.data.evaluation.toFixed(2) : 'N/A'}`}
            </p>
            <p className="text-sm">
              <span className={
                tooltipData.data.classification === 'Best' || tooltipData.data.classification === 'Excellent' ? 'text-green-600' :
                tooltipData.data.classification === 'Good' ? 'text-teal-700' :
                tooltipData.data.classification === 'Inaccuracy' ? 'text-yellow-600' :
                tooltipData.data.classification === 'Mistake' ? 'text-orange-600' :
                tooltipData.data.classification === 'Blunder' ? 'text-red-600' : 
                tooltipData.data.classification === 'Miss' ? 'text-purple-600' : 'text-gray-600'
              }>
                {tooltipData.data.classification}
              </span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
