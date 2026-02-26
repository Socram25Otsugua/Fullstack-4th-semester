# Fullstack 4th Semester

Monorepo: ASP.NET Core server + React (Vite) client.

## Structure

- **client/** – React + TypeScript + Vite frontend
- **server/** – ASP.NET Core API (JWT, PostgreSQL, MQTT, SSE)

## Run

**Server** (from repo root):

```bash
cd server && dotnet run
```

**Client**:

```bash
cd client && npm install && npm run dev
```

## Push

```bash
git add .
git commit -m "Initial commit: client + server boilerplate"
git branch -M main
git push -u origin main
```
