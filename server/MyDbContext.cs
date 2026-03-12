using Microsoft.EntityFrameworkCore;

namespace server;

public class MyDbContext : DbContext
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("iot_weatherstation");
    }

    public MyDbContext(DbContextOptions<MyDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Station> Stations { get; set; }
    public DbSet<Measurement> Measurements { get; set; }
    public DbSet<WindTurbine> WindTurbines { get; set; }
    public DbSet<TurbineMetric> TurbineMetrics { get; set; }
    public DbSet<OperatorCommand> OperatorCommands { get; set; }
    public DbSet<Alert> Alerts { get; set; }
}

public enum AlertSeverity
{
    Info,
    Warning,
    Critical
}

[PrimaryKey(nameof(Id))]
public class Alert
{
    public Guid Id { get; set; }
    public string TurbineId { get; set; }
    public AlertSeverity Severity { get; set; }
    public string Message { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public bool Acknowledged { get; set; }
}

[PrimaryKey(nameof(Id))]
public class User
{
    public string Id { get; set; }
    public string Nickname { get; set; }
    public string Salt { get; set; }
    public string Hash { get; set; }
}

[PrimaryKey(nameof(Id))]
public class Station
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string CreatedBy { get; set; }
}

[PrimaryKey(nameof(Id))]
public class Measurement
{
    public Guid Id { get; set; }
    public string StationId { get; set; }
    public string SensorId { get; set; }
    public DateTime Timestamp { get; set; }
    public double Temperature { get; set; }
    public double Humidity { get; set; }
    public double Pressure { get; set; }
    public int LightLevel { get; set; }
}

[PrimaryKey(nameof(Id))]
public class WindTurbine
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Location { get; set; }
    public TurbineStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public enum TurbineStatus
{
    Running,
    Stopped,
    Maintenance,
    Fault
}

[PrimaryKey(nameof(Id))]
public class TurbineMetric
{
    public Guid Id { get; set; }
    public string TurbineId { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public double Rpm { get; set; }
    public double PowerOutputKw { get; set; }
    public double WindSpeedMs { get; set; }
    public double BladeAngleDeg { get; set; }
    public double Temperature { get; set; }
    public double Vibration { get; set; }
}

[PrimaryKey(nameof(Id))]
public class OperatorCommand
{
    public Guid Id { get; set; }
    public string TurbineId { get; set; }
    public string UserId { get; set; }
    public string CommandType { get; set; }
    public string Parameters { get; set; }
    public DateTimeOffset Timestamp { get; set; }
}

