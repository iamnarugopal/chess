import type {
  GameResult,
  PlayerColor,
} from "./types";

type GameResultModalProps = {
  result: NonNullable<GameResult>;
  playerColor: PlayerColor;
  onPlayAgain: (color: PlayerColor) => void;
  onClose: () => void;
};

export default function GameResultModal({
  result,
  playerColor,
  onPlayAgain,
  onClose,
}: GameResultModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/5 text-3xl">
          {result.title.includes("won")
            ? "🏆"
            : result.title === "Draw"
              ? "🤝"
              : "♟️"}
        </div>

        <h2 className="text-3xl font-bold">
          {result.title}
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          {result.message}
        </p>

        <button
          type="button"
          onClick={() => onPlayAgain(playerColor)}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          Play Again
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-lg border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5"
        >
          View Board
        </button>
      </div>
    </div>
  );
}