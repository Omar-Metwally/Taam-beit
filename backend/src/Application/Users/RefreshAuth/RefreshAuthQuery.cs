using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Users.Login;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;
using static Application.Abstractions.Behaviors.LoggingDecorator;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace Application.Users.RefreshAuth;

public sealed record RefreshAuthQuery : IQuery<LoginResponse>;

internal sealed class RefreshAuthQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    ITokenProvider tokenProvider) : IQueryHandler<RefreshAuthQuery, LoginResponse>
{
    public async Task<Result<LoginResponse>> Handle(
        RefreshAuthQuery _,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure<LoginResponse>(UserErrors.NotFoundByEmail);

        string token = tokenProvider.Create(user);

        var roles = new List<string> { "Customer" };
        if (user.ChefProfile is not null) roles.Add("Chef");
        if (user.DeliveryManProfile is not null) roles.Add("DeliveryMan");

        return Result.Success(new LoginResponse(user.Id, token, roles));
    }
}