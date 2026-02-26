namespace server.Dtos;

public class LoginResponse
{
    public string Token { get; set; } = "";
    public string UserId { get; set; } = "";
    public string UserName { get; set; } = "";
    public DateTime ExpiresAtUtc { get; set; }
}
