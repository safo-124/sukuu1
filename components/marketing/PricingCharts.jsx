"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PricingCharts({ studentFee, parentFee }) {
  const data = React.useMemo(() => {
    const rows = [];
    for (let i = 0; i <= 5; i++) {
      const qStudents = 50 + i * 40;
      const qParents = Math.round(qStudents * 0.75);
      const total = qStudents * studentFee + qParents * parentFee;
      rows.push({ quarter: `Q${i + 1}`, students: qStudents, parents: qParents, total });
    }
    return rows;
  }, [studentFee, parentFee]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 h-[320px] flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="quarter" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
          <Legend />
          <Line type="monotone" dataKey="students" stroke="#38bdf8" strokeWidth={2} />
          <Line type="monotone" dataKey="parents" stroke="#a855f7" strokeWidth={2} />
          <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
