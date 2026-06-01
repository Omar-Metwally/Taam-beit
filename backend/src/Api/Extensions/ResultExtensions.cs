using Microsoft.AspNetCore.Mvc;
using SharedKernel;

namespace Api.Extensions;

/// <summary>
/// Converts a Result or Result&lt;T&gt; into the appropriate IActionResult.
/// Keeps controller actions clean and error mapping in one place.
/// </summary>
public static class ResultExtensions
{
    public static IActionResult ToActionResult(this Result result) =>
        result.IsSuccess
            ? new NoContentResult()
            : result.Error.ToActionResult();

    public static IActionResult ToActionResult<T>(this Result<T> result) =>
        result.IsSuccess
            ? new OkObjectResult(result.Value)
            : result.Error.ToActionResult();

    public static IActionResult ToCreatedResult<T>(
        this Result<T> result,
        string routeName,
        object routeValues) =>
        result.IsSuccess
            ? new CreatedAtRouteResult(routeName, routeValues, result.Value)
            : result.Error.ToActionResult();

    private static IActionResult ToActionResult(this Error error) =>
        error.Type switch
        {
            ErrorType.NotFound  => new NotFoundObjectResult(ToProblem(error)),
            ErrorType.Conflict  => new ConflictObjectResult(ToProblem(error)),
            ErrorType.Problem   => new UnprocessableEntityObjectResult(ToProblem(error)),
            ErrorType.Failure   => new BadRequestObjectResult(ToProblem(error)),
            _                   => new BadRequestObjectResult(ToProblem(error))
        };

    private static ProblemDetails ToProblem(Error error) => new()
    {
        Title = error.Code,
        Detail = error.Description,
        Status = error.Type switch
        {
            ErrorType.NotFound => 404,
            ErrorType.Conflict => 409,
            ErrorType.Problem  => 422,
            _                  => 400
        }
    };
}
