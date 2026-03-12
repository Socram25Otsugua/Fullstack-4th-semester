using System.Text.Json.Serialization;

namespace server.Dtos;

public class TurbineAlertDto
{
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("severity")]
    public string? Severity { get; set; }
}
