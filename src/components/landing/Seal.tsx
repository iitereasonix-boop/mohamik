// The Mohamik verification seal: an eight-pointed star (two squares at 45°)
// with a balance scale at its heart and a rotating ring of engraved text.
export default function Seal({ size = 420, animated = true }: { size?: number; animated?: boolean }) {
  const id = `seal-${size}`;
  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className="h-auto max-w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a6a32" />
          <stop offset="30%" stopColor="#f1dfb3" />
          <stop offset="50%" stopColor="#fff4d6" />
          <stop offset="70%" stopColor="#c9a15a" />
          <stop offset="100%" stopColor="#7a5c2a" />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#1a2d57" />
          <stop offset="100%" stopColor="#0a1428" />
        </radialGradient>
        <path id={`${id}-ring`} d="M200,200 m-158,0 a158,158 0 1,1 316,0 a158,158 0 1,1 -316,0" />
      </defs>

      {/* outer engraved ring */}
      <g className={animated ? "lux-spin" : undefined} style={{ transformOrigin: "200px 200px" }}>
        <circle cx="200" cy="200" r="186" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="0.8" opacity="0.7" />
        <circle cx="200" cy="200" r="172" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 6" />
        <text fill={`url(#${id}-gold)`} fontSize="15" letterSpacing="4" fontFamily="var(--font-amiri), serif">
          <textPath href={`#${id}-ring`} startOffset="0">
            مكتب موثّق ✦ عضوية نقابة معتمدة ✦ بيانات معزولة ✦ مكتب موثّق ✦ عضوية نقابة معتمدة ✦ بيانات معزولة ✦
          </textPath>
        </text>
      </g>

      {/* eight-pointed star */}
      <g className={animated ? "lux-spin-rev" : undefined} style={{ transformOrigin: "200px 200px" }}>
        <rect x="95" y="95" width="210" height="210" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="1.2" />
        <rect x="95" y="95" width="210" height="210" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="1.2" transform="rotate(45 200 200)" />
        <rect x="118" y="118" width="164" height="164" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="0.5" opacity="0.6" />
        <rect x="118" y="118" width="164" height="164" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="0.5" opacity="0.6" transform="rotate(45 200 200)" />
      </g>

      {/* core medallion */}
      <circle cx="200" cy="200" r="92" fill={`url(#${id}-core)`} stroke={`url(#${id}-gold)`} strokeWidth="1.5" />
      <circle cx="200" cy="200" r="82" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="0.5" opacity="0.6" />

      {/* balance scale */}
      <g
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? "lux-draw" : undefined}
      >
        <path d="M200 148v104" />
        <path d="M176 252h48" />
        <path d="M156 170h88" />
        <circle cx="200" cy="160" r="5" />
        <path d="M160 170l-18 40h36z" />
        <path d="M240 170l-18 40h36z" />
        <path d="M142 210a18 10 0 0 0 36 0" />
        <path d="M222 210a18 10 0 0 0 36 0" />
      </g>
    </svg>
  );
}
