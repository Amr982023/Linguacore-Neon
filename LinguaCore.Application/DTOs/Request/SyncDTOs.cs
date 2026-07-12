using System;

namespace LinguaCore.Infrastructure.Services.SyncDtos
{
    public record SyncStatusDto(
        bool IsOutOfSync,
        string Status,
        DateTime LastSeenAt,
        string? LastEventId,
        int PendingOutboxCount,
        string? OutOfSyncReason,
        DateTime? LastProcessedEventTime,
        int TotalDevices,        // ← NEW
        int OnlineDevices,       // ← NEW
        int OfflineDevices,      // ← NEW
        int OutOfSyncDevices     // ← NEW
    );
}