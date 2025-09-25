"use client";
import React from 'react';

function Field({ label, value, onChange, step = 1 }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
      {label}
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg bg-zinc-800/60 text-white border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
      />
    </label>
  );
}

export default function PricingEstimator({ initialStudentFee, initialParentFee }) {
  const [students, setStudents] = React.useState(120);
  const [parents, setParents] = React.useState(90);
  const [studentFee, setStudentFee] = React.useState(initialStudentFee);
  const [parentFee, setParentFee] = React.useState(initialParentFee);

  const total = students * studentFee + parents * parentFee;
  const perStudentMonthly = (studentFee / 3).toFixed(2);
  const perParentMonthly = (parentFee / 3).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Students" value={students} onChange={setStudents} />
        <Field label="Parents" value={parents} onChange={setParents} />
        <Field label="Student Fee / Quarter (GHS)" value={studentFee} onChange={setStudentFee} step={0.5} />
        <Field label="Parent Fee / Quarter (GHS)" value={parentFee} onChange={setParentFee} step={0.5} />
      </div>
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-zinc-300 space-y-2">
        <div className="flex justify-between">
          <span>Quarterly Total</span>
          <span className="font-semibold text-white">GHS {total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Approx Monthly (all)</span>
          <span>GHS {(total / 3).toFixed(2)}</span>
        </div>
        <div className="text-xs text-zinc-500">
          Student monthly ≈ GHS {perStudentMonthly} • Parent monthly ≈ GHS {perParentMonthly}
        </div>
      </div>
    </div>
  );
}
