import React from 'react';

export default function EmptyState({ label, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-line py-16 text-center">
      <p className="text-sm text-inksoft">{label}</p>
      {action}
    </div>
  );
}
