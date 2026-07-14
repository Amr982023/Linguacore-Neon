using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Application.Services;
using LinguaCore.Domain.Interfaces;
using LinguaCore.Domain.Interfaces.License;
using LinguaCore.Domain.Options;
using LinguaCore.Infrastructure.Authorization;
using LinguaCore.Infrastructure.Data;
using LinguaCore.Infrastructure.Helpers;
using LinguaCore.Infrastructure.Services;
using LinguaCore.Infrastructure.Services.License;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LinguaCore.Infrastructure;

public static class InfrastructureServiceRegistration
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        

        // ?? Database ??????????????????????????????????????????????????????????
        services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        configuration.GetConnectionString("DefaultConnection"),

        sqlOptions => sqlOptions.MigrationsAssembly("LinguaCore.Infrastructure")
    ).AddInterceptors(new UtcDateTimeInterceptor())
    .ConfigureWarnings(warnings =>
        warnings.Ignore(
            Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)
    ));

        // ?? Unit of Work ??????????????????????????????????????????????????????
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // ?? Other services ????????????????????????????????????????????????????
        services.AddScoped<ISmtpService, SmtpService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<ICenterDeductionService, CenterDeductionService>();

        // ?? WhatsApp queue (writes JSON files, picked up by desktop helper) ???
        services.AddSingleton<IWhatsAppService, WhatsAppQueueService>();

        services.AddSingleton<ILicenseService, LicenseService>();
        
        services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

        return services;
    }
}