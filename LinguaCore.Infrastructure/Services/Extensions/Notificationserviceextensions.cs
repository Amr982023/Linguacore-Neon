using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace LinguaCore.Infrastructure.Extensions;

/// <summary>
/// Extension method to register notification-related services in the DI container.
///
/// Usage in Program.cs / Startup.cs:
///   builder.Services.AddNotificationServices();
///
/// REMOVED from registration
/// ─────────────────────────
///   • SmtpService  (deleted — email is no longer used)
///   • WhatsAppDesktopService / FlaUI-based service (replaced)
///
/// REGISTERED
/// ──────────
///   • WhatsAppWin32Service  as  IWhatsAppService   (Singleton — one Win32 lock)
///   • NotificationService   as  INotificationService (Scoped  — owns a DbContext)
/// </summary>
public static class NotificationServiceExtensions
{
    public static IServiceCollection AddNotificationServices(
        this IServiceCollection services)
    {
        
        // NotificationService is scoped because it takes AppDbContext (scoped).


        return services;
    }
}