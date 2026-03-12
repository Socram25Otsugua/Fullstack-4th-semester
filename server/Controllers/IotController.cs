using Mqtt.Controllers;
using server;
using server.Dtos;

public class IotController(ILogger<IotController> logger, MyDbContext db) : MqttController
{
    [MqttRoute("station/our-farm/sensor/{sensorId}/telemetry")]
    public async Task ListenForMeasurements(Measurement m, string sensorId)
    {
        logger.LogInformation("{Measurement}", System.Text.Json.JsonSerializer.Serialize(m));
        m.Id = Guid.NewGuid();
        db.Measurements.Add(m);
        db.SaveChanges();
    }

    [MqttRoute("turbine/{turbineId}/metrics")]
    public async Task ListenForTurbineMetrics(TurbineMetric m, string turbineId)
    {
        await SaveTurbineMetric(m, turbineId);
    }

    [MqttRoute("farm/our-farm/windmill/{turbineId}/metrics")]
    public async Task ListenForSeaWindmillMetrics(TurbineMetric m, string turbineId)
    {
        await SaveTurbineMetric(m, turbineId);
    }

    private async Task SaveTurbineMetric(TurbineMetric m, string turbineId)
    {
        var turbine = await db.WindTurbines.FindAsync(turbineId);
        if (turbine?.Status == TurbineStatus.Stopped)
            return;
        if (turbine != null)
            turbine.Status = TurbineStatus.Running;
        m.Id = Guid.NewGuid();
        m.TurbineId = turbineId;
        m.Timestamp = DateTimeOffset.UtcNow;
        db.TurbineMetrics.Add(m);
        await db.SaveChangesAsync();
        logger.LogInformation("Saved TurbineMetric for {TurbineId}: power={Power}kW wind={Wind}m/s", turbineId, m.PowerOutputKw, m.WindSpeedMs);
    }

    [MqttRoute("turbine/{turbineId}/alerts")]
    public async Task ListenForTurbineAlerts(TurbineAlertDto dto, string turbineId)
    {
        var severity = (dto.Severity ?? "info").ToLowerInvariant() switch
        {
            "critical" => AlertSeverity.Critical,
            "warning" or "high" => AlertSeverity.Warning,
            _ => AlertSeverity.Info
        };
        db.Alerts.Add(new Alert
        {
            Id = Guid.NewGuid(),
            TurbineId = turbineId,
            Severity = severity,
            Message = dto.Message ?? "Alert",
            Timestamp = DateTimeOffset.UtcNow,
            Acknowledged = false
        });
        await db.SaveChangesAsync();
    }
}