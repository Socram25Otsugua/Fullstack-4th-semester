using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Mqtt.Controllers;
using server.Dtos;

namespace server.Services;

public class TurbineCommandService(
    MyDbContext db,
    IMqttClientService mqttClient,
    ConnectionStrings connectionStrings,
    ILogger<TurbineCommandService> logger)
{
    public async Task ExecuteAsync(SendTurbineCommandRequest request, string userId)
    {
        var turbine = await db.WindTurbines.FindAsync(request.TurbineId)
            ?? throw new ValidationException("Turbine not found");

        ValidateCommand(request);

        if (request.CommandType == "Start")
            turbine.Status = TurbineStatus.Running;
        else if (request.CommandType == "Stop" || request.CommandType == "EmergencyStop")
            turbine.Status = TurbineStatus.Stopped;

        var cmd = new OperatorCommand
        {
            Id = Guid.NewGuid(),
            TurbineId = request.TurbineId,
            UserId = userId,
            CommandType = request.CommandType,
            Parameters = request.Parameters ?? "",
            Timestamp = DateTimeOffset.UtcNow
        };
        db.OperatorCommands.Add(cmd);
        await db.SaveChangesAsync();

        await PublishToMqttAsync(request);
    }

    private static void ValidateCommand(SendTurbineCommandRequest request)
    {
        var allowedCommands = new[] { "Start", "Stop", "SetBladeAngle", "SetYawAngle", "SetInterval", "EmergencyStop" };
        if (string.IsNullOrWhiteSpace(request.CommandType) || !allowedCommands.Contains(request.CommandType))
            throw new ValidationException($"Invalid command type. Allowed: {string.Join(", ", allowedCommands)}");

        if (request.CommandType == "SetBladeAngle")
        {
            if (string.IsNullOrWhiteSpace(request.Parameters))
                throw new ValidationException("Blade angle parameter is required");
            if (!double.TryParse(request.Parameters, out var angle) || angle < 0 || angle > 30)
                throw new ValidationException("Blade angle must be between 0 and 30 degrees");
        }
        if (request.CommandType == "SetInterval")
        {
            if (string.IsNullOrWhiteSpace(request.Parameters))
                throw new ValidationException("Reporting interval parameter is required");
            if (!int.TryParse(request.Parameters, out var interval) || interval < 1 || interval > 60)
                throw new ValidationException("Reporting interval must be between 1 and 60 seconds");
        }
        if (request.CommandType == "SetYawAngle")
        {
            if (string.IsNullOrWhiteSpace(request.Parameters))
                throw new ValidationException("Yaw angle parameter is required");
            if (!double.TryParse(request.Parameters, out var yaw) || yaw < 0 || yaw > 360)
                throw new ValidationException("Yaw angle must be between 0 and 360 degrees");
        }
        if ((request.CommandType == "Start" || request.CommandType == "Stop" || request.CommandType == "EmergencyStop") && !string.IsNullOrWhiteSpace(request.Parameters))
        {
            if (request.Parameters.Length > 100)
                throw new ValidationException("Power control message must be at most 100 characters");
        }
    }

    private async Task PublishToMqttAsync(SendTurbineCommandRequest request)
    {
        if (!mqttClient.IsConnected)
            return;

        try
        {
            string topic;
            string payload;
            if (connectionStrings.UseSeaFullstackDataSources)
            {
                topic = $"farm/our-farm/windmill/{request.TurbineId}/command";
                var action = request.CommandType switch
                {
                    "Start" => "start",
                    "Stop" or "EmergencyStop" => "stop",
                    "SetBladeAngle" when !string.IsNullOrEmpty(request.Parameters) => "setPitch",
                    "SetInterval" when !string.IsNullOrEmpty(request.Parameters) => "setInterval",
                    _ => (string?)null
                };
                if (action == "start")
                    payload = JsonSerializer.Serialize(new { action = "start" });
                else if (action == "stop")
                {
                    var reason = request.CommandType == "EmergencyStop" ? "emergency"
                        : !string.IsNullOrEmpty(request.Parameters) ? request.Parameters : "operator";
                    payload = JsonSerializer.Serialize(new { action = "stop", reason });
                }
                else if (action == "setPitch" && double.TryParse(request.Parameters, out var angle))
                    payload = JsonSerializer.Serialize(new { action = "setPitch", angle });
                else if (action == "setInterval" && int.TryParse(request.Parameters, out var value))
                    payload = JsonSerializer.Serialize(new { action = "setInterval", value });
                else
                    payload = JsonSerializer.Serialize(new { commandType = request.CommandType, parameters = request.Parameters ?? "" });
            }
            else
            {
                topic = $"turbine/{request.TurbineId}/command";
                payload = JsonSerializer.Serialize(new { commandType = request.CommandType, parameters = request.Parameters ?? "" });
            }
            await mqttClient.PublishAsync(topic, payload);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to publish command to MQTT");
        }
    }
}
