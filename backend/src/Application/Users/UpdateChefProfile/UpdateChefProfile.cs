
using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.UpdateChefProfile;

public sealed record UpdateChefProfileCommand(
    double Latitude,
    double Longitude,
    string AddressLine) : ICommand;

internal sealed class UpdateChefProfileCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<UpdateChefProfileCommand>
{
    public async Task<Result> Handle(
        UpdateChefProfileCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(userContext.UserId));

        if (user.ChefProfile is null)
            return Result.Failure(UserErrors.ChefProfileNotFound);

        Location? location = null;

        Result<Location> locationResult = Location.Create(
            command.Latitude,
            command.Longitude,
            command.AddressLine);

        if (locationResult.IsFailure)
            return locationResult;

        location = locationResult.Value;

        var result = user.ChefProfile.UpdateOperationLocation(
            operationLocation: location);

        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

internal sealed class UpdateChefProfileCommandValidator
    : AbstractValidator<UpdateChefProfileCommand>
{
    public UpdateChefProfileCommandValidator()
    {
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);

        RuleFor(x => x.AddressLine)
            .NotEmpty()
            .MaximumLength(500)
            .When(x => x.AddressLine is not null);
    }
}