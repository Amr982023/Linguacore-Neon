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
            // This part stays branch-specific by design: each device has its OWN
            // BranchId in appsettings.json, so each device inserts its own Branch
            // row. Multiple branches are expected to coexist in the same table.
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

            // ── 2. Seed Super Admin role (fixed GUID, shared by ALL branches) ─
            // Lookup is already global (by Id, not filtered by BranchId), so this
            // was already safe against the multi-branch race — left as-is.
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

            // ── 3. Seed default Levels (fixed GUIDs, shared by ALL branches) ──
            // NOTE: Id is the primary key and is IDENTICAL across every branch by
            // design (so synced Students/Groups referencing a Level Id satisfy FK
            // checks on any receiving branch). That means "does it exist" MUST be
            // checked globally — NOT filtered by BranchId — otherwise a second
            // branch that hasn't seeded yet will try to INSERT a row whose Id
            // already exists (owned by the first branch that booted), which
            // throws PostgresException 23505 (duplicate key) on PK_Levels.
            //
            // We use "INSERT ... ON CONFLICT (Id) DO NOTHING" instead of a
            // read-then-write check. This is atomic at the database level, so
            // it's also safe if two branches start up at the exact same moment
            // (a plain "if not exists, insert" check-then-act still has a race
            // window between the SELECT and the INSERT).
            var allLevelDefs = new (Guid Id, string Code, string Description, int Order)[]
            {
                (LevelA1, "A1", "Beginner",           1),
                (LevelA2, "A2", "Elementary",          2),
                (LevelB1, "B1", "Intermediate",        3),
                (LevelB2, "B2", "Upper-Intermediate",  4),
                (LevelC1, "C1", "Advanced",            5),
                (LevelC2, "C2", "Proficiency",         6),
            };

            foreach (var d in allLevelDefs)
            {
                await context.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""Levels"" (""Id"", ""BranchId"", ""Code"", ""Description"", ""DisplayOrder"", ""CreatedAt"", ""ModifiedAt"")
                    VALUES ({d.Id}, {branchId}, {d.Code}, {d.Description}, {d.Order}, {DateTime.UtcNow}, {DateTime.UtcNow})
                    ON CONFLICT (""Id"") DO NOTHING;");
            }
            logger.LogInformation("Ensured: Levels present (global, shared across branches)");

            // ── 4. Seed default PaymentMethods (fixed GUIDs, same pattern as above) ──
            var allPmDefs = new (Guid Id, string Name)[]
            {
                (PaymentMethodCash,     "Cash"),
                (PaymentMethodInstaPay, "InstaPay"),
            };

            foreach (var d in allPmDefs)
            {
                await context.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""PaymentMethods"" (""Id"", ""BranchId"", ""Name"", ""IsActive"", ""CreatedAt"", ""ModifiedAt"")
                    VALUES ({d.Id}, {branchId}, {d.Name}, {true}, {DateTime.UtcNow}, {DateTime.UtcNow})
                    ON CONFLICT (""Id"") DO NOTHING;");
            }
            logger.LogInformation("Ensured: PaymentMethods present (global, shared across branches)");

            // ── 5. Seed default Goals + NestedGoals (fixed GUIDs, same pattern) ──
            var allGoalDefs = new (Guid Id, string Name)[]
            {
                (GoalTravelling,    "Travelling"),
                (GoalCallCenter,    "Working - Call Center"),
                (GoalCertification, "Global Certification"),
                (GoalAcademic,      "Academic Purposes"),
                (GoalBusiness,      "Business"),
                (GoalPersonalDev,   "Personal Development"),
            };

            foreach (var d in allGoalDefs)
            {
                await context.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""Goals"" (""Id"", ""BranchId"", ""Name"", ""CreatedAt"", ""ModifiedAt"")
                    VALUES ({d.Id}, {branchId}, {d.Name}, {DateTime.UtcNow}, {DateTime.UtcNow})
                    ON CONFLICT (""Id"") DO NOTHING;");
            }
            logger.LogInformation("Ensured: Goals present (global, shared across branches)");

            var allNestedDefs = new (Guid Id, string Name)[]
            {
                (NestedGoalToefl,   "TOEFL"),
                (NestedGoalIelts,   "IELTS"),
                (NestedGoalDelf,    "DELF"),
                (NestedGoalGoethe,  "Goethe"),
            };

            foreach (var d in allNestedDefs)
            {
                await context.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""NestedGoals"" (""Id"", ""GoalId"", ""Name"", ""CreatedAt"", ""ModifiedAt"")
                    VALUES ({d.Id}, {GoalCertification}, {d.Name}, {DateTime.UtcNow}, {DateTime.UtcNow})
                    ON CONFLICT (""Id"") DO NOTHING;");
            }
            logger.LogInformation("Ensured: NestedGoals present (global, shared across branches)");

            // ── 6. Seed BranchRegistry entry ──────────────────────────────────
            // Matched by BranchId (which IS branch-specific), so this is already
            // safe — each branch inserts its own registry row.
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
        catch (DbUpdateException dbEx) when (
            dbEx.InnerException is Npgsql.PostgresException pg && pg.SqlState == "23505")
        {
            // Belt-and-suspenders: covers any other seed step (added later, or a
            // path we didn't convert to ON CONFLICT) that hits a duplicate-key
            // race between two branches booting against the same Neon DB.
            // We log and continue instead of crashing app startup, since the
            // conflicting row already existing means the data itself is fine.
            logger.LogWarning(dbEx,
                "Seed data already present (likely a race with another branch seeding " +
                "the same shared row) — continuing startup without crashing.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred during database seeding.");
            throw;
        }
    }
}