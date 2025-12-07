export interface ComputeRequest {
  playerMoves: number;
  cpuMoves: number;
}

export interface ComputeResponse {
  nextMove: number;
  win: number;
}