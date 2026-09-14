interface TitleScreenProps {
  onStart: () => void
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <div className="w-full h-screen bg-[#0D1117] flex flex-col items-center justify-center gap-8">
      <h1 className="text-[#EDEBE6] text-2xl">ADRIAN CORNEJO</h1>
      <button
        onClick={onStart}
        className="text-[#5C7CBF] text-sm border-2 border-[#5C7CBF] px-6 py-3 animate-pulse"
      >
        PRESS START
      </button>
    </div>
  )
}