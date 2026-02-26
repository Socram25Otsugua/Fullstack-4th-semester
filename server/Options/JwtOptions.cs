namespace server.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = "dnflfbalfbaslfbaslfbalfbaslfbafljbqjflasbfljkasbfkjasbfskajfkjabfjksaf";

    public int ExpiryMinutes { get; set; } = 24 * 60;

    public string? Issuer { get; set; }

    public string? Audience { get; set; }
}
