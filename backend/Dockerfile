# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files first for layer caching on restore
COPY ["src/SharedKernel/SharedKernel.csproj",  "src/SharedKernel/"]
COPY ["src/Domain/Domain.csproj",              "src/Domain/"]
COPY ["src/Application/Application.csproj",    "src/Application/"]
COPY ["src/Infrastructure/Infrastructure.csproj","src/Infrastructure/"]
COPY ["src/Api/Api.csproj",                    "src/Api/"]

RUN dotnet restore "src/Api/Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/src/Api"
RUN dotnet build "Api.csproj" -c Release -o /app/build

# ── Stage 2: Publish ───────────────────────────────────────────────────────────
FROM build AS publish
RUN dotnet publish "Api.csproj" -c Release -o /app/publish \
    /p:UseAppHost=false

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install libvips — required by NetVips for image processing
# libvips processes images in a tile pipeline with very low memory overhead
RUN apt-get update &&     apt-get install -y --no-install-recommends libvips libvips-dev &&     rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

COPY --from=publish /app/publish .

EXPOSE 8080
EXPOSE 8081

ENTRYPOINT ["dotnet", "Api.dll"]
