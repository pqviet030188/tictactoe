namespace Tictactoe;

public class ComputeRequest
{
    public ushort PlayerMoves { get; set; }
    public ushort CpuMoves { get; set; }
}

public class ComputeResponse
{
    public ushort NextMove { get; set; }
    public int Win { get; set; }
}
