using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using LinguaCore.Domain.Interfaces;
using LinguaCore.Infrastructure.Data;
using LinguaCore.Infrastructure.Services;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Options;
using LinguaCore.Infrastructure.Authorization;
using Microsoft.AspNetCore.Authorization;
using LinguaCore.Domain.Interfaces.License;
using LinguaCore.Infrastructure.Services.License;
using LinguaCore.Application.Services;

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
    )
    .ConfigureWarnings(warnings =>
        warnings.Ignore(
            Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)
    ));

        // ?? Unit of Work ??????????????????????????????????????????????????????
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // ?? Firebase sync (HttpClient injected via named factory) ?????????????
        // AddHttpClient<IFirebaseSyncService, FirebaseSyncService> handles BOTH
        // the IFirebaseSyncService ? FirebaseSyncService mapping AND HttpClient injection.
        // Do NOT also call AddScoped<IFirebaseSyncService> — that would create a
        // second registration without an HttpClient.

        //services.AddHttpClient<IFirebaseSyncService, FirebaseSyncService>();

        


        // ?? Other services ????????????????????????????????????????????????????
        services.AddScoped<ISmtpService, SmtpService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<ICenterDeductionService, CenterDeductionService>();

        // ?? WhatsApp queue (writes JSON files, picked up by desktop helper) ???
        services.AddSingleton<IWhatsAppService, WhatsAppQueueService>();

        // ?? Background worker (runs every 5 min, registered once) ????????????
        // services.AddHostedService<FirebaseSyncWorker>();

        services.AddSingleton<ILicenseService, LicenseService>();
        //backup 
        services.Configure<BackupSettings>(
            configuration.GetSection("BackupSettings"));

        
        services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();


        return services;
    }
}