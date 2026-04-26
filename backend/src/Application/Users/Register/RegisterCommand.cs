using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Register;

public sealed record RegisterCommand(
    string Email,
    string FirstName,
    string LastName,
    string Password) : ICommand<RegisterResponse>;

public sealed record RegisterResponse(Guid UserId, string Token);

internal sealed class RegisterCommandHandler(
    IApplicationDbContext dbContext,
    IPasswordHasher passwordHasher,
    ITokenProvider tokenProvider,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<RegisterCommand, RegisterResponse>
{
    public async Task<Result<RegisterResponse>> Handle(
        RegisterCommand command,
        CancellationToken cancellationToken)
    {
        bool emailTaken = await dbContext.Users
            .AnyAsync(u => u.Email == command.Email, cancellationToken);

        if (emailTaken)
            return Result.Failure<RegisterResponse>(UserErrors.EmailNotUnique);

        var user = User.Register(
            command.Email,
            command.FirstName,
            command.LastName,
            passwordHasher.Hash(command.Password),
            dateTimeProvider.UtcNow);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        string token = tokenProvider.Create(user);

        return Result.Success(new RegisterResponse(user.Id, token));
    }
}

internal sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().EmailAddress();

        RuleFor(x => x.FirstName)
            .NotEmpty().MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().MaximumLength(100);

        RuleFor(x => x.Password)
            .NotEmpty().MinimumLength(8);
    }
}
