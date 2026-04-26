using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.ApplyAsDeliveryMan;

public sealed record ApplyAsDeliveryManCommand(
    string PersonalIdNumber,
    VehicleType VehicleType,
    double Latitude,
    double Longitude) : ICommand;

internal sealed class ApplyAsDeliveryManCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<ApplyAsDeliveryManCommand>
{
    public async Task<r> Handle(
        ApplyAsDeliveryManCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(userContext.UserId));

        Result<Location> locationResult = Location.Create(command.Latitude, command.Longitude);

        if (locationResult.IsFailure)
            return Result.Failure(locationResult.Error);

        Result result = user.ApplyAsDeliveryMan(
            command.PersonalIdNumber,
            command.VehicleType,
            locationResult.Value,
            dateTimeProvider.UtcNow);

        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

internal sealed class ApplyAsDeliveryManCommandValidator : AbstractValidator<ApplyAsDeliveryManCommand>
{
    public ApplyAsDeliveryManCommandValidator()
    {
        RuleFor(x => x.PersonalIdNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.VehicleType).IsInEnum();
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
    }
}
