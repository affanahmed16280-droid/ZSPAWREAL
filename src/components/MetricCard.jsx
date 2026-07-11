import React from 'react';

export default function MetricCard({ icon: Icon, label, value, gradient, delay = '0ms' }) {
  return (
    <div
      className="glass-card p-4 animate-fade-in flex-shrink-0 min-w-[140px]"
      style={{ animationDelay: delay }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gradient}`}>
        <Icon className="text-xl text-white" />
      </div>
      <p className="text-2xl font-bold text-white mt-3 tracking-tight">{value}</p>
      <p className="text-xs text-white/50 mt-1 font-medium">{label}</p>
    </div>
  );
}
