using System.Text.Json.Serialization;

namespace server.Dtos;

public class SeaFullstackAlertDto
{
    [JsonPropertyName("turbineId")]
    public string TurbineId { get; set; } = "";

    [JsonPropertyName("severity")]
    public string? Severity { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("timestamp")]
    public string? Timestamp { get; set; }
}
