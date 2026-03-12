using System.Text.Json.Serialization;

namespace server.Dtos;

public class SeaFullstackTelemetryDto
{
    [JsonPropertyName("turbineId")]
    public string TurbineId { get; set; } = "";

    [JsonPropertyName("turbineName")]
    public string TurbineName { get; set; } = "";

    [JsonPropertyName("farmId")]
    public string? FarmId { get; set; }

    [JsonPropertyName("timestamp")]
    public string? Timestamp { get; set; }

    [JsonPropertyName("windSpeed")]
    public double? WindSpeed { get; set; }

    [JsonPropertyName("windDirection")]
    public double? WindDirection { get; set; }

    [JsonPropertyName("ambientTemperature")]
    public double? AmbientTemperature { get; set; }

    [JsonPropertyName("rotorSpeed")]
    public double? RotorSpeed { get; set; }

    [JsonPropertyName("powerOutput")]
    public double? PowerOutput { get; set; }

    [JsonPropertyName("nacelleDirection")]
    public double? NacelleDirection { get; set; }

    [JsonPropertyName("bladePitch")]
    public double? BladePitch { get; set; }

    [JsonPropertyName("generatorTemp")]
    public double? GeneratorTemp { get; set; }

    [JsonPropertyName("gearboxTemp")]
    public double? GearboxTemp { get; set; }

    [JsonPropertyName("vibration")]
    public double? Vibration { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }
}
