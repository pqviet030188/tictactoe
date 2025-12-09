using Semver;
using Tictactoe.Services;

namespace TictactoeTest.Unit;

public class ComputationServiceTests
{
    [Fact]
    public void Test_Board_Representation()
    {

        // act and assert
        var board = ComputationServiceExtension.H1.ToBoard();
        Assert.Equal("000\n000\n111", board);

        // act and assert
        board = ComputationServiceExtension.H2.ToBoard();
        Assert.Equal("000\n111\n000", board);

        // act and assert
        board = ComputationServiceExtension.H3.ToBoard();
        Assert.Equal("111\n000\n000", board);

        // act and assert
        board = ComputationServiceExtension.V1.ToBoard();
        Assert.Equal("001\n001\n001", board);

        // act and assert
        board = ComputationServiceExtension.V2.ToBoard();
        Assert.Equal("010\n010\n010", board);

        // act and assert
        board = ComputationServiceExtension.V3.ToBoard();
        Assert.Equal("100\n100\n100", board);

        // act and assert
        board = ComputationServiceExtension.X1.ToBoard();
        Assert.Equal("100\n010\n001", board);

        // act and assert
        board = ComputationServiceExtension.X2.ToBoard();
        Assert.Equal("001\n010\n100", board);
    }

    [Fact]
    public void Test_Generated_Moves()
    {
        var svc = new ComputationService();

        Assert.Equal(ComputationServiceExtension.H1.GenerateMovesAsNumber(ComputationServiceExtension.H2), ComputationServiceExtension.H3);
        Assert.Equal(ComputationServiceExtension.H2.GenerateMovesAsNumber(ComputationServiceExtension.H3), ComputationServiceExtension.H1);
        Assert.Equal(ComputationServiceExtension.H1.GenerateMovesAsNumber(ComputationServiceExtension.H3), ComputationServiceExtension.H2);

        Assert.Equal(ComputationServiceExtension.V1.GenerateMovesAsNumber(ComputationServiceExtension.V2), ComputationServiceExtension.V3);
        Assert.Equal(ComputationServiceExtension.V2.GenerateMovesAsNumber(ComputationServiceExtension.V3), ComputationServiceExtension.V1);
        Assert.Equal(ComputationServiceExtension.V1.GenerateMovesAsNumber(ComputationServiceExtension.V3), ComputationServiceExtension.V2);
    }

    [Fact]
    public void Test_Has_Move_Than_1_Bit1()
    {
        var val = (ushort)0x0001;
        Assert.False(val.HasMoreThanOneBit1());

        val = (ushort)0x00F0;
        Assert.True(val.HasMoreThanOneBit1());
    }

    [Fact]
    public void Test_Get_Score()
    {
        Assert.Equal(ComputationServiceExtension.V1.GetScore(), ComputationServiceExtension.WIN);
        Assert.Equal(ComputationServiceExtension.H1.GetScore(), ComputationServiceExtension.WIN);
        Assert.Equal(ComputationServiceExtension.X1.GetScore(), ComputationServiceExtension.WIN);
        Assert.Equal(ComputationServiceExtension.X2.GetScore(), ComputationServiceExtension.WIN);

        Assert.Equal(1, ((ushort)0x0180).GetScore());
        Assert.Equal(2, ((ushort)0x01A0).GetScore());
        Assert.Equal(3, ((ushort)0x0190).GetScore());

        Assert.Equal(0, ((ushort)0x0102).GetScore());
    }

    [Fact]
    public void Test_Get_Best_Moves_From_Highest_Score()
    {
        var myMoves = (ushort)0x0190;
        var oppMoves = (ushort)0x0003;
        var bestMoveRanks = myMoves.BestMovesFromHighestScore(oppMoves);
        Assert.Equal((ushort)(0x01D0), bestMoveRanks.First().move);

        myMoves = (ushort)0x0102;
        oppMoves = (ushort)0x0005;
        bestMoveRanks = myMoves.BestMovesFromHighestScore(oppMoves);
        Assert.Equal((ushort)(0x0112), bestMoveRanks.First().move);
    }

    [Fact]
    public void Test_Game_1()
    {
        var svc = new ComputationService();
        var cpuMove = (ushort)0;

        var mask = (ushort)1;
        for (int i = 0; i < 9; i++)
        {
            var playerMove = mask;
            for (var j = 0; j < 0x01ff; j++)
            {
                var nextMove = svc.Handle(playerMove, cpuMove);
                Assert.Equal(0, (ushort)((nextMove.Item1 | cpuMove) & playerMove));
            }
            mask <<= 1;
        }
    }

    [Fact]
    public void Test_Game_2()
    {
        var svc = new ComputationService();
        var cpuMove = (ushort)0x0100;
        var playerMove = (ushort)0x0048;
        var nextMove = svc.Handle(playerMove, cpuMove);
        Assert.Equal(0x0001, nextMove.Item1);
        Assert.Equal(0b1010, nextMove.Item2);
    }

    [Fact]
    public void Test_Game_3()
    {
        var svc = new ComputationService();
        var cpuMove = (ushort)0x0100;
        var playerMove = (ushort)0x0030;
        var nextMove = svc.Handle(playerMove, cpuMove);
        Assert.Equal(0x0008, nextMove.Item1);
    }

    [Fact]
    public void Test_Game_4()
    {
        var svc = new ComputationService();
        var cpuMove = (ushort)0x0005;
        var playerMove = (ushort)0x00D00;
        var nextMove = svc.Handle(playerMove, cpuMove);
        Assert.Equal(0x0002, nextMove.Item1);
    }

    [Fact]
    public void Test_Game_5()
    {
        var svc = new ComputationService();
        var cpuMove = (ushort)270;
        var playerMove = (ushort)241;
        var nextMove = svc.Handle(playerMove, cpuMove);
        Assert.Equal(0, nextMove.Item1);
    }
}