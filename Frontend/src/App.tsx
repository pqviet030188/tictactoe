import { useCallback, useMemo, useState, type FC } from "react";
import "./App.css";

const MY_MARK = "x";
const OPP_MARK = "o";
const BOARD_SIZE = 9;

const ROW_SIZE = 3;

const Cell: FC<{
  index: number;
  myMoves: number;
  oppMoves: number;
  winStatus: number;
  loading: boolean;
  onClick?: (move: number) => void;
}> = ({ index, loading, myMoves, oppMoves, winStatus, onClick }) => {
  console.log(winStatus);
  const key = useMemo(() => {
    return 1 << (BOARD_SIZE - index - 1);
  }, [index]);

  const mark = useMemo(() => {
    return (myMoves & key) == key
      ? MY_MARK
      : (oppMoves & key) == key
      ? OPP_MARK
      : "";
  }, [myMoves, oppMoves, key]);

  const shouldBlock = useMemo(()=>{
    return loading || mark !== "" || [1, 0, -1].includes(winStatus);
  }, [loading, mark, winStatus]);

  return (
    <div
      className={`app-cell ${
        shouldBlock ? "block" : ""
      }`}
      onClick={() => {
        !shouldBlock && onClick != null && onClick(key);
      }}
    >
      <div>{mark}</div>
    </div>
  );
};

const MY_MOVES = 0x0000;
const OPP_MOVES = 0x0000;

function App() {
  const [winStatus, setWinStatus] = useState(10);
  const [myMoves, setMyMoves] = useState(MY_MOVES);
  const [oppMoves, setOppMoves] = useState(OPP_MOVES);
  const [loading, setLoading] = useState(false);

  const blockIndexes = useMemo(() => {
    return new Array(BOARD_SIZE).fill(0).map((_, i) => i);
  }, []);

  const rowCount = useMemo(() => {
    return blockIndexes.length / ROW_SIZE;
  }, [blockIndexes]);

  const rowIndexes = useMemo(() => {
    return new Array(rowCount).fill(0).map((_, i) => i);
  }, []);

  const colIndexes = useMemo(() => {
    return new Array(ROW_SIZE).fill(0).map((_, i) => i);
  }, []);

  const update = useCallback(async (myMoves: number, oppMoves: number) => {
      try {
        setLoading(true);
        const value = await fetch("http://localhost:5101/Computation", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            playerMoves: myMoves,
            cpuMoves: oppMoves,
          }),
        });

        const { nextMove, win } = (await value.json()) as {
          nextMove: number;
          win: number;
        };

        setOppMoves((d) => d | nextMove);
        setWinStatus(win);
      } finally {
        setLoading(false);
      }
    }, [setOppMoves, setWinStatus, setLoading]);

  const onClick = useCallback(async (move: number) => {
    const _myMoves = myMoves | move;
    setMyMoves(_myMoves);
    await update(_myMoves, oppMoves);
  }, [myMoves, oppMoves]);

  return (
    <div className="app-container">
      <div className="app-status">
        {winStatus == 1
          ? "YOU WON"
          : winStatus == -1
          ? "YOU LOST"
          : winStatus == 0
          ? "DRAW GAME"
          : "GOOD GAME"}
      </div>
      <div className="board">
        {rowIndexes.map((rowIndex) => {
          return (
            <div className="app-row" key={rowIndex}>
              {colIndexes.map((colIndex) => {
                const index = rowIndex * ROW_SIZE + colIndex;
                return (
                  <Cell
                    loading={loading}
                    winStatus={winStatus}
                    index={index}
                    key={colIndex}
                    myMoves={myMoves}
                    oppMoves={oppMoves}
                    onClick={onClick}
                  ></Cell>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
