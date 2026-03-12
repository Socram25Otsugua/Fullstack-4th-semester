FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src
COPY ["./", "."]
RUN apk add --no-cache nodejs npm
WORKDIR /src/client
RUN npm ci
RUN npm run build
WORKDIR /src
RUN cp -r client/dist/* server/wwwroot/
RUN dotnet publish "server/server.csproj" \
    -c Release \
    -o /app/publish \
    --runtime linux-musl-x64 \
    --self-contained true

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-alpine
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["./server"]
