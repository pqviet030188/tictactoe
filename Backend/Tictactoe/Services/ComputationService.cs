using System.Text;
using System.Numerics;

namespace Tictactoe.Services;

public static class ComputationServiceExtension
{
    public static readonly ushort H1 = 0x0007;
    public static readonly ushort H2 = 0x0007 << 3;
    public static readonly ushort H3 = 0x0007 << 6;
    public static readonly ushort V1 = 0x0049;
    public static readonly ushort V2 = 0x0049 << 1;
    public static readonly ushort V3 = 0x0049 << 2;

    public static readonly ushort X1 = 0x0111;
    public static readonly ushort X2 = 0x0054;
    public static readonly ushort ALL = 0x01FF;
    public static readonly ushort WIN = 0xffff;

    public static readonly ushort MAX_DEPTH = 10;

    public static string ToBoard(this ushort value)
    {
        var stack = new Stack<string>();
        ushort mask = 1;
        for (ushort i = 0; i < 9; i++)
        {
            if (i > 0 && i % 3 == 0)
            {
                stack.Push("\n");
            }

            var m = value & mask;
            stack.Push(m == mask ? "1" : "0");
            mask = (ushort)(mask << 1);
        }

        // revert the string
        StringBuilder sb = new StringBuilder();
        while (stack.Count > 0)
        {
            sb.Append(stack.Pop());
        }

        return sb.ToString();
    }

    public static ushort GenerateMovesAsNumber(this ushort myMoves, ushort oppMoves)
    {
        var allMoves = myMoves | oppMoves;
        return (ushort)(allMoves ^ ALL);
    }

    public static IList<ushort> GenerateMoves(this ushort myMoves, ushort oppMoves)
    {
        var moves = myMoves.GenerateMovesAsNumber(oppMoves);
        ushort mask = 1;
        var ret = new List<ushort>();
        for (ushort i = 0; i < 9; i++)
        {
            var m = moves & mask;
            var makeMove = m == mask;
            if (!makeMove)
            {
                mask = (ushort)(mask << 1);
                continue;
            }
            ret.Add(mask);
            mask = (ushort)(mask << 1);
        }

        return ret;
    }

    public static bool HasMoreThanOneBit1(this ushort value)
    {
        return BitOperations.PopCount(value) > 1;
        ushort mask = 1;
        ushort count = 0;
        while(true)
        {
            if (mask > ALL)
            {
                break;
            }

            count += (ushort)(mask & value) == mask ? (ushort)1 : (ushort)0;

            if (count > 1)
                return true;

            mask = (ushort)(mask << 1);
        }

        return false;

    }

    public static ushort GetScore(this ushort value)
    {
        var allChecks = new List<ushort>() {
                H1, H2, H3,
                V1, V2, V3,
                X1, X2
            };

        if (allChecks.FirstOrDefault(check => (ushort)(check & value) == check) != default(ushort))
        {
            return WIN;
        }

        var ret = (ushort)allChecks.Select(check =>
        {
            var scanner = (ushort)(value & check);
            return scanner.HasMoreThanOneBit1() ? 1 : 0;
        }).Sum();

        return Math.Min(ret, WIN);
    }

    public static IList<(ushort move, int score)> BestMovesFromHighestScore(this ushort myMoves, ushort oppMoves)
    {
        var allMoves = myMoves.GenerateMoves(oppMoves);
        var oppScore = oppMoves.GetScore();
        var rank = new List<(ushort move, int score)>();

        foreach (var move in allMoves)
        {
            var newMoves = (ushort)(move | myMoves);
            var myNewScore = newMoves.GetScore();

            if (myNewScore == WIN)
            {
                rank.Add((newMoves, WIN));
                break;
            }

            var moveScore = (newMoves.GetScore() - oppScore);
            rank.Add((newMoves, moveScore));
        }

        return rank.OrderByDescending(d => d.score).ToList();
    }

