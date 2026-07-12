using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using LinguaCore.Domain.Entities;
using LinguaCore.Infrastructure.Data;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Infrastructure.Services.SyncServiceDtos;

namespace LinguaCore.Infrastructure.Seeding;

public static class DatabaseSeeder
{
    // ── Fixed well-known GUIDs — identical across ALL branches ───────────────
    // Levels
    public static readonly Guid LevelA1 = Guid.Parse("20000001-0000-0000-0000-000000000001");
    public static readonly Guid LevelA2 = Guid.Parse("20000001-0000-0000-0000-000000000002");
    public static readonly Guid LevelB1 = Guid.Parse("20000001-0000-0000-0000-000000000003");
    public static readonly Guid LevelB2 = Guid.Parse("20000001-0000-0000-0000-000000000004");
    public static readonly Guid LevelC1 = Guid.Parse("20000001-0000-0000-0000-000000000005");
    public static readonly Guid LevelC2 = Guid.Parse("20000001-0000-0000-0000-000000000006");

    // Goals
    public static readonly Guid GoalTravelling = Guid.Parse("20000002-0000-0000-0000-000000000001");
    public static readonly Guid GoalCallCenter = Guid.Parse("20000002-0000-0000-0000-000000000002");
    public static readonly Guid GoalCertification = Guid.Parse("20000002-0000-0000-0000-000000000003");
    public static readonly Guid GoalAcademic = Guid.Parse("20000002-0000-0000-0000-000000000004");
    public static readonly Guid GoalBusiness = Guid.Parse("20000002-0000-0000-0000-000000000005");
    public static readonly Guid GoalPersonalDev = Guid.Parse("20000002-0000-0000-0000-000000000006");

    // NestedGoals (under GoalCertification)
    public static readonly Guid NestedGoalToefl = Guid.Parse("20000003-0000-0000-0000-000000000001");
    public static readonly Guid NestedGoalIelts = Guid.Parse("20000003-0000-0000-0000-000000000002");
    public static readonly Guid NestedGoalDelf = Guid.Parse("20000003-0000-0000-0000-000000000003");
    public static readonly Guid NestedGoalGoethe = Guid.Parse("20000003-0000-0000-0000-000000000004");

    // PaymentMethods
    public static readonly Guid PaymentMethodCash = Guid.Parse("20000004-0000-0000-0000-000000000001");
    public static readonly Guid PaymentMethodInstaPay = Guid.Parse("20000004-0000-0000-0000-000000000002");

    // Super Admin Role
    public static Guid SeededSuperAdminRoleId =>
        Guid.Parse("10000008-0000-0000-0000-000000000001");

