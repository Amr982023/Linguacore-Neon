using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class GroupPeriod : BaseEntity
    {
        public Guid GroupId { get; set; }
        public Guid PeriodLabelId { get; set; }

        /// <summary>
        /// How many sessions are expected in this period.
        /// Defaults to Group.SessionsPerMonth at creation time.
        /// Can be overridden for the final short period of a level-based group.
        /// </summary>
        public int ExpectedSessionsCount { get; set; }

        // Navigation
        public Group Group { get; set; } = null!;
        public PeriodLabel PeriodLabel { get; set; } = null!;
    }
}
