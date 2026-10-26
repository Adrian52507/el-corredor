interface TitleScreenProps {
  onStart: () => void
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <button
        onClick={onStart}
        className="text-white text-xs sm:text-sm border-2 border-white px-8 py-4 hover:bg-white hover:text-black transition-colors"
      >
        <span>START</span>
      </button>
    </div>
  )
}
