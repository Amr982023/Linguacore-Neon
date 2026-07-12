using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using LinguaCore.Domain.Options;

namespace LinguaCore.Application.DTOs
{
    public class NotificationSettingDto
    {
        public string Key { get; set; } = string.Empty;
        public bool Enabled { get; set; }
    }

    public class NotificationLogDto
    {
        public Guid Id { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public int RecipientCount { get; set; }
        public DateTime SentAt { get; set; }
    }

    public class CustomNotificationDto
    {
        public Guid BranchId { get; set; }

        public string Message { get; set; } = string.Empty;

        /// <summary>all | group | language | specific</summary>
        public string SendTo { get; set; } = "all";

        public Guid? GroupId { get; set; }

        public Guid? LanguageId { get; set; }

        /// <summary>
        /// List of student GUIDs.
        /// The frontend sends these as strings from a comma-split input;
        /// the custom converter parses them safely so bad values are skipped
        /// rather than causing a 400 / silent empty list.
        /// </summary>
        [JsonConverter(typeof(GuidListConverter))]
        public List<Guid> StudentIds { get; set; } = new();
    }
}
