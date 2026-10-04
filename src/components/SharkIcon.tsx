// src/components/SharkIcon.tsx
export default function SharkIcon({ className = "size-6" }: { className?: string }) {
  return (
    // Remplacez ce SVG par votre propre code SVG de requin plus tard
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21.94 13.97A1 1 0 0 1 21 15a3.97 3.97 0 0 1-2.83-1.17l-1.34-1.34A5.95 5.95 0 0 1 12 15a5.95 5.95 0 0 1-4.83-2.51l-1.34 1.34A3.97 3.97 0 0 1 3 15a1 1 0 0 1-.94-1.03l.27-6.13a1 1 0 0 1 1.03-.84h17.4a1 1 0 0 1 1.03.84z" fill="blue"/>
      <path d="M12 3a3 3 0 0 0 3 3 3 3 0 0 0-3 3 3 3 0 0 0-3-3 3 3 0 0 0 3-3z" fill="black" transform="translate(0, 3)"/>
    </svg>
  )
}