export default function BriefiLogo({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="white" />
      <g transform="rotate(-35, 20, 20)">
        <rect x="17" y="6" width="6" height="22" rx="1.5" stroke="#0B1B36" strokeWidth="1.8" fill="none"/>
        <polygon points="17,28 23,28 20,34" stroke="#0B1B36" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
        <rect x="17" y="6" width="6" height="4" rx="1.5" fill="#0B1B36"/>
      </g>
      <path
        d="M10 32 Q16 28 22 30 Q28 32 34 28"
        stroke="#6C35FF"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}