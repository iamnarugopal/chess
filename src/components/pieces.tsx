import type { PieceRenderObject } from "react-chessboard";

const createPiece =
  (src: string) =>
  (props?: {
    fill?: string;
    square?: string;
    svgStyle?: React.CSSProperties;
  }) => (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        ...props?.svgStyle,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );

export const pieces: PieceRenderObject = {
  wP: createPiece("/piece/wp.png"),
  wR: createPiece("/piece/wr.png"),
  wN: createPiece("/piece/wn.png"),
  wB: createPiece("/piece/wb.png"),
  wQ: createPiece("/piece/wq.png"),
  wK: createPiece("/piece/wk.png"),

  bP: createPiece("/piece/bp.png"),
  bR: createPiece("/piece/br.png"),
  bN: createPiece("/piece/bn.png"),
  bB: createPiece("/piece/bb.png"),
  bQ: createPiece("/piece/bq.png"),
  bK: createPiece("/piece/bk.png"),
};