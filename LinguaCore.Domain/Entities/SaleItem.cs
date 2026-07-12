using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class SaleItem : BaseEntity
    {
        public Guid SaleId { get; set; }
        public Guid StoreItemId { get; set; }
        public string ItemNameSnapshot { get; set; } = string.Empty;
        public decimal UnitPriceSnapshot { get; set; }
        public int Quantity { get; set; }
        public decimal LineTotal { get; set; }

        public Sale Sale { get; set; } = null!;
        public StoreItem StoreItem { get; set; } = null!;
    }
}
