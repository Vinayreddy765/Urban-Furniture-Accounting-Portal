import React from 'react';

export function Field({ label, children, hint }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-inksoft">{hint}</span>}
    </label>
  );
}

const baseInput =
  'w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-inksoft/60 focus:border-walnut';

export function Input(props) {
  return <input {...props} className={`${baseInput} ${props.className || ''}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${baseInput} ${props.className || ''}`}>
      {children}
    </select>
  );
}

export function TextArea(props) {
  return <textarea {...props} className={`${baseInput} ${props.className || ''}`} />;
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-walnut text-surface hover:bg-walnut-dark',
    secondary: 'border border-line bg-surface text-ink hover:bg-paper',
    danger: 'border border-brick text-brick hover:bg-brick-light',
    ghost: 'text-walnut hover:bg-paper',
  };
  return (
    <button
      {...props}
      className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-paper text-inksoft border-line',
    good: 'bg-sage-light text-sage border-sage',
    bad: 'bg-brick-light text-brick border-brick',
    brass: 'bg-brass-light text-brass-dark border-brass',
  };
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
