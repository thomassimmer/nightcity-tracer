import { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface CyberSelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  className?: string;
}

export function CyberSelect({ label, value, onChange, options, className }: CyberSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`cyber-panel flex items-center px-3 relative ${className ?? 'py-1'}`} style={{ overflow: 'visible' }}>
      {label && <span className="text-[10px] text-gray-500 font-mono mr-2 shrink-0">{label}:</span>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label ? `${label}: ` : ''}${selected?.label ?? ''}`}
        className="flex items-center justify-between flex-1 text-xs font-bold text-neon outline-none cursor-pointer bg-transparent border-none"
      >
        <span className={selected?.color ?? ''}>{selected?.label}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
          className={`ml-2 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-theme-border bg-dark-main rounded overflow-hidden shadow-xl shadow-black/60">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-mono font-bold transition-colors cursor-pointer border-none bg-transparent
                ${opt.value === value
                  ? 'bg-theme-primary/15 text-theme-primary'
                  : `text-gray-400 hover:bg-white/5 ${opt.color ?? ''}`
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
