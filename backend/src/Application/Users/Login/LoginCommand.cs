using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Login;

public sealed record LoginCommand(
    string Email,
    string Password) : ICommand<LoginResponse>;

public sealed record LoginResponse(Guid UserId, string Token);

internal sealed class LoginCommandHandler(
    IApplicationDbContext dbContext,
    IPasswordHasher passwordHasher,
    ITokenProvider tokenProvider) : ICommandHandler<LoginCommand, LoginResponse>
{
    public async Task<Result<LoginResponse>> Handle(
        LoginCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == command.Email, cancellationToken);

        if (user is null)
            return Result.Failure<LoginResponse>(UserErrors.NotFoundByEmail);

        if (!passwordHasher.Verify(command.Password, user.PasswordHash))
            return Result.Failure<LoginResponse>(UserErrors.Unauthorized);

        string token = tokenProvider.Create(user);

        return Result.Success(new LoginResponse(user.Id, token));
    }
}

internal sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}
