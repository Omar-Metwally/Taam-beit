using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.RejectChefProfile;

public sealed record RejectChefProfileCommand(Guid TargetUserId, string Reason) : ICommand;

internal sealed class RejectChefProfileCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<RejectChefProfileCommand>
{
    public async Task<r> Handle(
        RejectChefProfileCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == command.TargetUserId, cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(command.TargetUserId));

        Result result = user.RejectChefProfile(userContext.UserId, command.Reason, dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class RejectChefProfileCommandValidator : AbstractValidator<RejectChefProfileCommand>
{
    public RejectChefProfileCommandValidator()
    {
        RuleFor(x => x.TargetUserId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
