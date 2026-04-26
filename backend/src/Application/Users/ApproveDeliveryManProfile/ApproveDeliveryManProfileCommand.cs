using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.ApproveDeliveryManProfile;

public sealed record ApproveDeliveryManProfileCommand(Guid TargetUserId) : ICommand;

internal sealed class ApproveDeliveryManProfileCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<ApproveDeliveryManProfileCommand>
{
    public async Task<r> Handle(
        ApproveDeliveryManProfileCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == command.TargetUserId, cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(command.TargetUserId));

        Result result = user.ApproveDeliveryManProfile(userContext.UserId, dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class ApproveDeliveryManProfileCommandValidator : AbstractValidator<ApproveDeliveryManProfileCommand>
{
    public ApproveDeliveryManProfileCommandValidator()
    {
        RuleFor(x => x.TargetUserId).NotEmpty();
    }
}
