namespace LinguaCore.Application.DTOs.Response;

public class ApiResponse<T>
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public T? Data { get; init; }
    public IEnumerable<string>? Errors { get; init; }

    public static ApiResponse<T> Ok(T data, string? message = null)
        => new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message, IEnumerable<string>? errors = null)
        => new() { Success = false, Message = message, Errors = errors };
}

//public class PagedResponse<T>
//{
//    public IEnumerable<T> Items { get; init; } = Enumerable.Empty<T>();
//    public int TotalCount { get; init; }
//    public int Page { get; init; }
//    public int PageSize { get; init; }
//    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
//}


