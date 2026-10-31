// The gold striped "M" of the Mohamik brand.
export default function MohamikMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 92" width={size} height={(size * 92) / 120} className={className} aria-hidden>
      <defs>
        <linearGradient id="mohamik-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1dfb3" />
          <stop offset="55%" stopColor="#d4af6a" />
          <stop offset="100%" stopColor="#9a7436" />
        </linearGradient>
      </defs>
      <g fill="url(#mohamik-gold)">
        <path d="M0 0h20l40 66v26L14 16v76H0z" />
        <path d="M24 0h10l26 43v13z" />
        <path d="M120 0h-20L60 66v26l46-76v76h14z" />
        <path d="M96 0H86L60 43v13z" />
        <path d="M22 36l7 11v45h-7z" />
        <path d="M98 36l-7 11v45h7z" />
      </g>
    </svg>
  );
}
