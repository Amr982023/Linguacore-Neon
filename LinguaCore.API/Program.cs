using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using LinguaCore.Application;
using LinguaCore.Infrastructure;
using LinguaCore.Infrastructure.Seeding;
using LinguaCore.Domain.Options;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using LinguaCore.Infrastructure.Authorization;
using LinguaCore.Domain.Enums;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers & Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "LinguaCore API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {token}",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddHttpContextAccessor();


// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

// ── Permission Authorization ──────────────────────────────────────────────────
// Register the handler that reads the bitmask JWT claim
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Register all Permission:* policies.
//
// THE FIX: every policy MUST call .RequireAuthenticatedUser() first.
// Without it the PermissionRequirement runs on anonymous requests too —
// the handler does nothing (no Succeed/Fail), ASP.NET treats the
// requirement as unmet, and returns 401 even on [AllowAnonymous] endpoints.
//
// NOTE: DefaultPolicy and FallbackPolicy are intentionally left at their
// framework defaults so that [AllowAnonymous] endpoints are never blocked.
builder.Services.AddAuthorization(options =>
{
    // Helper so every policy gets RequireAuthenticatedUser automatically
    static AuthorizationPolicy Perm(Permission p) =>
        new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()          // ← THE FIX
            .AddRequirements(new PermissionRequirement(p))
            .Build();

    options.AddPolicy(PermissionPolicies.StudentsRead, Perm(Permission.StudentsRead));
    options.AddPolicy(PermissionPolicies.StudentsWrite, Perm(Permission.StudentsWrite));

    options.AddPolicy(PermissionPolicies.InstructorsRead, Perm(Permission.InstructorsRead));
    options.AddPolicy(PermissionPolicies.InstructorsWrite, Perm(Permission.InstructorsWrite));

    options.AddPolicy(PermissionPolicies.GroupsRead, Perm(Permission.GroupsRead));
    options.AddPolicy(PermissionPolicies.GroupsWrite, Perm(Permission.GroupsWrite));

    options.AddPolicy(PermissionPolicies.SessionsRead, Perm(Permission.SessionsRead));
    options.AddPolicy(PermissionPolicies.SessionsWrite, Perm(Permission.SessionsWrite));

    options.AddPolicy(PermissionPolicies.AttendanceRead, Perm(Permission.AttendanceRead));
    options.AddPolicy(PermissionPolicies.AttendanceWrite, Perm(Permission.AttendanceWrite));
    options.AddPolicy(PermissionPolicies.AttendanceRevert, Perm(Permission.AttendanceRevert));

    options.AddPolicy(PermissionPolicies.ExamsRead, Perm(Permission.ExamsRead));
    options.AddPolicy(PermissionPolicies.ExamsWrite, Perm(Permission.ExamsWrite));

    options.AddPolicy(PermissionPolicies.PaymentsRead, Perm(Permission.PaymentsRead));
    options.AddPolicy(PermissionPolicies.PaymentsWrite, Perm(Permission.PaymentsWrite));

    options.AddPolicy(PermissionPolicies.ClosingsRead, Perm(Permission.ClosingsRead));
    options.AddPolicy(PermissionPolicies.ClosingsWrite, Perm(Permission.ClosingsWrite));

    options.AddPolicy(PermissionPolicies.DashboardRead, Perm(Permission.DashboardRead));

    options.AddPolicy(PermissionPolicies.SettingsRead, Perm(Permission.SettingsRead));
    options.AddPolicy(PermissionPolicies.SettingsWrite, Perm(Permission.SettingsWrite));

    options.AddPolicy(PermissionPolicies.RolesManage, Perm(Permission.RolesManage));

    options.AddPolicy(PermissionPolicies.CertificatesRead, Perm(Permission.CertificatesRead));

    options.AddPolicy(PermissionPolicies.NotificationsRead, Perm(Permission.NotificationsRead));
    options.AddPolicy(PermissionPolicies.NotificationsWrite, Perm(Permission.NotificationsWrite));

    options.AddPolicy(PermissionPolicies.WaitingListRead, Perm(Permission.WaitingListRead));
    options.AddPolicy(PermissionPolicies.WaitingListWrite, Perm(Permission.WaitingListWrite));

    options.AddPolicy(PermissionPolicies.UsersManage, Perm(Permission.UsersManage));
    options.AddPolicy(PermissionPolicies.SyncManage, Perm(Permission.SyncManage));

    // LookupsRead / LookupsWrite are aliases for Settings permissions
    options.AddPolicy(PermissionPolicies.LookupsRead, Perm(Permission.SettingsRead));
    options.AddPolicy(PermissionPolicies.LookupsWrite, Perm(Permission.SettingsWrite));

    options.AddPolicy(PermissionPolicies.BranchOverviewRead, Perm(Permission.BranchOverviewRead));
    options.AddPolicy(PermissionPolicies.ResourceSchedulerRead, Perm(Permission.ResourceSchedulerRead));

    options.AddPolicy(PermissionPolicies.StoreRead, Perm(Permission.StoreRead));
    options.AddPolicy(PermissionPolicies.StoreWrite, Perm(Permission.StoreWrite));
    options.AddPolicy(PermissionPolicies.SalesRead, Perm(Permission.SalesRead));
    options.AddPolicy(PermissionPolicies.SalesWrite, Perm(Permission.SalesWrite));
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ── Clean Architecture layers ─────────────────────────────────────────────────
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

builder.Services.Configure<SmtpSettings>(
    builder.Configuration.GetSection("Smtp"));

// Serve React static files from wwwroot
builder.Services.AddSpaStaticFiles(cfg => cfg.RootPath = "wwwroot");

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Database seeding (idempotent) ─────────────────────────────────────────────
await DatabaseSeeder.SeedAsync(app);

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<LinguaCore.API.Middleware.ExceptionMiddleware>();
app.UseStaticFiles();
app.UseSpaStaticFiles();
app.UseMiddleware<LinguaCore.API.Middleware.LicenseMiddleware>(); // ← add this
app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// ORDER IS REQUIRED: Authentication before Authorization
app.UseAuthentication();
app.UseAuthorization();

// ✅ No .RequireAuthorization() here — that would block [AllowAnonymous] endpoints
app.MapControllers();


// ── Serve React SPA ───────────────────────────────────────────────────────────
// ── Serve React SPA ───────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapWhen(
        ctx => !ctx.Request.Path.StartsWithSegments("/api"),
        spaApp => spaApp.UseSpa(spa =>
        {
            spa.Options.SourcePath = "../frontend";
            spa.UseProxyToSpaDevelopmentServer("http://localhost:5173");
        }));
}
else
{
    app.MapWhen(
        ctx => !ctx.Request.Path.StartsWithSegments("/api"),
        spaApp => spaApp.UseSpa(spa =>
        {
            spa.Options.SourcePath = "wwwroot";
        }));
}

// ── Auto-open browser on startup ──────────────────────────────────────────────
app.Lifetime.ApplicationStarted.Register(() =>
{
    try
    {
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
        {
            FileName = "http://localhost:5000",
            UseShellExecute = true,
        });
    }
    catch { /* ignore if browser can't open */ }
});

app.Run();