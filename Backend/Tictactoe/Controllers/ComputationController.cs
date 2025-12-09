using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tictactoe.Services;

namespace Tictactoe.Controllers;

[ApiController]
[Route("[controller]")]
public class ComputationController(IComputationService computationService) : ControllerBase
{

    [HttpPost("nextmove")]
    [Authorize]
    public ComputeResponse NextMove([FromBody]ComputeRequest request)
    {
        var (nextMove, score) = computationService.Handle(request.PlayerMoves, request.CpuMoves);
        return new ComputeResponse { NextMove = nextMove, Win = score };
    }
}
