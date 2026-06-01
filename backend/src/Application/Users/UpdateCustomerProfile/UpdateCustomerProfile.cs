
using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Users.GetMyProfile;
using Application.Users.Login;
using Application.Users.UpdateDeliveryManLocation;
using Domain.Common;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.UpdateCustomerProfile;

public sealed record UpdateCustomerProfileCommand(
    string? Firstname,
    string? Lastname,
    double? Latitude,
    double? Longitude,
    string? AddressLine) : ICommand;

internal class UpdateCustomerProfileCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<UpdateCustomerProfileCommand>
{
    public async Task<Result> Handle(
        UpdateCustomerProfileCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(
                u => u.Id == userContext.UserId,
                cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(userContext.UserId));

        Location? location = null;

        if (command.Latitude.HasValue &&
            command.Longitude.HasValue)
        {
            Result<Location> locationResult = Location.Create(
                command.Latitude.Value,
                command.Longitude.Value,
                command.AddressLine);

            if (locationResult.IsFailure)
                return locationResult;

            location = locationResult.Value;
        }

        Result result = user.Update(
            firstName: command.Firstname,
            lastName: command.Lastname,
            defaultDeliveryLocation: location);

        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);

        return result;
    }
}

internal sealed class UpdateCustomerProfileCommandValidator
    : AbstractValidator<UpdateCustomerProfileCommand>
{
    public UpdateCustomerProfileCommandValidator()
    {
        RuleFor(x => x.Firstname)
            .NotEmpty()
            .MaximumLength(100)
            .When(x => x.Firstname is not null);

        RuleFor(x => x.Lastname)
            .NotEmpty()
            .MaximumLength(100)
            .When(x => x.Lastname is not null);

        RuleFor(x => x.AddressLine)
            .NotEmpty()
            .MaximumLength(500)
            .When(x => x.AddressLine is not null);

        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90)
            .When(x => x.Latitude.HasValue);

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .When(x => x.Longitude.HasValue);

        // Latitude & Longitude must both be present or both absent
        RuleFor(x => x)
            .Must(x => x.Latitude.HasValue == x.Longitude.HasValue)
            .WithMessage("Latitude and Longitude must both be provided, or both omitted.")
            .OverridePropertyName(nameof(UpdateCustomerProfileCommand.Latitude));
    }
}