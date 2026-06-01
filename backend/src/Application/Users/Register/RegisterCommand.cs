using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Users.Login;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Register;

public sealed record RegisterCommand(
    string Email,
    string FirstName,
    string LastName,
    string Password) : ICommand<LoginResponse>;

internal sealed class RegisterCommandHandler(
    IApplicationDbContext dbContext,
    IPasswordHasher passwordHasher,
    IDateTimeProvider dateTimeProvider,
    ITokenProvider tokenProvider) : ICommandHandler<RegisterCommand, LoginResponse>
{
    public async Task<Result<LoginResponse>> Handle(
        RegisterCommand command,
        CancellationToken cancellationToken)
    {
        bool emailTaken = await dbContext.Users
            .AnyAsync(u => u.Email == command.Email, cancellationToken);

        if (emailTaken)
            return Result.Failure<LoginResponse>(UserErrors.EmailNotUnique);

        var user = User.Register(
            command.Email,
            command.FirstName,
            command.LastName,
            passwordHasher.Hash(command.Password),
            dateTimeProvider.UtcNow);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        string token = tokenProvider.Create(user);
        return Result.Success(new LoginResponse(user.Id, token, ["Customer"]));
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
