import { Chess, type Square } from "chess.js";

import { MAX_ELO } from "./constants";

import type {
  GameResult,
  MoveSquareStyles,
  PlayerColor,
} from "./types";

export function getDifficultyLabel(elo: number) {
  if (elo >= MAX_ELO) return "Maximum";
  if (elo >= 2800) return "Expert";
  if (elo >= 2400) return "Hard";
  if (elo >= 2000) return "Advanced";
  if (elo >= 1600) return "Intermediate";

  return "Beginner";
}

/**
 * Clone a Chess instance while preserving its complete move history.
 *
 * Do not use:
 * new Chess(game.fen())
 *
 * for take-back functionality because FEN doesn't contain move history.
 */
export function cloneGameWithHistory(currentGame: Chess) {
  const gameCopy = new Chess();

  const history = currentGame.history();

  for (const move of history) {
    gameCopy.move(move);
  }

  return gameCopy;
}

export function getGameResult(
  currentGame: Chess,
  playerColor: PlayerColor,
): GameResult {
  if (!currentGame.isGameOver()) {
    return null;
  }

  if (currentGame.isCheckmate()) {
    const winner: PlayerColor =
      currentGame.turn() === "w" ? "b" : "w";

    const playerWon = winner === playerColor;

    return {
      title: playerWon ? "You won! 🎉" : "You lost",
      message: playerWon
        ? "Checkmate! You defeated Stockfish."
        : "Checkmate! Stockfish won this game.",
    };
  }

  if (currentGame.isStalemate()) {
    return {
      title: "Draw",
      message: "The game ended in stalemate.",
    };
  }

  if (currentGame.isInsufficientMaterial()) {
    return {
      title: "Draw",
      message: "Draw by insufficient material.",
    };
  }

  if (currentGame.isThreefoldRepetition()) {
    return {
      title: "Draw",
      message: "Draw by threefold repetition.",
    };
  }

  if (currentGame.isDraw()) {
    return {
      title: "Draw",
      message: "The game ended in a draw.",
    };
  }

  return null;
}

export function getMoveHints(
  game: Chess,
  square: Square,
  playerColor: PlayerColor,
): MoveSquareStyles {
  if (game.turn() !== playerColor) {
    return {};
  }

  const piece = game.get(square);

  if (!piece || piece.color !== playerColor) {
    return {};
  }

  const moves = game.moves({
    square,
    verbose: true,
  });

  const moveSquares: MoveSquareStyles = {};

  for (const move of moves) {
    const targetPiece = game.get(move.to);

    moveSquares[move.to] = {
      background: targetPiece
        ? "radial-gradient(circle, transparent 55%, rgba(0, 0, 0, 0.3) 56%)"
        : "radial-gradient(circle, rgba(0, 0, 0, 0.3) 20%, transparent 21%)",
    };
  }

  moveSquares[square] = {
    background: "rgba(255, 255, 0, 0.4)",
  };

  return moveSquares;
}