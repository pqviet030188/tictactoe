using Microsoft.AspNetCore.Mvc;
using Tictactoe.Services;

namespace Tictactoe.Controllers;

[ApiController]
[Route("[controller]")]
public class ComputationController : ControllerBase
{
    private readonly ILogger<ComputationController> _logger;
    private static readonly Random _rng = new Random();
    private readonly IComputationService _computationService;
    public ComputationController(ILogger<ComputationController> logger, IComputationService computationService)
    {
        _logger = logger;
        _computationService = computationService;
    }

    [HttpPost(Name = "Compute")]
    public ComputeResponse Compute([FromBody]ComputeRequest request)
    {
        var (nextMove, score) = _computationService.Handle(request.PlayerMoves, request.CpuMoves);
        return new ComputeResponse { NextMove = nextMove, Win = score };
    }
}
