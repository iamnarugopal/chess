import { Slider } from "@base-ui/react/slider";

import { MAX_ELO, MIN_ELO, boardThemes, type ThemeName } from "./constants";

import type { GameResult, PlayerColor } from "./types";

import { getDifficultyLabel } from "./utils";

type ChessSettingsProps = {
  playerColor: PlayerColor;
  boardTheme: ThemeName;
  stockfishElo: number;
  soundEnabled: boolean;
  gameResult: GameResult;
  currentTurn: PlayerColor;
  canTakeBack: boolean;

  showPlayAs?: boolean;
  showTakeBack?: boolean;

  onStartNewGame: (color: PlayerColor) => void;
  onThemeChange: (theme: ThemeName) => void;
  onEloChange: (elo: number) => void;
  onSoundToggle: () => void;
  onTakeBack: () => void;
};

export default function ChessSettings({
  playerColor,
  boardTheme,
  stockfishElo,
  soundEnabled,
  gameResult,
  currentTurn,
  canTakeBack,

  showPlayAs = true,
  showTakeBack = true,

  onStartNewGame,
  onThemeChange,
  onEloChange,
  onSoundToggle,
  onTakeBack,
}: ChessSettingsProps) {
  const difficultyLabel = getDifficultyLabel(stockfishElo);

  return (
    <div className="flex flex-col gap-6">
      {/* Play as */}
      {showPlayAs && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Play as</h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onStartNewGame("w")}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                playerColor === "w"
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              White
            </button>

            <button
              type="button"
              onClick={() => onStartNewGame("b")}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                playerColor === "b"
                  ? "border-zinc-500 bg-zinc-700 text-white"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              Black
            </button>
          </div>
        </section>
      )}

      {/* Difficulty */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Difficulty</h2>

          <div className="text-right">
            <span className="block text-sm font-semibold text-white">
              {stockfishElo >= MAX_ELO ? "Maximum" : `${stockfishElo} Elo`}
            </span>

            <span className="block text-xs text-zinc-500">
              {difficultyLabel}
            </span>
          </div>
        </div>

        <Slider.Root
          value={stockfishElo}
          onValueChange={onEloChange}
          min={MIN_ELO}
          max={MAX_ELO}
          step={10}
          className="relative flex h-6 w-full touch-none items-center"
        >
          <Slider.Control className="flex w-full items-center">
            <Slider.Track className="relative h-1.5 w-full rounded-full bg-zinc-700">
              <Slider.Indicator className="rounded-full bg-blue-500" />
            </Slider.Track>

            <Slider.Thumb
              aria-label="Stockfish difficulty"
              className="size-5 rounded-full border-2 border-blue-500 bg-white outline-none transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-blue-500/50"
            />
          </Slider.Control>
        </Slider.Root>

        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span>{MIN_ELO}</span>
          <span>Maximum</span>
        </div>
      </section>

      {/* Sound */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Sound</h2>

            <p className="mt-1 text-xs text-zinc-500">
              Chess move and game sounds
            </p>
          </div>

          <button
            type="button"
            onClick={onSoundToggle}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
            className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${
              soundEnabled ? "bg-blue-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                soundEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Board theme */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Board theme</h2>

        <div className="grid grid-cols-4 gap-2">
          {Object.entries(boardThemes).map(([theme, colors]) => {
            const isActive = boardTheme === theme;

            return (
              <button
                key={theme}
                type="button"
                onClick={() => onThemeChange(theme as ThemeName)}
                aria-label={`${theme} board theme`}
                className={`relative aspect-square w-full overflow-hidden rounded-lg border-2 transition ${
                  isActive
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="absolute inset-1 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-md">
                  <span
                    style={{
                      backgroundColor: colors.light,
                    }}
                  />

                  <span
                    style={{
                      backgroundColor: colors.dark,
                    }}
                  />

                  <span
                    style={{
                      backgroundColor: colors.dark,
                    }}
                  />

                  <span
                    style={{
                      backgroundColor: colors.light,
                    }}
                  />
                </span>

                {isActive && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Game status */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Game status
        </p>

        {gameResult ? (
          <>
            <p className="mt-1 font-medium">{gameResult.title}</p>

            <p className="mt-1 text-xs text-zinc-400">{gameResult.message}</p>
          </>
        ) : (
          <p className="mt-1 font-medium">
            {currentTurn === "w" ? "White" : "Black"} to move
          </p>
        )}
      </section>

      {/* Take Back */}
      {showTakeBack && (
        <button
          type="button"
          onClick={onTakeBack}
          disabled={!canTakeBack}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/5"
        >
          ↩ Take Back
        </button>
      )}
    </div>
  );
}
