# Fullstack 4th Semester

Web application for wind turbine inspection with real-time telemetry, alerts, and operator commands.

## What this project does

- Shows turbine status and metrics in a graphical web dashboard.
- Ingests telemetry and alerts from MQTT topics.
- Streams real-time updates to the UI using Server-Sent Events (SSE).
- Supports authenticated operator actions (start/stop/emergency stop, blade angle, interval, yaw).

## Tech stack

- Backend: ASP.NET Core (`server`)
- Frontend: React + TypeScript + Vite (`client`)
- Database: PostgreSQL (auto-started with Testcontainers in Development if no DB connection string is set)
- Realtime: `StateleSSE.AspNetCore` (SSE backplane + EF realtime/group realtime)
- MQTT integration: `Mqtt.Controllers` (subscribe/publish to public broker)
- API docs/client generation: NSwag

## Project structure

- `server/` - ASP.NET Core API, MQTT handlers, realtime endpoints, auth, DB model
- `client/` - React UI dashboard
- `Fullstack-4th-semester.slnx` - solution entry

## Key realtime flow

1. Devices/simulators publish telemetry/alerts to MQTT.
2. Backend MQTT controllers receive messages and persist data:
   - `IotController`
   - `SeaFullstackMqttController`
3. EF realtime detects DB changes.
4. SSE groups broadcast updates to connected clients via `WebClientController`.
5. React client listens with `statele-sse` and updates charts/cards live.

## MQTT usage

The backend connects to a public MQTT broker (default in development: `broker.hivemq.com:1883`) and:

- Subscribes via `[MqttRoute(...)]` handlers in MQTT controllers.
- Publishes operator commands through `IMqttClientService` in `TurbineCommandService`.

Common topics used in the app include:

- `turbine/{turbineId}/metrics`
- `turbine/{turbineId}/alerts`
- `farm/our-farm/windmill/{turbineId}/telemetry`
- `farm/our-farm/windmill/{turbineId}/command`

## Authentication

- JWT Bearer authentication is enabled for protected endpoints.
- Login endpoint: `POST /api/Auth/login`
- A development seed user is created if missing:
  - username: `test`
  - password: `pass`

## Configuration

Main config files:

- `server/appsettings.json`
- `server/appsettings.Development.json`

Important settings:

- `ConnectionStrings:DbConnectionString`
- `ConnectionStrings:MqttBroker`
- `ConnectionStrings:MqttPort`
- `ConnectionStrings:UseSeaFullstackDataSources`
- `Jwt:Secret`

Notes:

- In Development, if `DbConnectionString` is empty, the app starts a PostgreSQL container automatically.
- If `Jwt:Secret` is missing, startup fails.

## Run locally

### Prerequisites

- .NET SDK (matching `net10.0` target in `server/server.csproj`)
- Node.js + npm
- Docker (recommended for Development DB auto-provisioning)

### 1) Start backend

```bash
dotnet restore server/server.csproj
dotnet run --project server/server.csproj
```

Backend defaults to port `8080` (or `PORT` env var).

Swagger/OpenAPI UI is available when the server is running:

- `http://localhost:8080/swagger`

### 2) Start frontend (development mode)

```bash
cd client
npm install
npm run dev
```

Then open the Vite URL shown in the terminal.

## API client generation

In Development, backend startup generates/updates:

- `client/src/generated-ts-client.ts`

using OpenAPI (`GenerateApiClientsFromOpenApi`).

## Useful endpoints

- Auth:
  - `POST /api/Auth/login`
- Realtime web client data:
  - `GET /api/WebClient/GetTurbines`
  - `GET /api/WebClient/GetTurbineMetrics`
  - `GET /api/WebClient/GetAlerts`
  - `GET /api/WebClient/GetOperatorCommands`
  - `POST /api/WebClient/SendTurbineCommand` (authorized)

## Notes

- CORS is currently open (`AllowAnyOrigin/Method/Header`) for development convenience.
- This repository also contains a simulator page under `server/wwwroot/`.
