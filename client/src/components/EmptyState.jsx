import React from 'react';
export default function EmptyState({ title, subtitle, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
      {Icon && <Icon size={36} className="mb-3 text-slate-600" />}
      <p className="font-medium text-slate-300">{title}</p>
      {subtitle && <p className="text-sm mt-1 max-w-sm">{subtitle}</p>}
    </div>
  );
}
