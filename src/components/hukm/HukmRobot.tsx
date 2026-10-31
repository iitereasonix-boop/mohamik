// The «حُكم» mascot: a small navy robot with a gold antenna and a balance scale.
export default function HukmRobot({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 130" width={size} height={size * (130 / 120)} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hukm-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#24375f" />
          <stop offset="100%" stopColor="#111e3a" />
        </linearGradient>
      </defs>
      {/* antenna */}
      <path d="M60 22V10" stroke="#8795ae" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="8" r="6" fill="#d4af6a" />
      {/* arms */}
      <rect x="14" y="80" width="13" height="32" rx="6.5" fill="url(#hukm-shell)" stroke="#3a4d76" transform="rotate(10 20 96)" />
      <rect x="93" y="80" width="13" height="32" rx="6.5" fill="url(#hukm-shell)" stroke="#3a4d76" transform="rotate(-10 100 96)" />
      {/* body */}
      <rect x="27" y="74" width="66" height="46" rx="16" fill="url(#hukm-shell)" stroke="#3a4d76" />
      <rect x="40" y="118" width="40" height="8" rx="4" fill="#111e3a" stroke="#3a4d76" />
      {/* balance scale on the chest */}
      <g fill="none" stroke="#d4af6a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 86v22M51 108h18M45 91h30" />
        <path d="M45 91l-6 11h12zM75 91l-6 11h12z" />
      </g>
      {/* head */}
      <rect x="20" y="22" width="80" height="58" rx="26" fill="url(#hukm-shell)" stroke="#3a4d76" />
      <rect x="31" y="34" width="58" height="35" rx="17" fill="#070d1b" />
      {/* face */}
      <g className="hukm-eyes">
        <circle cx="47" cy="48" r="5.5" fill="#f1dfb3" />
        <circle cx="73" cy="48" r="5.5" fill="#f1dfb3" />
      </g>
      <path d="M52 58q8 7 16 0" fill="none" stroke="#d4af6a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
