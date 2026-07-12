using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class StoreItem : BaseEntity
    {
        public Guid BranchId { get; set; }
        public Guid CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int LowStockThreshold { get; set; } = 5;
        public bool IsActive { get; set; } = true;
        public Guid CreatedBy { get; set; }

        public uint RowVersion { get; set; }   // concurrency token — protects against oversell on simultaneous sales

        public Branch Branch { get; set; } = null!;
        public ItemCategory Category { get; set; } = null!;
        public User CreatedByUser { get; set; } = null!;

        public bool IsLowStock => Quantity <= LowStockThreshold;
    }
}
