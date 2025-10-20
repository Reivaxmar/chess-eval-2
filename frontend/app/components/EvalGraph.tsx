'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, ReferenceDot } from 'recharts';
import { motion } from 'framer-motion';

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
  const chartData = moves.map((move, idx) => {
    // Determine if this is a bad move (inaccuracy or worse)
    const isBadMove = ['Inaccuracy', 'Mistake', 'Blunder'].includes(move.classification);
    
    // For mate scores, use a fixed value for display (e.g., +10 for white mate, -10 for black mate)
    let displayEval = move.eval_after;
    if (move.is_mate_after && move.mate_in_after !== null && move.mate_in_after !== undefined) {
      // Positive mate_in means white is winning, negative means black is winning
      displayEval = move.mate_in_after > 0 ? 10 : -10;
    }
    
    return {
      moveNumber: move.move_number,
      evaluation: displayEval,
      name: `${move.move_number}. ${move.move}`,
      isCurrentMove: idx === currentMoveIndex,
      isBadMove: isBadMove,
      classification: move.classification,
      isMate: move.is_mate_after ?? false,
      mateIn: move.mate_in_after ?? null,
      moveIndex: idx,
    };
  });

  // Calculate dynamic domain to ensure 0 is centered
  const evaluations = chartData
    .map(d => d.evaluation)
    .filter((e): e is number => e !== null);
  
  const maxAbsEval = evaluations.length > 0 
    ? Math.max(...evaluations.map(e => Math.abs(e)))
    : 10;
  
  // Set domain to symmetric around 0, with minimum of 3 and maximum of 20
  const domainLimit = Math.min(Math.max(Math.ceil(maxAbsEval + 1), 3), 20);

  // Custom tooltip to show move and evaluation
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-md">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.isMate && data.mateIn !== null 
              ? `M${Math.abs(data.mateIn)}` 
              : `Eval: ${data.evaluation !== null ? data.evaluation.toFixed(2) : 'N/A'}`}
          </p>
          <p className="text-sm">
            <span className={
              data.classification === 'Best' || data.classification === 'Excellent' ? 'text-green-600' :
              data.classification === 'Good' ? 'text-blue-600' :
              data.classification === 'Inaccuracy' ? 'text-yellow-600' :
              data.classification === 'Mistake' ? 'text-orange-600' :
              data.classification === 'Blunder' ? 'text-red-600' : 'text-gray-600'
            }>
              {data.classification}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Evaluation Chart</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart 
          data={chartData}
          onClick={(data: any) => {
            if (data && data.activeLabel !== undefined) {
              // activeLabel contains the moveNumber (x-axis value)
              // Find the corresponding move index
              const moveNumber = data.activeLabel;
              const idx = chartData.findIndex(d => d.moveNumber === moveNumber);
              if (onMoveClick && idx !== -1) {
                onMoveClick(idx);
              }
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="moveNumber" 
            label={{ value: 'Move Number', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            // Invert the domain so that positive (white advantage) is at bottom
            domain={[domainLimit, -domainLimit]}
            label={{ value: 'Evaluation (White bottom, Black top)', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => {
              // Show mate notation for extreme values
              if (value >= 10) return 'M (B)';
              if (value <= -10) return 'M (W)';
              return value.toFixed(1);
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          
          {/* Mark bad moves with reference dots on top of the graph */}
          {chartData.map((data, idx) => {
            if (data.isBadMove && data.evaluation !== null) {
              const color = 
                data.classification === 'Inaccuracy' ? '#eab308' :
                data.classification === 'Mistake' ? '#f97316' : '#ef4444';
              
              return (
                <ReferenceDot
                  key={`bad-move-${idx}`}
                  x={data.moveNumber}
                  y={data.evaluation}
                  r={5}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                  label={{
                    value: data.classification === 'Blunder' ? '!!' : '!',
                    position: 'top',
                    fill: color,
                    fontSize: 14,
                    fontWeight: 'bold'
                  }}
                />
              );
            }
            return null;
          })}
          
          <Line 
            type="monotone" 
            dataKey="evaluation" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload, index } = props;
              const key = payload?.moveNumber !== undefined ? `${payload.moveNumber}-${index}` : `dot-${index}`;
              if (payload.isCurrentMove) {
                return (
                  <circle
                    key={key}
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="#3b82f6"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }
              return (
                <circle
                  key={key}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill="#3b82f6"
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
