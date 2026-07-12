using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class GenericClosingCenterDeduction : BaseEntity
    {
        public Guid GenericClosingId { get; set; }
        public Guid? CenterDeductionId { get; set; }   // ← NEW: link back to master (nullable for any legacy rows)
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime DeductionDate { get; set; }     // ← NEW: snapshot of master's date, used for reporting

        // Navigation
        public GenericClosing GenericClosing { get; set; } = null!;
        public CenterDeduction? CenterDeduction { get; set; }
    }
}
