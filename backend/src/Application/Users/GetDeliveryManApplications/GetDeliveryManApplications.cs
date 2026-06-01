using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.GetDeliveryManApplications;

public sealed record GetDeliveryManApplicationsQuery(
    ProfileStatus? Status) : IQuery<List<DeliveryManApplicationResponse>>;

public sealed record DeliveryManApplicationResponse(
    Guid UserId,
    string FullName,
    string Email,
    string PersonalIdNumber,
    VehicleType VehicleType,
    double? Latitude,
    double? Longitude,
    ProfileStatus Status,
    string? RejectionReason,
    DateTime AppliedAt,
    DateTime? ReviewedAt,
    Guid? ReviewedByUserId);

internal sealed class GetDeliveryManApplicationsQueryHandler(
    IApplicationDbContext dbContext)
    : IQueryHandler<GetDeliveryManApplicationsQuery, List<DeliveryManApplicationResponse>>
{
    public async Task<Result<List<DeliveryManApplicationResponse>>> Handle(
        GetDeliveryManApplicationsQuery query,
        CancellationToken cancellationToken)
    {
        var users = await dbContext.Users
            .Include(u => u.DeliveryManProfile)
            .Where(u => u.DeliveryManProfile != null)
            .Where(u => query.Status == null || u.DeliveryManProfile!.Status == query.Status)
            .OrderByDescending(u => u.DeliveryManProfile!.AppliedAt)
            .ToListAsync(cancellationToken);

        var result = users.Select(u => new DeliveryManApplicationResponse(
            UserId:           u.Id,
            FullName:         u.FullName,
            Email:            u.Email,
            PersonalIdNumber: u.DeliveryManProfile!.PersonalIdNumber,
            VehicleType:      u.DeliveryManProfile.VehicleType,
            Latitude:         u.DeliveryManProfile.CurrentLocation?.Latitude,
            Longitude:        u.DeliveryManProfile.CurrentLocation?.Longitude,
            Status:           u.DeliveryManProfile.Status,
            RejectionReason:  u.DeliveryManProfile.RejectionReason,
            AppliedAt:        u.DeliveryManProfile.AppliedAt,
            ReviewedAt:       u.DeliveryManProfile.ReviewedAt,
            ReviewedByUserId: u.DeliveryManProfile.ReviewedByUserId
        )).ToList();

        return Result.Success(result);
    }
}

internal sealed class GetDeliveryManApplicationsQueryValidator
    : AbstractValidator<GetDeliveryManApplicationsQuery>
{
    public GetDeliveryManApplicationsQueryValidator()
    {
        RuleFor(x => x.Status)
            .IsInEnum()
            .When(x => x.Status.HasValue);
    }
}
