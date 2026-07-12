using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace LinguaCore.Domain.Entities
{
    public class BranchRegistry : BaseEntity
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        /// <summary>
        /// Updated on every successful sync heartbeat cycle.
        /// If Now − LastSeenAt exceeds TTL (3 days), the branch is considered out of sync.
        /// </summary>
        public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
        /// <summary>Set to true when OOS is detected; cleared by POST /api/sync/reset-out-of-sync.</summary>
        public bool IsOutOfSync { get; set; } = false;
        /// <summary>EventId of the last remote event applied by this branch (status/monitoring only).</summary>
        public string? LastEventId { get; set; }
        /// <summary>
        /// STEP 4 — Polling pointer.
        /// The CreatedAt timestamp of the most recent Firebase event that was successfully
        /// applied (or permanently failed) by this branch. On each poll cycle, only events
        /// with CreatedAt strictly greater than this value are evaluated, avoiding a full
        /// O(N) re-scan of all historical events.
        ///
        /// Null on first run; set to DateTime.MinValue equivalent so all events are processed.
        /// Never decremented — only advances forward.
        /// </summary>
        public DateTime? LastProcessedEventTime { get; set; }
    }
}