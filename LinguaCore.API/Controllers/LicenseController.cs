using LinguaCore.Domain.Interfaces.License;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LinguaCore.API.Controllers
{
    [ApiController]
    [Route("api/license")]
    public class LicenseController : ControllerBase
    {
        private readonly ILicenseService _license;
        public LicenseController(ILicenseService license) => _license = license;

        [AllowAnonymous]
        [HttpGet("status")]
        public IActionResult Status() => Ok(new
        {
            activated = _license.IsActivated(),
        });

        [AllowAnonymous]
        [HttpPost("activate")]
        public IActionResult Activate([FromBody] ActivateRequest req)
        {
            var ok = _license.ValidateAndActivate(req.Code);
            return ok
                ? Ok(new { success = true })
                : BadRequest(new { message = "Invalid serial number." });
        }
    }

    public record ActivateRequest(string Code);
}