    public static (ushort move, int score) NextMove(ushort myMoves, ushort oppMoves, ushort myNextMove, ushort nextMove, bool myTurn, ushort depth)
    {
        if (myTurn)
        {
            oppMoves = (ushort)(oppMoves | nextMove);
        } else
        {
            myMoves = (ushort)(myMoves | nextMove);
        }

        if (depth == MAX_DEPTH)
        {
            return (myNextMove, myMoves.GetScore());
        }

        if (myTurn)
        {
            var score = myMoves.GetScore();
            if (score == WIN)
            {
                return (myNextMove, WIN);
            }

            var allMyPotentialMoves = myMoves.BestMovesFromHighestScore(oppMoves);
            if (allMyPotentialMoves == null || allMyPotentialMoves.Count == 0)
            {
                return (myNextMove, 0);
            }

            if (allMyPotentialMoves.First().score == WIN)
            {
                return (
                    depth == 0 ?
                    (ushort)(allMyPotentialMoves.First().move ^ myMoves) : myNextMove
                    , WIN);
            }

            var myMovesRank = new List<(ushort move, int score)>();
            foreach (var move in allMyPotentialMoves)
            {
                myMovesRank.Add(NextMove(myMoves, oppMoves, 
                    depth == 0? 
                    (ushort)(move.move ^ myMoves): myNextMove, 
                    (ushort)(move.move ^ myMoves), false, (ushort)(depth + 1)));
            }

            var bestMove = myMovesRank.MaxBy(d => d.score);
            var bestScore = bestMove.score;
            if (bestScore >= WIN || bestScore <= -WIN)
            {
                return bestMove;
            }

            var bestMoves = myMovesRank.Where(d => d.score == bestScore);
            return bestMoves.ElementAt(new Random().Next(0, bestMoves.Count()));
        }

        var oppScore = oppMoves.GetScore();
        if (oppScore == WIN)
        {
            return (myNextMove, -WIN);
        }

        var allOppPotentialMoves = oppMoves.BestMovesFromHighestScore(myMoves);
        if (allOppPotentialMoves == null || allOppPotentialMoves.Count == 0)
        {
            return (myNextMove, 0);
        }

        if (allOppPotentialMoves.First().score == WIN)
        {
            return (myNextMove, -WIN);
        }

        var oppMovesRank = new List<(ushort move, int score)>();
        foreach (var move in allOppPotentialMoves)
        {
            oppMovesRank.Add(NextMove(myMoves, oppMoves, myNextMove, (ushort)(move.move ^ oppMoves), true, (ushort)(depth + 1)));
        }

        var oppBestMove = oppMovesRank.MinBy(d => d.score);
        var oppBestScore = oppBestMove.score;
        if (oppBestScore >= WIN || oppBestScore <= -WIN)
        {
            return oppBestMove;
        }

        var oppBestMoves = oppMovesRank.Where(d => d.score == oppBestScore);
        return oppBestMoves.ElementAt(new Random().Next(0, oppBestMoves.Count()));
    }

    public static (ushort move, int score) Minimax(this ushort myMoves, ushort oppMoves) 
    {
        return NextMove(myMoves, oppMoves, 0, 0, true, 0);
    }
}

public interface IComputationService
{
    public (ushort, int) Handle(ushort playerMoves, ushort cpuMoves);
}

public class ComputationService: IComputationService
{
   
    public ComputationService()
    {

    }

   
    public (ushort, int) Handle(ushort playerMoves, ushort cpuMoves)
    {
        // myMoves
        var (cpuMove, cpuScore) = cpuMoves.Minimax(playerMoves);
        if (cpuScore == -ComputationServiceExtension.WIN)
        {
            // cpu can't move, player wins
            return (0, 1);
        }

        if (cpuScore ==  ComputationServiceExtension.WIN)
        {
            // cpu makes final move, player will lose
            return (cpuMove, -1);
        }

        if (cpuMove == 0)
        {
            // draw, no possible moves
            return (0, 0);
        }

        return (cpuMove, 10);
    }
}

