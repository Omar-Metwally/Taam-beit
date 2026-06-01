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

public sealed record LoginResponse(Guid UserId, string Token, IEnumerable<string> Roles);

internal sealed class LoginCommandHandler(
    IApplicationDbContext dbContext,
    IPasswordHasher passwordHasher,
    ITokenProvider tokenProvider) : ICommandHandler<LoginCommand, LoginResponse>
{
    public async Task<Result<LoginResponse>> Handle(
        LoginCommand command,
        CancellationToken cancellationToken)
    {
        string normalizedEmail = command.Email.Trim().ToLower();

        User? user = await dbContext.Users
            .FirstOrDefaultAsync(
                u => u.Email == normalizedEmail,
                cancellationToken);

        if (user is null)
            return Result.Failure<LoginResponse>(UserErrors.NotFoundByEmail);

        if (!passwordHasher.Verify(command.Password, user.PasswordHash))
            return Result.Failure<LoginResponse>(UserErrors.Unauthorized);

        string token = tokenProvider.Create(user);

        var roles = new List<string> { "Customer" };

        if (user.IsApprovedChef) roles.Add("Chef");
        if (user.IsApprovedDeliveryMan) roles.Add("DeliveryMan");

        return Result.Success(new LoginResponse(user.Id, token, roles));
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
