using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Mqtt.Controllers;
using NSwag;
using NSwag.Generation.Processors.Security;
using server;
using server.Options;
using server.Services;
using StateleSSE.AspNetCore;
using StateleSSE.AspNetCore.GroupRealtime;
using Testcontainers.PostgreSql;

var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var configuration = builder.Configuration;
var connectionStrings = new ConnectionStrings();
configuration.GetSection(nameof(ConnectionStrings)).Bind(connectionStrings);
if (!configuration.GetSection(nameof(ConnectionStrings)).Exists())
    connectionStrings.UseSeaFullstackDataSources = true;
if (string.IsNullOrWhiteSpace(connectionStrings.DbConnectionString))
{
    var container = new PostgreSqlBuilder("postgres:15.1").Build();
    container.StartAsync().GetAwaiter().GetResult();
    connectionStrings.DbConnectionString = container.GetConnectionString();
}
if (string.IsNullOrWhiteSpace(connectionStrings.MqttBroker))
{
    connectionStrings.MqttBroker = "broker.hivemq.com";
    connectionStrings.MqttPort = 1883;
}

builder.Services.AddSingleton(connectionStrings);

var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwtOptions.Secret))
    jwtOptions.Secret = connectionStrings.Secret ?? "";
builder.Services.Configure<JwtOptions>(options =>
{
    configuration.GetSection(JwtOptions.SectionName).Bind(options);
    if (string.IsNullOrWhiteSpace(options.Secret) && !string.IsNullOrWhiteSpace(connectionStrings.Secret))
        options.Secret = connectionStrings.Secret;
});

var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtOptions.Issuer),
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtOptions.Audience),
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
        o.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                if (ctx.Exception is SecurityTokenExpiredException)
                    ctx.Response.Headers.Append("Token-Expired", "true");
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();
builder.Services.Configure<HostOptions>(opts => opts.ShutdownTimeout = TimeSpan.FromSeconds(0));

builder.Services.AddInMemorySseBackplane();
builder.Services.AddEfRealtime();
builder.Services.AddGroupRealtime();

builder.Services.AddDbContext<MyDbContext>((sp, conf) =>
{
    conf.UseNpgsql(connectionStrings.DbConnectionString);
    conf.AddEfRealtimeInterceptor(sp);
});
builder.Services.AddOpenApiDocument(config =>
{
    config.AddSecurity("Bearer", new OpenApiSecurityScheme
    {
        Type = OpenApiSecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Enter your JWT token"
    });
    config.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("Bearer"));
    
});
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        var exception = context.HttpContext.Features.Get<IExceptionHandlerFeature>()?.Error;
        if (exception != null)
        {
            context.ProblemDetails.Detail = exception.Message;
        }
    };
});
builder.Services.AddSingleton<JwtService>();
builder.Services.AddScoped<TurbineCommandService>();
builder.Services.AddMqttControllers();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddCors();
builder.Services.AddScoped<Seeder>();


var app = builder.Build();
app.UseExceptionHandler();
app.UseOpenApi();
app.UseSwaggerUi();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");
app.UseCors(c => 
    c.AllowAnyHeader()
        .AllowAnyMethod()
        .AllowAnyOrigin()
        .SetIsOriginAllowed(_ => true));




var mqttClient = app.Services.GetRequiredService<IMqttClientService>();
await mqttClient.ConnectAsync(connectionStrings.MqttBroker, connectionStrings.MqttPort);

if (app.Environment.IsDevelopment())
    app.GenerateApiClientsFromOpenApi("../client/src/generated-ts-client.ts", "./openapi.json").GetAwaiter().GetResult();

using(var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();
    db.Database.EnsureCreated();
    
    scope.ServiceProvider.GetRequiredService<Seeder>().Seed();
}

app.Run();