    public static async Task SeedAsync(IHost app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<AppDbContext>>();
        var context = services.GetRequiredService<AppDbContext>();
        var config = services.GetRequiredService<IConfiguration>();
       

        try
        {
            await context.Database.MigrateAsync();

            // ── 1. Seed Branch from appsettings ───────────────────────────────
            var branchName = config["Seeding:BranchName"] ?? "Main Branch";
            var branchAddr = config["Seeding:BranchAddress"] ?? "";
            var branchIdSetting = config["Seeding:BranchId"];
                        if (!Guid.TryParse(branchIdSetting, out var configuredBranchId))
                            {
                throw new InvalidOperationException(
                "Seeding:BranchId is missing or invalid in appsettings.json. " +
                "Every device belonging to the same branch MUST share the same fixed GUID here — " +
                "generate one GUID per branch and copy it into every device's config for that branch.");
                            }
            
                        // Primary lookup: by the fixed, config-driven BranchId. This is what keeps
                        // multiple devices converged on the exact same Branch row instead of each
                        // device randomly minting its own Branch on first run.
            var seededBranch = await context.Branches
                            .FirstOrDefaultAsync(b => b.Id == configuredBranchId);
            var branchInserted = false;

            if (seededBranch is null)
            {
                // Legacy safety net: a branch with the same NAME but a different (older,
                               // randomly-generated) Id may already exist locally from before BranchId
                                // was pinned in config. Flag this loudly rather than silently adopting it —
                                // reusing it here would NOT reconcile this device with others that are
                                // already using configuredBranchId, and blindly changing an existing row's
                                // PK is unsafe given how many FKs reference Branch.Id.
                     var legacyByName = await context.Branches
                                    .FirstOrDefaultAsync(b => b.Name == branchName);
                
                    if (legacyByName is not null)
                               {
              logger.LogWarning(
              "Branch '{Name}' already exists locally with Id={ExistingId}, which does " +
              "NOT match the configured Seeding:BranchId={ConfiguredId}. This device will " +
              "keep using its existing local Branch Id and will NOT converge with other " +
              "devices on the same branch until this is reconciled manually.",
              branchName, legacyByName.Id, configuredBranchId);
              seededBranch = legacyByName;
                             }
                         else
                              {
              seededBranch = new Branch
                                 {
                             Id = configuredBranchId,
                             Name = branchName,
                             Address = branchAddr,
                             IsActive = true,
                             CreatedAt = DateTime.UtcNow,
                             ModifiedAt = DateTime.UtcNow,
                                                 };
                 await context.Branches.AddAsync(seededBranch);
                 branchInserted = true;
                 logger.LogInformation(
                 "Seeded: Branch '{Name}' (Id={Id})", branchName, configuredBranchId);
              }

            }
            else if (!seededBranch.IsActive)
            {
                seededBranch.IsActive = true;
                seededBranch.ModifiedAt = DateTime.UtcNow;
                logger.LogInformation(
                    "Fixed: Branch '{Name}' was inactive — set to active", branchName);
            }

            await context.SaveChangesAsync();
            var branchId = seededBranch.Id;

            // ── 1b. Establish runtime identity — exactly once, right after the
            //         local Branch is resolved/created. From this point on, every
            //         synchronization component reads BranchId/BranchName from
            //         IDeviceContext instead of querying BranchRegistry. No-op if
            //         the identity file already has this branch recorded. ────────
            
            // ── 2. Seed Super Admin role (branch-scoped, fixed GUID) ──────────
            var roleInserted = false;

            if (!await context.Roles.AnyAsync(r => r.Id == SeededSuperAdminRoleId))
            {
                await context.Roles.AddAsync(new Role
                {
                    Id = SeededSuperAdminRoleId,
                    BranchId = branchId,
                    Name = "Super Admin",
                    IsSystem = true,
                    Permissions = "536870912",
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                });
                roleInserted = true;
                logger.LogInformation("Seeded: Super Admin role");
            }
            else
            {
                var existingRole = await context.Roles
                    .FirstOrDefaultAsync(r => r.Id == SeededSuperAdminRoleId);

                if (existingRole is not null && !long.TryParse(existingRole.Permissions, out _))
                {
                    existingRole.Permissions = "536870912";
                    existingRole.ModifiedAt = DateTime.UtcNow;
                    logger.LogInformation(
                        "Migrated: Super Admin role Permissions → '536870912'");
                }

                if (existingRole is not null && existingRole.BranchId == Guid.Empty)
                {
                    existingRole.BranchId = branchId;
                    existingRole.ModifiedAt = DateTime.UtcNow;
                    logger.LogInformation(
                        "Fixed: Super Admin role missing BranchId — assigned to '{Name}'",
                        branchName);
                }
            }

            await context.SaveChangesAsync();

            // ── 3. Seed default Levels (branch-scoped, fixed GUIDs) ───────────
            // Uses fixed GUIDs so every branch has identical Level IDs.
            // This ensures synced Students/Groups referencing these Level IDs
            // can satisfy FK checks on any receiving branch.
            var existingLevelIds = await context.Levels
                .Where(l => l.BranchId == branchId)
                .Select(l => l.Id)
                .ToListAsync();

            var allLevelDefs = new[]
            {
                (LevelA1, "A1", "Beginner",           1),
                (LevelA2, "A2", "Elementary",          2),
                (LevelB1, "B1", "Intermediate",        3),
                (LevelB2, "B2", "Upper-Intermediate",  4),
                (LevelC1, "C1", "Advanced",            5),
                (LevelC2, "C2", "Proficiency",         6),
            };

            var levelsToAdd = allLevelDefs
                .Where(d => !existingLevelIds.Contains(d.Item1))
                .Select(d => new Level
                {
                    Id = d.Item1,
                    BranchId = branchId,
                    Code = d.Item2,
                    Description = d.Item3,
                    DisplayOrder = d.Item4,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                })
                .ToList();

            if (levelsToAdd.Any())
            {
                await context.Levels.AddRangeAsync(levelsToAdd);
                logger.LogInformation(
                    "Seeded: {Count} Levels for branch '{Name}'",
                    levelsToAdd.Count, branchName);
            }

            // ── 4. Seed default PaymentMethods (branch-scoped, fixed GUIDs) ───
            var existingPmIds = await context.PaymentMethods
                .Where(p => p.BranchId == branchId)
                .Select(p => p.Id)
                .ToListAsync();

            var allPmDefs = new[]
            {
                (PaymentMethodCash,     "Cash"),
                (PaymentMethodInstaPay, "InstaPay"),
            };

            var pmsToAdd = allPmDefs
                .Where(d => !existingPmIds.Contains(d.Item1))
                .Select(d => new PaymentMethod
                {
                    Id = d.Item1,
                    BranchId = branchId,
                    Name = d.Item2,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                })
                .ToList();

            if (pmsToAdd.Any())
            {
                await context.PaymentMethods.AddRangeAsync(pmsToAdd);
                logger.LogInformation(
                    "Seeded: {Count} PaymentMethods for branch '{Name}'",
                    pmsToAdd.Count, branchName);
            }

            // ── 5. Seed default Goals + NestedGoals (branch-scoped, fixed GUIDs)
            var existingGoalIds = await context.Goals
                .Where(g => g.BranchId == branchId)
                .Select(g => g.Id)
                .ToListAsync();

            var allGoalDefs = new[]
            {
                (GoalTravelling,    "Travelling"),
                (GoalCallCenter,    "Working - Call Center"),
                (GoalCertification, "Global Certification"),
                (GoalAcademic,      "Academic Purposes"),
                (GoalBusiness,      "Business"),
                (GoalPersonalDev,   "Personal Development"),
            };

            var goalsToAdd = allGoalDefs
                .Where(d => !existingGoalIds.Contains(d.Item1))
                .Select(d => new Goal
                {
                    Id = d.Item1,
                    BranchId = branchId,
                    Name = d.Item2,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                })
                .ToList();

            if (goalsToAdd.Any())
            {
                await context.Goals.AddRangeAsync(goalsToAdd);
                logger.LogInformation(
                    "Seeded: {Count} Goals for branch '{Name}'",
                    goalsToAdd.Count, branchName);
            }

            // NestedGoals under GoalCertification
            var existingNestedIds = await context.NestedGoals
                .Where(n => n.GoalId == GoalCertification)
                .Select(n => n.Id)
                .ToListAsync();

            var allNestedDefs = new[]
            {
                (NestedGoalToefl,   "TOEFL"),
                (NestedGoalIelts,   "IELTS"),
                (NestedGoalDelf,    "DELF"),
                (NestedGoalGoethe,  "Goethe"),
            };

            var nestedToAdd = allNestedDefs
                .Where(d => !existingNestedIds.Contains(d.Item1))
                .Select(d => new NestedGoal
                {
                    Id = d.Item1,
                    GoalId = GoalCertification,
                    Name = d.Item2,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                })
                .ToList();

            if (nestedToAdd.Any())
            {
                await context.NestedGoals.AddRangeAsync(nestedToAdd);
                logger.LogInformation(
                    "Seeded: {Count} NestedGoals for branch '{Name}'",
                    nestedToAdd.Count, branchName);
            }

            await context.SaveChangesAsync();

            // ── 6. Seed BranchRegistry entry ──────────────────────────────────
            // BranchRegistry is now pure branch metadata (remote-branch discovery,
            // monitoring) — matched by BranchId, not an "IsLocal" runtime flag.
            if (!await context.BranchRegistries.AnyAsync(r => r.BranchId == branchId))
            {
                await context.BranchRegistries.AddAsync(new BranchRegistry
                {
                    BranchId = branchId,
                    BranchName = seededBranch.Name,     
                    LastSeenAt = DateTime.UtcNow,
                    IsOutOfSync = false,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                });
                logger.LogInformation(
                    "Seeded: BranchRegistry metadata row for '{Name}' (id={Id})",
                    seededBranch.Name, branchId);

                await context.SaveChangesAsync();
            }

            
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred during database seeding.");
            throw;
        }
    }
}