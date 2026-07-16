export const MIN_ELO = 1320;
export const MAX_ELO = 3190;
export const DEFAULT_ELO = MAX_ELO;

export const STOCKFISH_MOVE_TIME = 500;

export const boardThemes = {
  brown: {
    light: "#f0d9b5",
    dark: "#b58863",
  },
  green: {
    light: "#ebecd0",
    dark: "#779556",
  },
  blue: {
    light: "#dee3e6",
    dark: "#8ca2ad",
  },
  purple: {
    light: "#e8dff5",
    dark: "#8b6fa8",
  },
} as const;

export type ThemeName = keyof typeof boardThemes;