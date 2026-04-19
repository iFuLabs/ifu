export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="text-center">
        <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg viewBox="0 0 16 16" fill="none" className="w-8 h-8">
            <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 6L10.5 7.5V10.5L8 12L5.5 10.5V7.5L8 6Z" fill="white"/>
          </svg>
        </div>
        <p className="font-mono text-sm text-muted">Loading iFu Comply...</p>
      </div>
    </div>
  )
}
