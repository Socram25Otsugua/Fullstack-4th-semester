using System.Text.Json;
using Mqtt.Controllers;
using server.Dtos;

namespace server.Controllers;

public class SeaFullstackMqttController(ILogger<SeaFullstackMqttController> logger, MyDbContext db) : MqttController
{
    [MqttRoute("farm/our-farm/windmill/{turbineId}/telemetry")]
    public async Task HandleFarmTelemetry(SeaFullstackTelemetryDto dto, string turbineId)
    {
        if (string.IsNullOrEmpty(dto.TurbineId)) return;
        var turbine = await db.WindTurbines.FindAsync(dto.TurbineId);
        if (turbine == null)
        {
            turbine = new WindTurbine
            {
                Id = dto.TurbineId,
                Name = dto.TurbineName ?? dto.TurbineId,
                Location = "Offshore Platform",
                Status = string.Equals(dto.Status, "running", StringComparison.OrdinalIgnoreCase) ? TurbineStatus.Running : TurbineStatus.Stopped,
                CreatedAt = DateTimeOffset.UtcNow
            };
            db.WindTurbines.Add(turbine);
        }
        else
        {
            if (turbine.Status != TurbineStatus.Stopped)
                turbine.Status = string.Equals(dto.Status, "running", StringComparison.OrdinalIgnoreCase) ? TurbineStatus.Running : TurbineStatus.Stopped;
        }

        if (turbine.Status == TurbineStatus.Stopped)
        {
            await db.SaveChangesAsync();
            return;
        }

        var temp = dto.GeneratorTemp ?? dto.GearboxTemp ?? dto.AmbientTemperature ?? 0;
        var ts = !string.IsNullOrEmpty(dto.Timestamp) ? DateTimeOffset.Parse(dto.Timestamp!) : DateTimeOffset.UtcNow;
        db.TurbineMetrics.Add(new TurbineMetric
        {
            Id = Guid.NewGuid(),
            TurbineId = dto.TurbineId,
            Timestamp = ts,
            Rpm = dto.RotorSpeed ?? 0,
            PowerOutputKw = dto.PowerOutput ?? 0,
            WindSpeedMs = dto.WindSpeed ?? 0,
            BladeAngleDeg = dto.BladePitch ?? 0,
            Temperature = temp,
            Vibration = dto.Vibration ?? 0
        });
        await db.SaveChangesAsync();
        logger.LogDebug("Sea-fullstack telemetry: {TurbineId} power={Power}", dto.TurbineId, dto.PowerOutput);
    }
    
    [MqttRoute("farm/our-farm/windmill/{turbineId}/alert")]
    public async Task HandleFarmAlerts(SeaFullstackAlertDto dto, string turbineId)
    {
        if (string.IsNullOrEmpty(dto.TurbineId)) return;
        var severity = dto.Severity?.ToLowerInvariant() switch
        {
            "critical" => AlertSeverity.Critical,
            "warning" or "high" => AlertSeverity.Warning,
            _ => AlertSeverity.Info
        };
        db.Alerts.Add(new Alert
        {
            Id = Guid.NewGuid(),
            TurbineId = dto.TurbineId,
            Severity = severity,
            Message = dto.Message ?? "Alert",
            Timestamp = !string.IsNullOrEmpty(dto.Timestamp) ? DateTimeOffset.Parse(dto.Timestamp!) : DateTimeOffset.UtcNow,
            Acknowledged = false
        });
        await db.SaveChangesAsync();
        logger.LogInformation("Sea-fullstack alert: {TurbineId} {Message}", dto.TurbineId, dto.Message);
    }
}
