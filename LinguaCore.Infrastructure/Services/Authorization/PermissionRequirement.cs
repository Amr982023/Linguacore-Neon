// LinguaCore.Infrastructure/Authorization/PermissionRequirement.cs
using Microsoft.AspNetCore.Authorization;
using LinguaCore.Domain.Enums;

namespace LinguaCore.Infrastructure.Authorization;

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public Permission Required { get; }
    public PermissionRequirement(Permission required) => Required = required;
}

// LinguaCore.Infrastructure/Authorization/PermissionAuthorizationHandler.cs

/// <summary>
/// Reads the "permissions" claim (bitmask integer string) from the JWT
/// and checks it against the required Permission flag.
///
/// Three ways a user can pass:
///   1. Role name is "Super Admin"
///   2. Bitmask includes Permission.All  (bit 29 = 536870912)
///   3. Bitmask includes the specific required permission bit
/// </summary>
public sealed class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        // 1. Super Admin role bypasses all permission checks
        if (context.User.IsInRole("Super Admin"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // 2. Parse the bitmask from the "permissions" JWT claim
        var permissionsClaim = context.User.FindFirst("permissions")?.Value;

        if (string.IsNullOrWhiteSpace(permissionsClaim) ||
            !long.TryParse(permissionsClaim, out var bits))
        {
            // No valid permissions claim — deny
            return Task.CompletedTask;
        }

        var mask = (LinguaCore.Domain.Enums.Permission)bits;

        // 3. "All" bit or specific bit grants access
        if (mask.HasFlag(LinguaCore.Domain.Enums.Permission.All) ||
            mask.HasFlag(requirement.Required))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}