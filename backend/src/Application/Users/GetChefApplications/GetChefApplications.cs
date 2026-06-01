using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.GetChefApplications;

public sealed record GetChefApplicationsQuery(
    ProfileStatus? Status) : IQuery<List<ChefApplicationResponse>>;

public sealed record ChefApplicationResponse(
    Guid UserId,
    string FullName,
    string Email,
    string? AvatarUrl,
    string OperationLocationAddress,
    double Latitude,
    double Longitude,
    ProfileStatus Status,
    string? RejectionReason,
    bool HasHealthCertificate,
    bool HasPersonalId,
    DateTime AppliedAt,
    DateTime? ReviewedAt,
    Guid? ReviewedByUserId);

internal sealed class GetChefApplicationsQueryHandler(
    IApplicationDbContext dbContext)
    : IQueryHandler<GetChefApplicationsQuery, List<ChefApplicationResponse>>
{
    public async Task<Result<List<ChefApplicationResponse>>> Handle(
        GetChefApplicationsQuery query,
        CancellationToken cancellationToken)
    {
        var users = await dbContext.Users
            .Include(u => u.ChefProfile)
            .Where(u => u.ChefProfile != null)
            .Where(u => query.Status == null || u.ChefProfile!.Status == query.Status)
            .OrderByDescending(u => u.ChefProfile!.AppliedAt)
            .ToListAsync(cancellationToken);

        var result = users.Select(u => new ChefApplicationResponse(
            UserId: u.Id,
            FullName: u.FullName,
            Email: u.Email,
            AvatarUrl: u.ChefProfile!.AvatarUrl,
            OperationLocationAddress: u.ChefProfile.OperationLocation.AddressLine ?? string.Empty,
            Latitude: u.ChefProfile.OperationLocation.Latitude,
            Longitude: u.ChefProfile.OperationLocation.Longitude,
            Status: u.ChefProfile.Status,
            RejectionReason: u.ChefProfile.RejectionReason,
            HasHealthCertificate: u.ChefProfile.HealthCertificateReference is not null,
            HasPersonalId: u.ChefProfile.PersonalIdReference is not null,
            AppliedAt: u.ChefProfile.AppliedAt,
            ReviewedAt: u.ChefProfile.ReviewedAt,
            ReviewedByUserId: u.ChefProfile.ReviewedByUserId
        )).ToList();

        return Result.Success(result);
    }
}

internal sealed class GetChefApplicationsQueryValidator
    : AbstractValidator<GetChefApplicationsQuery>
{
    public GetChefApplicationsQueryValidator()
    {
        RuleFor(x => x.Status)
            .IsInEnum()
            .When(x => x.Status.HasValue);
    }
}