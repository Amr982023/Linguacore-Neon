using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Infrastructure.Helpers
{
    public class UtcDateTimeInterceptor : SaveChangesInterceptor
    {
        public override InterceptionResult<int> SavingChanges(
            DbContextEventData eventData, InterceptionResult<int> result)
        {
            NormalizeDates(eventData.Context);
            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            NormalizeDates(eventData.Context);
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        private static void NormalizeDates(DbContext? context)
        {
            if (context is null) return;

            foreach (var entry in context.ChangeTracker.Entries())
            {
                if (entry.State != EntityState.Added && entry.State != EntityState.Modified)
                    continue;

                foreach (var property in entry.Properties)
                {
                    if (property.Metadata.ClrType == typeof(DateTime) && property.CurrentValue is DateTime dt)
                    {
                        property.CurrentValue = ToUtc(dt);
                    }
                    else if (property.Metadata.ClrType == typeof(DateTime?) && property.CurrentValue is DateTime dtn)
                    {
                        property.CurrentValue = ToUtc(dtn);
                    }
                }
            }
        }

        private static DateTime ToUtc(DateTime dt) => dt.Kind switch
        {
            DateTimeKind.Utc => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc) // Unspecified → assume it already represents UTC
        };
    }
}
