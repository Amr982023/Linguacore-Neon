using Microsoft.Extensions.DependencyInjection;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Application.Services;
using LinguaCore.Infrastructure.Services;

namespace LinguaCore.Application;

public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IStudentService, StudentService>();
        services.AddScoped<IInstructorService, InstructorService>();
        services.AddScoped<IGroupService, GroupService>();
        services.AddScoped<IEnrollmentService, EnrollmentService>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<IExamService, ExamService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IClosingService, ClosingService>();
        services.AddScoped<IWaitingListService, WaitingListService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<ILookupService, LookupService>();
        services.AddScoped<ICertificateService, CertificateService>();
       

        // ── Store & Sales ── new
        services.AddScoped<IStoreService, StoreService>();
        services.AddScoped<ISalesService, SalesService>();

        return services;
    }
}