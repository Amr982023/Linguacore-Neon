using System;

namespace LinguaCore.Infrastructure
{
    /// <summary>
    /// Shared TTL constants for the event-driven Firebase sync system.
    ///
    /// These were previously conflated into a single 3-day TTL used both for
    /// Out-Of-Sync detection AND Firebase event/outbox expiration. That's now
    /// split into two independent constants:
    ///
    ///   - OutOfSyncTTL: how long a device can go unseen before it's flagged
    ///     out-of-sync (heartbeat / device offline detection). UNCHANGED at 3 days.
    ///
    ///   - EventRetentionTTL: how long an OutboxEvent lives in SQL/Firebase before
    ///     cleanup removes it. Extended to 15 days so slower-catching-up devices
    ///     still have events to poll.
    ///
    /// Both OutboxInterceptor and EventDrivenSyncService reference these same
    /// constants so the two purposes can never accidentally get re-merged.
    /// </summary>
    public static class SyncTtlConstants
    {
        /// <summary>
        /// Used ONLY for: IsOutOfSyncAsync(), heartbeat checks, device offline detection.
        /// Do NOT use this for event expiration.
        /// </summary>
        public static readonly TimeSpan OutOfSyncTTL = TimeSpan.FromDays(15);

        /// <summary>
        /// Used ONLY for: OutboxEvent.ExpiresAt, Firebase event cleanup.
        /// Do NOT use this for Out-Of-Sync detection.
        /// </summary>
        public static readonly TimeSpan EventRetentionTTL = TimeSpan.FromDays(15);
    }
}