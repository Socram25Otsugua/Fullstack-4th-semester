using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mqtt.Controllers;
using StateleSSE.AspNetCore;
using StateleSSE.AspNetCore.EfRealtime;
using StateleSSE.AspNetCore.GroupRealtime;
using server.Dtos;
using server.Services;

namespace server.Controllers;

public class WebClientController(
    ISseBackplane backplane,
    IRealtimeManager realtimeManager,
    MyDbContext db,
    TurbineCommandService turbineCommandService
) : RealtimeControllerBase(backplane)
{
    [HttpGet(nameof(GetMeasurements))]
    public async Task<RealtimeListenResponse<List<Measurement>>> GetMeasurements(string connectionId)
    {
        var group = "measurements";
        await backplane.Groups.AddToGroupAsync(connectionId, group);
        realtimeManager.Subscribe<MyDbContext>(connectionId, group,
            criteria: snapshot => snapshot.HasChanges<Measurement>(),
            query: async context => await context.Measurements.ToListAsync());
        return new RealtimeListenResponse<List<Measurement>>(group, db.Measurements.ToList());
    }

    [HttpGet(nameof(GetTurbines))]
    public async Task<RealtimeListenResponse<List<WindTurbine>>> GetTurbines(string connectionId)
    {
        var group = "turbines";
        await backplane.Groups.AddToGroupAsync(connectionId, group);
        realtimeManager.Subscribe<MyDbContext>(connectionId, group,
            criteria: snapshot => snapshot.HasChanges<WindTurbine>(),
            query: async context => await context.WindTurbines.ToListAsync());
        return new RealtimeListenResponse<List<WindTurbine>>(group, await db.WindTurbines.ToListAsync());
    }

    [HttpGet(nameof(GetTurbineMetrics))]
    public async Task<RealtimeListenResponse<List<TurbineMetric>>> GetTurbineMetrics(string connectionId, string turbineId)
    {
        var group = $"metrics:{turbineId}";
        await backplane.Groups.AddToGroupAsync(connectionId, group);
        realtimeManager.Subscribe<MyDbContext>(connectionId, group,
            criteria: snapshot => snapshot.HasChanges<TurbineMetric>(),
            query: async context => await context.TurbineMetrics
                .Where(m => m.TurbineId == turbineId)
                .OrderByDescending(m => m.Timestamp)
                .Take(500)
                .ToListAsync());
        var data = await db.TurbineMetrics
            .Where(m => m.TurbineId == turbineId)
            .OrderByDescending(m => m.Timestamp)
            .Take(500)
            .ToListAsync();
        return new RealtimeListenResponse<List<TurbineMetric>>(group, data);
    }

    [HttpGet(nameof(GetAlerts))]
    public async Task<RealtimeListenResponse<List<Alert>>> GetAlerts(string connectionId)
    {
        var group = "alerts";
        await backplane.Groups.AddToGroupAsync(connectionId, group);
        realtimeManager.Subscribe<MyDbContext>(connectionId, group,
            criteria: snapshot => snapshot.HasChanges<Alert>(),
            query: async context => await context.Alerts
                .OrderByDescending(a => a.Timestamp)
                .Take(200)
                .ToListAsync());
        var data = await db.Alerts
            .OrderByDescending(a => a.Timestamp)
            .Take(200)
            .ToListAsync();
        return new RealtimeListenResponse<List<Alert>>(group, data);
    }

    [HttpGet(nameof(GetOperatorCommands))]
    public async Task<RealtimeListenResponse<List<OperatorCommand>>> GetOperatorCommands(string connectionId, string? turbineId = null)
    {
        var group = turbineId != null ? $"commands:{turbineId}" : "commands:all";
        await backplane.Groups.AddToGroupAsync(connectionId, group);
        realtimeManager.Subscribe<MyDbContext>(connectionId, group,
            criteria: snapshot => snapshot.HasChanges<OperatorCommand>(),
            query: async context =>
            {
                var q = context.OperatorCommands.OrderByDescending(c => c.Timestamp).Take(500);
                if (turbineId != null)
                    q = q.Where(c => c.TurbineId == turbineId);
                return await q.ToListAsync();
            });
        var query = db.OperatorCommands.OrderByDescending(c => c.Timestamp).Take(500);
        if (turbineId != null)
            query = query.Where(c => c.TurbineId == turbineId);
        var data = await query.ToListAsync();
        return new RealtimeListenResponse<List<OperatorCommand>>(group, data);
    }

    [Authorize]
    [HttpPost(nameof(SendTurbineCommand))]
    public async Task<IActionResult> SendTurbineCommand([FromBody] SendTurbineCommandRequest? request)
    {
        if (request == null || !ModelState.IsValid)
            return BadRequest(ModelState);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ValidationException("User not authenticated");
        await turbineCommandService.ExecuteAsync(request, userId);
        return Ok();
    }
}