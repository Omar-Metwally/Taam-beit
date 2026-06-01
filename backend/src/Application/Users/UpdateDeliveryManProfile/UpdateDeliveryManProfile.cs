
using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.UpdateDeliveryManProfile;

public sealed record UpdateDeliveryManVehicleTypeCommand(
    VehicleType VehicleType) : ICommand;

internal sealed class UpdateDeliveryManVehicleTypeCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<UpdateDeliveryManVehicleTypeCommand>
{
    public async Task<Result> Handle(
        UpdateDeliveryManVehicleTypeCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(userContext.UserId));

        if (user.DeliveryManProfile is null)
            return Result.Failure(UserErrors.DeliveryManProfileNotFound);

        var result = user.DeliveryManProfile.UpdateVehicleType(command.VehicleType);

        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

internal sealed class UpdateDeliveryManVehicleTypeCommandValidator
    : AbstractValidator<UpdateDeliveryManVehicleTypeCommand>
{
    public UpdateDeliveryManVehicleTypeCommandValidator()
    {
        RuleFor(x => x.VehicleType).IsInEnum();
    }
}