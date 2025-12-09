import { useCallback, useMemo, type FC } from "react";
import "./CMatch.css";

const BOARD_SIZE = 9;
type CellValue = "X" | "O" | null;

interface BoardProps {
  onMakeMove?: (move: number) => void;

  myMove: number;
  oppMove: number;
  isMyTurn: boolean;
  isFinished: boolean;
  myMoveDisplay: CellValue
}

export const Board: FC<BoardProps> = ({
  onMakeMove,
  myMove,
  oppMove,
  isFinished,
  isMyTurn,
  myMoveDisplay
}) => {
  const onMoveClick = useCallback(
    (index: number) => {
      const key = 1 << (BOARD_SIZE - index - 1);
      const newMove = key | myMove;

      onMakeMove != null && onMakeMove(newMove);
    },
    [myMove, onMakeMove]
  );

  const getCellValue = useCallback(
    (index: number): CellValue => {
      const key = 1 << (BOARD_SIZE - index - 1);
      return (myMove & key) === key
        ? myMoveDisplay
        : (oppMove & key) === key
        ? myMoveDisplay === "X" ? "O" : "X"
        : null;
    },
    [myMove, oppMove]
  );

  const cellValues = useMemo(() => {
    return new Array(BOARD_SIZE).fill(0).map((_, index) => {
      return getCellValue(index);
    });
  }, [BOARD_SIZE, getCellValue]);

  return (
    <div className="tictactoe-board">
      {Array.from({ length: 9 }, (_, index) => (
        <button
          key={index}
          className={`game-cell ${cellValues[index] ? "filled" : ""}`}
          onClick={() => onMoveClick(index)}
          disabled={isFinished || !isMyTurn}
        >
          {cellValues[index]}
        </button>
      ))}
    </div>
  );
};
