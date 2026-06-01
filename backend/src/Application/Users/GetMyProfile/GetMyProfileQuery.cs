using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.GetMyProfile;

public sealed record GetMyProfileQuery : IQuery<MyProfileResponse>;

// ── Sub-records ───────────────────────────────────────────────────────────────

public sealed record MyChefProfileResponse(
    string? AvatarSmallUrl,
    string? AvatarLargeUrl,
    string OperationLocationAddress,
    double Latitude,
    double Longitude,
    ProfileStatus Status,
    string? RejectionReason,
    bool HasHealthCertificate,
    bool HasPersonalId,
    DateTime AppliedAt,
    DateTime? ReviewedAt);

public sealed record MyDeliveryManProfileResponse(
    ProfileStatus Status,
    VehicleType VehicleType,
    string PersonalIdNumber,
    double? CurrentLatitude,
    double? CurrentLongitude,
    string? RejectionReason,
    DateTime AppliedAt,
    DateTime? ReviewedAt);

public sealed record MyProfileResponse(
    Guid UserId,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    MyChefProfileResponse? ChefProfile,
    MyDeliveryManProfileResponse? DeliveryManProfile);

// ── Handler ───────────────────────────────────────────────────────────────────

internal sealed class GetMyProfileQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext)
    : IQueryHandler<GetMyProfileQuery, MyProfileResponse>
{
    public async Task<Result<MyProfileResponse>> Handle(
        GetMyProfileQuery query,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure<MyProfileResponse>(UserErrors.NotFound(userContext.UserId));

        MyChefProfileResponse? chefProfile = user.ChefProfile is null ? null : new MyChefProfileResponse(
            AvatarSmallUrl: user.ChefProfile.AvatarUrl is not null
                                          ? $"{user.ChefProfile.AvatarUrl}-sm.webp"
                                          : null,
            AvatarLargeUrl: user.ChefProfile.AvatarUrl is not null
                                          ? $"{user.ChefProfile.AvatarUrl}-lg.webp"
                                          : null,
            OperationLocationAddress: user.ChefProfile.OperationLocation.AddressLine ?? string.Empty,
            Latitude: user.ChefProfile.OperationLocation.Latitude,
            Longitude: user.ChefProfile.OperationLocation.Longitude,
            Status: user.ChefProfile.Status,
            RejectionReason: user.ChefProfile.RejectionReason,
            HasHealthCertificate: user.ChefProfile.HealthCertificateReference is not null,
            HasPersonalId: user.ChefProfile.PersonalIdReference is not null,
            AppliedAt: user.ChefProfile.AppliedAt,
            ReviewedAt: user.ChefProfile.ReviewedAt);

        MyDeliveryManProfileResponse? deliveryManProfile = user.DeliveryManProfile is null ? null : new MyDeliveryManProfileResponse(
            Status: user.DeliveryManProfile.Status,
            VehicleType: user.DeliveryManProfile.VehicleType,
            PersonalIdNumber: user.DeliveryManProfile.PersonalIdNumber,
            CurrentLatitude: user.DeliveryManProfile.CurrentLocation?.Latitude,
            CurrentLongitude: user.DeliveryManProfile.CurrentLocation?.Longitude,
            RejectionReason: user.DeliveryManProfile.RejectionReason,
            AppliedAt: user.DeliveryManProfile.AppliedAt,
            ReviewedAt: user.DeliveryManProfile.ReviewedAt);

        return Result.Success(new MyProfileResponse(
            UserId: user.Id,
            Email: user.Email,
            FirstName: user.FirstName,
            LastName: user.LastName,
            FullName: user.FullName,
            ChefProfile: chefProfile,
            DeliveryManProfile: deliveryManProfile));
    }
}