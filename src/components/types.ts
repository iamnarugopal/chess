import type React from "react";

export type PlayerColor = "w" | "b";

export type GameResult = {
  title: string;
  message: string;
} | null;

export type SoundType =
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "promote"
  | "illegal"
  | "game-start"
  | "game-end";

export type BoardTheme = {
  light: string;
  dark: string;
};

export type MoveSquareStyles = Record<
  string,
  React.CSSProperties
>;