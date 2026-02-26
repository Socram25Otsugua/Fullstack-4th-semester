using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Dtos;
using server.Options;

namespace server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly JwtService _jwtService;
    private readonly MyDbContext _db;
    private readonly JwtOptions _jwtOptions;
    private readonly ILogger<AuthController> _logger;

    public AuthController(JwtService jwtService, MyDbContext db, Microsoft.Extensions.Options.IOptions<JwtOptions> jwtOptions, ILogger<AuthController> logger)
    {
        _jwtService = jwtService;
        _db = db;
        _jwtOptions = jwtOptions.Value;
        _logger = logger;
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return Unauthorized("Username and password are required.");

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Nickname == request.Username, cancellationToken);

        if (user == null)
        {
            _logger.LogWarning("Login failed: unknown user {Username}", request.Username);
            return Unauthorized("Invalid username or password.");
        }

        var computedHash = Convert.ToBase64String(
            SHA256.HashData(Encoding.UTF8.GetBytes(request.Password + user.Salt)));

        if (computedHash != user.Hash)
        {
            _logger.LogWarning("Login failed: bad password for user {Username}", request.Username);
            return Unauthorized("Invalid username or password.");
        }

        var expiresUtc = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpiryMinutes);
        var token = _jwtService.GenerateToken(user.Id, user.Nickname);

        return Ok(new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            UserName = user.Nickname,
            ExpiresAtUtc = expiresUtc,
        });
    }
}
