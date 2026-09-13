export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#4f8cff" fillOpacity="0.15" stroke="#4f8cff" strokeWidth="1.5" />
      <polyline points="6,22 11,15 15,18 20,10 26,13" fill="none" stroke="#4f8cff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="10" r="2" fill="#16c784" />
    </svg>
  )
}
