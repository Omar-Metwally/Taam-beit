using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.ApproveChefProfile;

public sealed record ApproveChefProfileCommand(Guid TargetUserId) : ICommand;

internal sealed class ApproveChefProfileCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<ApproveChefProfileCommand>
{
    public async Task<r> Handle(
        ApproveChefProfileCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == command.TargetUserId, cancellationToken);

        if (user is null)
            return Result.Failure(UserErrors.NotFound(command.TargetUserId));

        Result result = user.ApproveChefProfile(userContext.UserId, dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class ApproveChefProfileCommandValidator : AbstractValidator<ApproveChefProfileCommand>
{
    public ApproveChefProfileCommandValidator()
    {
        RuleFor(x => x.TargetUserId).NotEmpty();
    }
}
