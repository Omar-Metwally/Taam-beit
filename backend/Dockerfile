FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS restore
WORKDIR /src

# Tell NuGet explicitly where packages live — matches the cache mount target
ENV NUGET_PACKAGES=/root/.nuget/packages

COPY ["src/SharedKernel/SharedKernel.csproj",   "src/SharedKernel/"]
COPY ["src/Domain/Domain.csproj",               "src/Domain/"]
COPY ["src/Application/Application.csproj",     "src/Application/"]
COPY ["src/Infrastructure/Infrastructure.csproj","src/Infrastructure/"]
COPY ["src/Api/Api.csproj",                     "src/Api/"]
COPY ["Directory.Packages.props",               "./"]
COPY ["Directory.Build.props",                  "./"]
COPY ["NuGet.Config",                           "./"]

RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages \
    dotnet restore "src/Api/Api.csproj"

FROM restore AS publish
WORKDIR /src

ENV NUGET_PACKAGES=/root/.nuget/packages

COPY . .

WORKDIR "/src/src/Api"
RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages \
    dotnet publish "Api.csproj" -c Release -o /app/publish \
    --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add vips

ENV DOTNET_EnableDiagnostics=0 \
    COMPlus_EnableDiagnostics=0 \
    ASPNETCORE_URLS=http://+:8080

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=publish /app/publish .

EXPOSE 8080
EXPOSE 8081
ENTRYPOINT ["dotnet", "Api.dll"]