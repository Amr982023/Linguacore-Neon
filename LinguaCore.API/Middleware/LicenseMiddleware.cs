using LinguaCore.Domain.Interfaces.License;

namespace LinguaCore.API.Middleware
{
    public class LicenseMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILicenseService _license;

        public LicenseMiddleware(RequestDelegate next, ILicenseService license)
            => (_next, _license) = (next, license);

        public async Task InvokeAsync(HttpContext ctx)
        {
            var path = ctx.Request.Path.Value ?? "";

            // Only enforce on API routes — static files and SPA routes pass freely
            var isApiCall = path.StartsWith("/api", StringComparison.OrdinalIgnoreCase);
            var isLicenseApi = path.StartsWith("/api/license", StringComparison.OrdinalIgnoreCase);

            if (isApiCall && !isLicenseApi && !_license.IsActivated())
            {
                ctx.Response.StatusCode = 451;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsJsonAsync(
                    new { message = "Application not activated." });
                return;
            }

            await _next(ctx);
        }
    }
}