using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request
{
    public class FirebaseEventDto
    {
        public string EventId { get; set; } = string.Empty;
        public string Entity { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Operation { get; set; } = "UPSERT";
        public string Data { get; set; } = "{}";          // JSON string
        public string ModifiedAt { get; set; } = string.Empty;  // ISO 8601 UTC
        public string CreatedAt { get; set; } = string.Empty;
        public string ExpiresAt { get; set; } = string.Empty;
        public string BranchId { get; set; } = string.Empty;  // source branch GUID
        public string BranchName { get; set; } = string.Empty;
        public string SourceDeviceId { get; set; } = string.Empty;

    }
}
