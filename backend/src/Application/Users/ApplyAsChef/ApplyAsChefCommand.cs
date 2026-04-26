using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.ApplyAsChef;

public sealed record ApplyAsChefCommand(
    double Latitude,
    double Longitude,
    string? AddressLine) : ICommand;

internal sealed class ApplyAsChefCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<ApplyAsChefCommand>
{
    public async Task<Result> Handle(
        ApplyAsChefCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(userContext.UserId));

        Result<Location> locationResult = Location.Create(
            command.Latitude,
            command.Longitude,
            command.AddressLine);

        if (locationResult.IsFailure)
            return Result.Failure(locationResult.Error);

        Result result = user.ApplyAsChef(
            locationResult.Value,
            dateTimeProvider.UtcNow);

        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

internal sealed class ApplyAsChefCommandValidator : AbstractValidator<ApplyAsChefCommand>
{
    public ApplyAsChefCommandValidator()
    {
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
    }
}
