'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

interface MoveData {
  move_number: number;
  move: string;
  eval_after: number | null;
}

interface EvalGraphProps {
  moves: MoveData[];
  currentMoveIndex: number;
}

export default function EvalGraph({ moves, currentMoveIndex }: EvalGraphProps) {
  const chartData = moves.map((move, idx) => ({
    moveNumber: move.move_number,
    evaluation: move.eval_after,
    name: `${move.move_number}. ${move.move}`,
    isCurrentMove: idx === currentMoveIndex,
  }));

  // Calculate dynamic domain to ensure 0 is centered
  const evaluations = chartData
    .map(d => d.evaluation)
    .filter((e): e is number => e !== null);
  
  const maxAbsEval = evaluations.length > 0 
    ? Math.max(...evaluations.map(e => Math.abs(e)))
    : 10;
  
  // Set domain to symmetric around 0, with minimum of 3 and maximum of 20
  const domainLimit = Math.min(Math.max(Math.ceil(maxAbsEval + 1), 3), 20);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Evaluation Chart</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="moveNumber" 
            label={{ value: 'Move Number', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            domain={[-domainLimit, domainLimit]}
            label={{ value: 'Evaluation (White\'s perspective)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-md">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm text-gray-600">
                      Eval: {data.evaluation !== null ? data.evaluation.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="evaluation" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.isCurrentMove) {
                return (
                  <circle
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
