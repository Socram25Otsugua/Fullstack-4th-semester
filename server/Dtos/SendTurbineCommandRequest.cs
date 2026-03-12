using System.ComponentModel.DataAnnotations;

namespace server.Dtos;

public class SendTurbineCommandRequest
{
    [Required]
    public string TurbineId { get; set; }

    [Required]
    public string CommandType { get; set; }

    public string? Parameters { get; set; }
}
