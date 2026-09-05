import React from 'react';

export default function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink/80 pb-4">
      <div>
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-inksoft">{description}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
