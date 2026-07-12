using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class Sale : BaseEntity
    {
        public Guid BranchId { get; set; }
        public DateTime SaleDate { get; set; } = DateTime.UtcNow;
        public decimal TotalAmount { get; set; }
        public Guid CreatedBy { get; set; }

        public Branch Branch { get; set; } = null!;
        public User CreatedByUser { get; set; } = null!;
        public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
    }
}
