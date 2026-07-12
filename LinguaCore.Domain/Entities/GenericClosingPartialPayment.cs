using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class GenericClosingPartialPayment : BaseEntity
    {
        public Guid GenericClosingId { get; set; }
        public Guid PaymentId { get; set; }
        public Guid GroupId { get; set; }
        public Guid PeriodLabelId { get; set; }
        public int ProcessedSessionsCount { get; set; }
        public int ExpectedSessionsCount { get; set; }

        /// <summary>Gross payment amount for context.</summary>
        public decimal AmountPaid { get; set; }

        // Navigation
        public GenericClosing GenericClosing { get; set; } = null!;
        public Payment Payment { get; set; } = null!;
        public Group Group { get; set; } = null!;
        public PeriodLabel PeriodLabel { get; set; } = null!;
    }
}
