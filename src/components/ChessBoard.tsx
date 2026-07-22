"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Chessboard } from "react-chessboard";
import { pieces } from "./pieces";

import type {
  ChessboardOptions,
  PieceDropHandlerArgs,
  SquareHandlerArgs,
} from "react-chessboard";

import { Chess, type Move, type Square } from "chess.js";
import { FaRobot, FaUser } from "react-icons/fa";
import {
  GiChessBishop,
  GiChessKing,
  GiChessKnight,
  GiChessPawn,
  GiChessQueen,
  GiChessRook,
} from "react-icons/gi";
import { SiGithub } from "react-icons/si";

import ChessSettings from "./ChessSettings";
import GameResultModal from "./GameResultModal";
import MobileSettingsDrawer from "./MobileSettingsDrawer";
import PwaInstallButton from "./PwaInstallButton";

import {
  DEFAULT_ELO,
  MAX_ELO,
  STOCKFISH_MOVE_TIME,
  boardThemes,
  type ThemeName,
} from "./constants";

import { STORAGE_KEYS } from "./constants";

import type {
  CapturedPiece,
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

  const [boardTheme, setBoardTheme] = useState<ThemeName>("green");

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
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);

    if (savedTheme && Object.keys(boardThemes).includes(savedTheme)) {
      setBoardTheme(savedTheme as ThemeName);
    }

    const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND);

    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true");
    }
  }, []);

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

      return true;
    },
    [],
  );

  useEffect(() => {
    if (!gameResult) {
      setIsResultModalOpen(false);
      return;
    }

    setIsResultModalOpen(false);

    const timer = window.setTimeout(() => {
      setIsResultModalOpen(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [gameResult]);

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

      localStorage.setItem(STORAGE_KEYS.SOUND, String(next));

      return next;
    });
  }

  const canTakeBack = game.history().length > 0;

  const takenPieces = game.history({ verbose: true }).reduce(
    (pieces, move) => {
      if (!move.captured) {
        return pieces;
      }

      pieces[move.color].push({
        type: move.captured,
        color: move.color === "w" ? "b" : "w",
      });

      return pieces;
    },
    {
      w: [] as CapturedPiece[],
      b: [] as CapturedPiece[],
    },
  );

  const playerTakenPieces = takenPieces[playerColor];

  const stockfishTakenPieces = takenPieces[playerColor === "w" ? "b" : "w"];

  const checkedKingSquare = game.inCheck()
    ? (game.findPiece({ type: "k", color: game.turn() })[0] ?? null)
    : null;

  const pieceIcons = {
    p: GiChessPawn,
    n: GiChessKnight,
    b: GiChessBishop,
    r: GiChessRook,
    q: GiChessQueen,
    k: GiChessKing,
  } as const;

  const pieceOrder = {
    p: 1, // Pawn
    n: 2, // Knight
    b: 3, // Bishop
    r: 4, // Rook
    q: 5, // Queen
    k: 6, // King (never captured, but included for completeness)
  } as const;

  const pieceValues = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
  } as const;

  function getMaterialValue(pieces: CapturedPiece[]) {
    return pieces.reduce((total, piece) => total + pieceValues[piece.type], 0);
  }

  const playerMaterial = getMaterialValue(playerTakenPieces);
  const stockfishMaterial = getMaterialValue(stockfishTakenPieces);

  const playerAdvantage = playerMaterial - stockfishMaterial;
  const stockfishAdvantage = stockfishMaterial - playerMaterial;

  // function renderCapturedPiece(piece: CapturedPiece, index: number) {
  //   const PieceIcon = pieceIcons[piece.type];

  //   return (
  //     <span
  //       key={`${piece.type}-${piece.color}-${index}`}
  //       title={`${piece.color === "w" ? "White" : "Black"} ${piece.type.toUpperCase()}`}
  //       className={`flex items-center justify-center ${
  //         piece.color === "w" ? "text-zinc-100" : "text-zinc-400"
  //       } ${index > 0 ? "-ml-2" : ""}`}
  //     >
  //       <PieceIcon className="size-4" aria-hidden="true" />
  //     </span>
  //   );
  // }

  function renderCapturedPiece(piece: CapturedPiece, index: number) {
    return (
      <img
        key={`${piece.type}-${piece.color}-${index}`}
        src={`/piece/${piece.color}${piece.type}.png`}
        alt=""
        className={index > 0 ? "-ml-2 h-4 w-4" : "h-4 w-4"}
        draggable={false}
      />
    );
  }

  function renderProfileCard(
    name: string,
    Icon: typeof FaRobot,
    takenPieces: CapturedPiece[],
    accentClassName: string,
    advantage: number,
  ) {
    const groupedPieces = Object.values(
      takenPieces.reduce(
        (acc, piece) => {
          if (!acc[piece.type]) {
            acc[piece.type] = [];
          }

          acc[piece.type].push(piece);

          return acc;
        },
        {} as Record<string, CapturedPiece[]>,
      ),
    ).sort((a, b) => pieceOrder[a[0].type] - pieceOrder[b[0].type]);
    return (
      <section className="">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-md border border-white/10 ${accentClassName}`}
          >
            <Icon className="size-5 text-white" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs sm:text-sm font-semibold text-white">
              {name}
            </p>
            {/* {takenPieces.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                {takenPieces.map((piece, index) =>
                  renderCapturedPiece(piece, index),
                )}
                {advantage > 0 && (
                  <span className="ml-1 text-sm text-zinc-300 leading-snug">
                    +{advantage}
                  </span>
                )}
              </div>
            ) : null} */}
            <div className="flex flex-wrap mt-1 items-center">
              {groupedPieces.map((group) => (
                <div key={group[0].type} className="flex">
                  {group.map((piece, index) =>
                    renderCapturedPiece(piece, index),
                  )}
                </div>
              ))}

              {advantage > 0 && (
                <span className="ml-1 text-sm text-zinc-300">+{advantage}</span>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const squareStyles = checkedKingSquare
    ? {
        ...moveSquares,
        [checkedKingSquare]: {
          background: "rgba(239, 68, 68, 0.45)",
          boxShadow: "inset 0 0 0 3px rgba(255, 255, 255, 0.25)",
        },
      }
    : moveSquares;

  function handleThemeChange(theme: ThemeName) {
    setBoardTheme(theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  const chessSettingsProps = {
    playerColor,
    boardTheme,
    stockfishElo,
    soundEnabled,
    gameResult,
    currentTurn: game.turn(),
    canTakeBack,

    onStartNewGame: startNewGame,
    onThemeChange: handleThemeChange,
    onEloChange: setStockfishElo,
    onSoundToggle: toggleSound,
    onTakeBack: takeBack,
  };

  const chessboardOptions: ChessboardOptions = {
    position: game.fen(),
    pieces,
    onPieceDrop: onDrop,

    onSquareClick,

    squareStyles,

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
    alphaNotationStyle: { fontSize: "10px" },
    numericNotationStyle: {
      fontSize: "10px",
    },
  };

  const SIDEBAR_WIDTH = 320;

  const [boardWidth, setBoardWidth] = useState(600);

  useEffect(() => {
    const updateBoardSize = () => {
      const availableWidth =
        window.innerWidth >= 1024
          ? window.innerWidth - SIDEBAR_WIDTH - 48
          : window.innerWidth - 32;

      const availableHeight = window.innerHeight - 32;

      setBoardWidth(Math.max(280, Math.min(availableWidth, availableHeight)));
    };

    updateBoardSize();

    window.addEventListener("resize", updateBoardSize);
    return () => window.removeEventListener("resize", updateBoardSize);
  }, []);

  return (
    <main className="text-white h-full">
      <div className="flex h-full">
        {/* Desktop sidebar */}
        <aside className="minimal-scrollbar hidden w-72 shrink-0 overflow-y-auto border-r border-white/10 bg-zinc-900 p-6 lg:block">
          <div className="flex min-h-full flex-col">
            <div className="mb-6">
              <h1 className="text-xl font-semibold">Chess Settings</h1>

              <p className="mt-1 text-sm text-zinc-400">
                Choose your side, difficulty and board theme.
              </p>
            </div>

            <ChessSettings {...chessSettingsProps} showPlayAs showTakeBack />

            <a
              href="https://github.com/iamnarugopal/chess"
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
            >
              <SiGithub aria-hidden="true" className="size-4" />
              Open Source on GitHub
            </a>
          </div>
        </aside>

        {/* Main game area */}
        <section className="grow relative flex flex-col overflow-auto">
          {/* Mobile header */}
          <header className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 backdrop-blur lg:hidden p-3">
            <div>
              <h1 className="font-semibold">Chess</h1>

              <p className="text-xs text-zinc-400">
                {gameResult
                  ? gameResult.title
                  : `${game.turn() === "w" ? "White" : "Black"} to move`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <PwaInstallButton />

              <MobileSettingsDrawer>
                <div className="flex h-full flex-col">
                  <ChessSettings
                    {...chessSettingsProps}
                    showPlayAs={false}
                    showTakeBack={false}
                  />

                  <a
                    href="https://github.com/iamnarugopal/chess"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <SiGithub aria-hidden="true" className="size-4" />
                    Open Source on GitHub
                  </a>
                </div>
              </MobileSettingsDrawer>
            </div>
          </header>

          {/* Chessboard area */}
          <div className="relative flex flex-1 flex-col xl:flex-row">
            {/* Mobile game controls */}
            <div className="flex w-full items-center gap-2 px-4 py-3 lg:hidden">
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

            <div className="px-4 py-3 xl:hidden my-6">
              {renderProfileCard(
                "Stockfish",
                FaRobot,
                stockfishTakenPieces,
                "bg-gradient-to-br from-zinc-800 to-zinc-700",
                stockfishAdvantage,
              )}
            </div>

            <div className="hidden w-70 shrink-0 flex-col justify-between gap-4 px-3 py-3 xl:flex">
              {renderProfileCard(
                "Stockfish",
                FaRobot,
                stockfishTakenPieces,
                "bg-gradient-to-br from-zinc-800 to-zinc-700",
                stockfishAdvantage,
              )}

              {renderProfileCard(
                "You",
                FaUser,
                playerTakenPieces,
                "bg-gradient-to-br from-sky-600 to-cyan-500",
                playerAdvantage,
              )}
            </div>

            {/* Chessboard */}
            <div className="flex min-h-0 min-w-0 flex-1 items-center xl:overflow-hidden">
              <div className="aspect-square w-full xl:max-w-[min(calc(100vw-22rem),calc(100vh))] h-auto shrink-0">
                <Chessboard options={chessboardOptions} />
              </div>
            </div>

            <div className="px-4 py-3 xl:hidden my-6">
              {renderProfileCard(
                "You",
                FaUser,
                playerTakenPieces,
                "bg-gradient-to-br from-sky-600 to-cyan-500",
                playerAdvantage,
              )}
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
