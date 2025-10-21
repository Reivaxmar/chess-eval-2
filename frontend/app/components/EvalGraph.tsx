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
    const isBadMove = ['Inaccuracy', 'Mistake', 'Blunder'].includes(move.classification);
    
    let displayEval = move.eval_after;
    if (move.is_mate_after && move.mate_in_after !== null && move.mate_in_after !== undefined) {
      displayEval = move.mate_in_after > 0 ? 10 : -10;
    }
    
    const isWhiteMove = idx % 2 === 0;
    const displayMoveNumber = isWhiteMove ? `${move.move_number}.` : `${move.move_number}...`;
    
    return {
      moveIndex: idx,
      moveNumber: move.move_number,
      evaluation: displayEval,
      name: `${displayMoveNumber} ${move.move}`,
      isCurrentMove: idx === currentMoveIndex,
      isBadMove: isBadMove,
      classification: move.classification,
      isMate: move.is_mate_after ?? false,
      mateIn: move.mate_in_after ?? null,
    };
  });

  const evaluations = chartData
    .map(d => d.evaluation)
    .filter((e): e is number => e !== null);
  
  const maxAbsEval = evaluations.length > 0 
    ? Math.max(...evaluations.map(e => Math.abs(e)))
    : 10;
  
  const domainLimit = Math.min(Math.max(Math.ceil(maxAbsEval + 1), 3), 20);

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
    const getY = (value: number) => {
      // Map from [-domainLimit, domainLimit] to [padding.top, padding.top + chartHeight]
      // Negative values (black advantage) at top, positive (white advantage) at bottom
      const normalized = (domainLimit - value) / (2 * domainLimit);
      return padding.top + normalized * chartHeight;
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
          data.classification === 'Mistake' ? '#f97316' : '#ef4444';
        
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
    
    for (let i = 0; i <= 4; i++) {
      const value = domainLimit - (i / 4) * (2 * domainLimit);
      const y = padding.top + (i / 4) * chartHeight;
      const label = value >= 10 ? 'M (W)' : value <= -10 ? 'M (B)' : value.toFixed(1);
      ctx.fillText(label, padding.left - 10, y);
    }

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

  }, [chartData, domainLimit, currentMoveIndex]);

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
          const normalized = (domainLimit - data.evaluation) / (2 * domainLimit);
          const y = padding.top + normalized * chartHeight;
          
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
                : `Eval: ${tooltipData.data.evaluation !== null ? tooltipData.data.evaluation.toFixed(2) : 'N/A'}`}
            </p>
            <p className="text-sm">
              <span className={
                tooltipData.data.classification === 'Best' || tooltipData.data.classification === 'Excellent' ? 'text-green-600' :
                tooltipData.data.classification === 'Good' ? 'text-blue-600' :
                tooltipData.data.classification === 'Inaccuracy' ? 'text-yellow-600' :
                tooltipData.data.classification === 'Mistake' ? 'text-orange-600' :
                tooltipData.data.classification === 'Blunder' ? 'text-red-600' : 'text-gray-600'
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
