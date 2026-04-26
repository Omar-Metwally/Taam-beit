using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.RejectDeliveryManProfile;

public sealed record RejectDeliveryManProfileCommand(Guid TargetUserId, string Reason) : ICommand;

internal sealed class RejectDeliveryManProfileCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<RejectDeliveryManProfileCommand>
{
    public async Task<r> Handle(
        RejectDeliveryManProfileCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == command.TargetUserId, cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(command.TargetUserId));

        Result result = user.RejectDeliveryManProfile(userContext.UserId, command.Reason, dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class RejectDeliveryManProfileCommandValidator : AbstractValidator<RejectDeliveryManProfileCommand>
{
    public RejectDeliveryManProfileCommandValidator()
    {
        RuleFor(x => x.TargetUserId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
