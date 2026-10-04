export function ScooterCustomIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="5" cy="19.5" r="1.8" />
      <circle cx="5" cy="19.5" r="0.5" />
      <circle cx="18" cy="19.5" r="1.8" />
      <circle cx="18" cy="19.5" r="0.5" />
      <path d="M6.8 19.5H16.2" />
      <path d="M18 19.5V5" />
      <path d="M14 5H21" />
    </svg>
  )
}