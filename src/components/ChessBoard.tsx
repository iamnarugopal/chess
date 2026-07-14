"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Chessboard } from "react-chessboard";

import type {
  ChessboardOptions,
  PieceDropHandlerArgs,
  SquareHandlerArgs,
} from "react-chessboard";

import { Chess, type Move, type Square } from "chess.js";

import ChessSettings from "./ChessSettings";
import GameResultModal from "./GameResultModal";
import MobileSettingsDrawer from "./MobileSettingsDrawer";

import {
  DEFAULT_ELO,
  MAX_ELO,
  STOCKFISH_MOVE_TIME,
  boardThemes,
  type ThemeName,
} from "./constants";

import type {
  GameResult,
  MoveSquareStyles,
  PlayerColor,
  SoundType,
} from "./types";

import { cloneGameWithHistory, getGameResult, getMoveHints } from "./utils";

export default function ChessBoard() {
  const [game, setGame] = useState(() => new Chess());

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  const [moveSquares, setMoveSquares] = useState<MoveSquareStyles>({});

  const [boardTheme, setBoardTheme] = useState<ThemeName>("brown");

  const [playerColor, setPlayerColor] = useState<PlayerColor>("w");

  const [stockfishElo, setStockfishElo] = useState(DEFAULT_ELO);

  const [gameResult, setGameResult] = useState<GameResult>(null);

  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isStockfishThinking, setIsStockfishThinking] = useState(false);

  const stockfishRef = useRef<Worker | null>(null);

  const playerColorRef = useRef<PlayerColor>("w");

  const soundEnabledRef = useRef(true);

  const soundsRef = useRef<Partial<Record<SoundType, HTMLAudioElement>>>({});

  const searchIdRef = useRef(0);

  const activeSearchIdRef = useRef<number | null>(null);

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Initialize sounds
  useEffect(() => {
    soundsRef.current = {
      move: new Audio("/sounds/move.mp3"),
      capture: new Audio("/sounds/capture.mp3"),
      check: new Audio("/sounds/check.mp3"),
      castle: new Audio("/sounds/castle.mp3"),
      promote: new Audio("/sounds/promote.mp3"),
      illegal: new Audio("/sounds/illegal.mp3"),
      "game-start": new Audio("/sounds/game-start.mp3"),
      "game-end": new Audio("/sounds/game-end.mp3"),
    };

    Object.values(soundsRef.current).forEach((audio) => {
      if (audio) {
        audio.preload = "auto";
      }
    });

    return () => {
      Object.values(soundsRef.current).forEach((audio) => {
        if (!audio) return;

        audio.pause();
        audio.src = "";
      });

      soundsRef.current = {};
    };
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!soundEnabledRef.current) return;

    const audio = soundsRef.current[type];

    if (!audio) return;

    audio.currentTime = 0;

    audio.play().catch(() => {
      // Browser may block audio before interaction.
    });
  }, []);

  const playMoveSound = useCallback(
    (currentGame: Chess, move: Move) => {
      if (currentGame.isGameOver()) {
        playSound("game-end");
        return;
      }

      if (currentGame.isCheck()) {
        playSound("check");
        return;
      }

      if (move.promotion) {
        playSound("promote");
        return;
      }

      if (move.flags.includes("k") || move.flags.includes("q")) {
        playSound("castle");
        return;
      }

      if (move.captured) {
        playSound("capture");
        return;
      }

      playSound("move");
    },
    [playSound],
  );

  const handleGameResult = useCallback(
    (currentGame: Chess, currentPlayerColor: PlayerColor) => {
      const result = getGameResult(currentGame, currentPlayerColor);

      if (!result) return false;

      setGameResult(result);
      setIsResultModalOpen(true);

      return true;
    },
    [],
  );

  // Initialize Stockfish
  useEffect(() => {
    const stockfish = new Worker("/stockfish/stockfish-18-lite-single.js");

    stockfishRef.current = stockfish;

    stockfish.onmessage = (event) => {
      const message = String(event.data);

      if (!message.startsWith("bestmove")) return;

      const responseSearchId = activeSearchIdRef.current;

      if (
        responseSearchId === null ||
        responseSearchId !== searchIdRef.current
      ) {
        return;
      }

      activeSearchIdRef.current = null;
      setIsStockfishThinking(false);

      const bestMove = message.split(" ")[1];

      if (!bestMove || bestMove === "(none)") {
        return;
      }

      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove[4];

      setGame((currentGame) => {
        const gameCopy = cloneGameWithHistory(currentGame);

        try {
          const move = gameCopy.move({
            from,
            to,
            promotion: promotion || "q",
          });

          playMoveSound(gameCopy, move);

          handleGameResult(gameCopy, playerColorRef.current);

          return gameCopy;
        } catch {
          console.error("Invalid Stockfish move:", bestMove);

          return currentGame;
        }
      });

      setSelectedSquare(null);
      setMoveSquares({});
    };

    stockfish.postMessage("uci");

    return () => {
      stockfish.terminate();
      stockfishRef.current = null;
    };
  }, [handleGameResult, playMoveSound]);

  // Update Stockfish difficulty
  useEffect(() => {
    const stockfish = stockfishRef.current;

    if (!stockfish) return;

    stockfish.postMessage("stop");

    if (stockfishElo >= MAX_ELO) {
      stockfish.postMessage("setoption name UCI_LimitStrength value false");
    } else {
      stockfish.postMessage("setoption name UCI_LimitStrength value true");

      stockfish.postMessage(`setoption name UCI_Elo value ${stockfishElo}`);
    }

    stockfish.postMessage("isready");
  }, [stockfishElo]);

  function makeStockfishMove(currentGame: Chess) {
    const stockfish = stockfishRef.current;

    if (!stockfish) return;

    searchIdRef.current += 1;

    activeSearchIdRef.current = searchIdRef.current;

    setIsStockfishThinking(true);

    stockfish.postMessage(`position fen ${currentGame.fen()}`);

    stockfish.postMessage(`go movetime ${STOCKFISH_MOVE_TIME}`);
  }

  function cancelStockfishSearch() {
    searchIdRef.current += 1;

    activeSearchIdRef.current = null;

    stockfishRef.current?.postMessage("stop");

    setIsStockfishThinking(false);
  }

  function startNewGame(color: PlayerColor) {
    cancelStockfishSearch();

    const newGame = new Chess();

    playerColorRef.current = color;

    setGame(newGame);
    setPlayerColor(color);
    setSelectedSquare(null);
    setMoveSquares({});
    setGameResult(null);
    setIsResultModalOpen(false);

    playSound("game-start");

    if (color === "b") {
      setTimeout(() => {
        makeStockfishMove(newGame);
      }, 100);
    }
  }

  function showMoveHints(square: Square) {
    setMoveSquares(getMoveHints(game, square, playerColor));
  }

  function makePlayerMove(from: Square, to: Square) {
    if (gameResult) return false;
    if (isStockfishThinking) return false;
    if (game.turn() !== playerColor) {
      return false;
    }

    const gameCopy = cloneGameWithHistory(game);

    try {
      const move = gameCopy.move({
        from,
        to,
        promotion: "q",
      });

      if (!move) {
        playSound("illegal");
        return false;
      }

      playMoveSound(gameCopy, move);

      setGame(gameCopy);
      setSelectedSquare(null);
      setMoveSquares({});

      const gameOver = handleGameResult(gameCopy, playerColor);

      if (!gameOver) {
        makeStockfishMove(gameCopy);
      }

      return true;
    } catch {
      playSound("illegal");

      return false;
    }
  }

  function onDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    if (!targetSquare) {
      playSound("illegal");
      return false;
    }

    return makePlayerMove(sourceSquare as Square, targetSquare as Square);
  }

  function onSquareClick({ square }: SquareHandlerArgs) {
    if (gameResult) return;
    if (isStockfishThinking) return;
    if (game.turn() !== playerColor) return;

    const clickedSquare = square as Square;

    const clickedPiece = game.get(clickedSquare);

    if (!selectedSquare) {
      if (clickedPiece?.color === playerColor) {
        setSelectedSquare(clickedSquare);
        showMoveHints(clickedSquare);
      }

      return;
    }

    if (selectedSquare === clickedSquare) {
      setSelectedSquare(null);
      setMoveSquares({});
      return;
    }

    if (clickedPiece?.color === playerColor) {
      setSelectedSquare(clickedSquare);
      showMoveHints(clickedSquare);
      return;
    }

    const moved = makePlayerMove(selectedSquare, clickedSquare);

    if (!moved) {
      setSelectedSquare(null);
      setMoveSquares({});
    }
  }

  // Multiple Take Back
  function takeBack() {
    cancelStockfishSearch();

    const gameCopy = cloneGameWithHistory(game);

    if (gameCopy.history().length === 0) {
      return;
    }

    gameCopy.undo();

    while (gameCopy.history().length > 0 && gameCopy.turn() !== playerColor) {
      gameCopy.undo();
    }

    setGame(gameCopy);
    setSelectedSquare(null);
    setMoveSquares({});
    setGameResult(null);
    setIsResultModalOpen(false);

    playSound("move");
  }

  function toggleSound() {
    setSoundEnabled((current) => {
      const next = !current;

      soundEnabledRef.current = next;

      return next;
    });
  }

  const canTakeBack = game.history().length > 0;

  const chessSettingsProps = {
    playerColor,
    boardTheme,
    stockfishElo,
    soundEnabled,
    gameResult,
    currentTurn: game.turn(),
    canTakeBack,

    onStartNewGame: startNewGame,
    onThemeChange: setBoardTheme,
    onEloChange: setStockfishElo,
    onSoundToggle: toggleSound,
    onTakeBack: takeBack,
  };

  const chessboardOptions: ChessboardOptions = {
    position: game.fen(),

    onPieceDrop: onDrop,

    onSquareClick,

    squareStyles: moveSquares,

    boardOrientation: playerColor === "w" ? "white" : "black",

    lightSquareStyle: {
      backgroundColor: boardThemes[boardTheme].light,
    },

    darkSquareStyle: {
      backgroundColor: boardThemes[boardTheme].dark,
    },

    draggingPieceStyle: {
      transform: "scale(1)",
      animation: "chess-piece-shake 0.4s ease-in-out 1",
      transformOrigin: "center",
      cursor: "grabbing",
      filter: "drop-shadow(0 8px 8px rgba(0, 0, 0, 0.35))",
    },

    draggingPieceGhostStyle: {
      opacity: 0.25,
    },
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen lg:h-full lg:min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-white/10 bg-zinc-900 p-6 lg:block">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Chess Settings</h1>

            <p className="mt-1 text-sm text-zinc-400">
              Choose your side, difficulty and board theme.
            </p>
          </div>

          <ChessSettings {...chessSettingsProps} showPlayAs showTakeBack />
        </aside>

        {/* Main game area */}
        <section className="relative flex min-h-screen min-w-0 flex-1 flex-col lg:min-h-0">
          {/* Mobile header */}
          <header className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 px-4 py-3 backdrop-blur lg:hidden">
            <div>
              <h1 className="font-semibold">Chess</h1>

              <p className="text-xs text-zinc-400">
                {gameResult
                  ? gameResult.title
                  : `${game.turn() === "w" ? "White" : "Black"} to move`}
              </p>
            </div>

            <MobileSettingsDrawer>
              <ChessSettings
                {...chessSettingsProps}
                showPlayAs={false}
                showTakeBack={false}
              />
            </MobileSettingsDrawer>
          </header>

          {/* Chessboard area */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-3 sm:p-5 lg:p-6">
            {/* Mobile game controls */}
            <div className="flex w-full items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => startNewGame("w")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition active:scale-95 ${
                  playerColor === "w"
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/5 text-zinc-300"
                }`}
              >
                White
              </button>

              <button
                type="button"
                onClick={() => startNewGame("b")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition active:scale-95 ${
                  playerColor === "b"
                    ? "border-zinc-500 bg-zinc-700 text-white"
                    : "border-white/10 bg-white/5 text-zinc-300"
                }`}
              >
                Black
              </button>

              <button
                type="button"
                onClick={takeBack}
                disabled={!canTakeBack}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↩ Take Back
              </button>
            </div>

            {/* Chessboard */}
            <div className="size-[min(calc(100vw-1.5rem),calc(100vh-9rem))] select-none lg:size-[min(calc(100vw-21rem),calc(100vh-3rem))]">
              <Chessboard options={chessboardOptions} />
            </div>
          </div>
        </section>
      </div>

      {/* Game result modal */}
      {gameResult && isResultModalOpen && (
        <GameResultModal
          result={gameResult}
          playerColor={playerColor}
          onPlayAgain={startNewGame}
          onClose={() => setIsResultModalOpen(false)}
        />
      )}
    </main>
  );
}
