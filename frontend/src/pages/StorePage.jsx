import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuthStore } from "../context/authStore";
import { usePermissions } from "../hooks/usePermissions";
import { storeApi } from "../services/endpoints";
import {
  Plus,
  Pencil,
  Trash2,
  PackagePlus,
  AlertTriangle,
  X,
  LayoutGrid,
  Candy,
  Coffee,
  Cookie,
  Popcorn,
  Sandwich,
  IceCream,
  Pizza,
  Package,
  Droplet,
  Cake,
  Apple,
  Beef,
} from "lucide-react";

const ICONS = {
  chocolates: Candy,
  drinks: Coffee,
  snacks: Cookie,
  popcorn: Popcorn,
  sandwiches: Sandwich,
  icecream: IceCream,
  pizza: Pizza,
  water: Droplet,
  bakery: Cake,
  fruits: Apple,
  meat: Beef,
  default: Package,
};

const ICON_KEYS = Object.keys(ICONS).filter((k) => k !== "default");
const inputCls =
  "w-full px-3 py-2 rounded-lg text-[13px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function AllItemsTile({ active, onClick, totalCount }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 w-36 rounded-2xl overflow-hidden group transition-all duration-200
        ${active ? "ring-2 ring-blue-500 scale-[1.02]" : "ring-1 ring-gray-200 dark:ring-white/10 hover:scale-[1.02]"}`}
    >
      <div
        className="h-24 w-full flex items-center justify-center relative"
        style={{ background: "linear-gradient(135deg, #64748b, #334155)" }}
      >
        <LayoutGrid size={30} className="text-white/90" />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
        <span className="absolute top-1.5 right-1.5 bg-black/40 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
          {totalCount}
        </span>
      </div>
      <div className="bg-white dark:bg-[#161616] px-2.5 py-2">
        <p className="text-[12px] font-semibold text-gray-800 dark:text-white/80 truncate text-left">
          All Items
        </p>
      </div>
    </button>
  );
}

function CategoryTile({
  category,
  active,
  onClick,
  canWrite,
  onEdit,
  onDelete,
}) {
  const Icon = ICONS[category.iconKey] ?? ICONS.default;
  return (
    <div
      className={`relative flex-shrink-0 w-36 rounded-2xl overflow-hidden group transition-all duration-200
        ${active ? "ring-2 ring-blue-500 scale-[1.02]" : "ring-1 ring-gray-200 dark:ring-white/10 hover:scale-[1.02]"}`}
    >
      <button onClick={onClick} className="block w-full text-left">
        <div
          className="h-24 w-full flex items-center justify-center relative"
          style={{
            background: category.customImageUrl
              ? `url(${category.customImageUrl}) center/cover`
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
          }}
        >
          {!category.customImageUrl && (
            <Icon size={34} className="text-white/90" />
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
          <span className="absolute top-1.5 right-1.5 bg-black/40 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            {category.itemCount}
          </span>
        </div>
        <div className="bg-white dark:bg-[#161616] px-2.5 py-2">
          <p className="text-[12px] font-semibold text-gray-800 dark:text-white/80 truncate">
            {category.name}
          </p>
        </div>
      </button>

      {canWrite && (
        <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            className="w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
            title="Edit category"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
            }}
            className="w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white"
            title="Delete category"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, canWrite, onEdit, onRestock, onDelete }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#161616] ring-1 ring-gray-200 dark:ring-white/10 p-4 flex flex-col gap-2 relative">
      {item.isLowStock && (
        <span className="absolute -top-2 -right-2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse shadow-lg">
          <AlertTriangle size={11} /> LOW
        </span>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
            {item.name}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-white/30">
            {item.categoryName}
          </p>
        </div>
        <p className="text-[15px] font-bold text-blue-600 dark:text-blue-400">
          {item.price.toFixed(2)} EGP
        </p>
      </div>
      {item.description && (
        <p className="text-[12px] text-gray-500 dark:text-white/40 line-clamp-2">
          {item.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-1">
        <span
          className={`text-[12px] font-semibold ${item.isLowStock ? "text-red-500" : "text-gray-600 dark:text-white/50"}`}
        >
          Qty: {item.quantity}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-white/25">
          alarm @ {item.lowStockThreshold}
        </span>
      </div>
      {canWrite && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
          <button
            onClick={() => onRestock(item)}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20"
          >
            <PackagePlus size={13} /> Restock
          </button>
          <button
            onClick={() => onEdit(item)}
            className="flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#161616] rounded-2xl w-full max-w-md p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CategoryFormModal({ category, onClose, onSubmit, loading }) {
  const [name, setName] = useState(category?.name ?? "");
  const [iconKey, setIconKey] = useState(category?.iconKey ?? ICON_KEYS[0]);
  const [customImageUrl, setCustomImageUrl] = useState(
    category?.customImageUrl ?? "",
  );
  const isEdit = !!category;

  return (
    <Modal title={isEdit ? "Edit Category" : "New Category"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-white/40">
            Name
          </label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chocolates"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-white/40 block mb-1.5">
            Icon
          </label>
          <div className="grid grid-cols-6 gap-2">
            {ICON_KEYS.map((key) => {
              const Icon = ICONS[key];
              return (
                <button
                  key={key}
                  onClick={() => setIconKey(key)}
                  className={`aspect-square rounded-lg flex items-center justify-center transition-colors
                    ${iconKey === key ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40"}`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-white/40">
            Custom image URL (optional)
          </label>
          <input
            className={inputCls}
            value={customImageUrl}
            onChange={(e) => setCustomImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <button
          disabled={!name || loading}
          onClick={() =>
            onSubmit({
              ...(isEdit && { id: category.id, isActive: true }),
              name,
              iconKey,
              customImageUrl: customImageUrl || null,
            })
          }
          className="w-full py-2.5 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
        </button>
      </div>
    </Modal>
  );
}

function ItemFormModal({ item, categories, onClose, onSubmit, loading }) {
  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? categories[0]?.id ?? "",
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? "");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    item?.lowStockThreshold ?? 5,
  );
  const isEdit = !!item;

  return (
    <Modal title={isEdit ? "Edit Item" : "New Item"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-white/40">
            Name
          </label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pepsi Can"
          />
        </div>
        {!isEdit && (
          <div>
            <label className="text-[11px] font-medium text-gray-500 dark:text-white/40">
              Category
            </label>
            <select
              className={inputCls}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-white/40">
            Description
          </label>
          <input
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-gray-500 dark:text-white/40">
              Price (EGP)
            </label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          {!isEdit && (
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-white/40">
                Initial Qty
              </label>
              <input
                type="number"
                className={inputCls}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-white/40">
            Low Stock Alarm At
          </label>
          <input
            type="number"
            className={inputCls}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
          />
        </div>
        <button
          disabled={!name || !price || loading}
          onClick={() =>
            onSubmit({
              name,
              description: description || null,
              price: parseFloat(price),
              ...(!isEdit && {
                categoryId,
                quantity: parseInt(quantity || 0, 10),
              }),
              lowStockThreshold: parseInt(lowStockThreshold, 10),
            })
          }
          className="w-full py-2.5 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Item"}
        </button>
      </div>
    </Modal>
  );
}

function RestockModal({ item, onClose, onSubmit, loading }) {
  const [addQuantity, setAddQuantity] = useState("");
  return (
    <Modal title={`Restock "${item.name}"`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-[12px] text-gray-500 dark:text-white/40">
          Current quantity: {item.quantity}
        </p>
        <input
          type="number"
          className={inputCls}
          value={addQuantity}
          onChange={(e) => setAddQuantity(e.target.value)}
          placeholder="Quantity to add"
          autoFocus
        />
        <button
          disabled={!addQuantity || loading}
          onClick={() => onSubmit(parseInt(addQuantity, 10))}
          className="w-full py-2.5 rounded-lg text-white text-[13px] font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Updating…" : `Add ${addQuantity || 0} units`}
        </button>
      </div>
    </Modal>
  );
}

export default function StorePage() {
  const branchId = useAuthStore((s) => s.branchId);
  const userId = useAuthStore((s) => s.userId);
  const { can } = usePermissions();
  const qc = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categoryModal, setCategoryModal] = useState(null); // null | {} | category
  const [itemModal, setItemModal] = useState(null); // null | {} | item
  const [restockTarget, setRestockTarget] = useState(null);

  const { data: categoriesRes } = useQuery({
    queryKey: ["store-categories"],
    queryFn: storeApi.getCategories,
  });
  const categories = categoriesRes?.data?.data ?? [];
  const totalItemCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.itemCount, 0),
    [categories],
  );

  const { data: itemsRes, isLoading: itemsLoading } = useQuery({
    queryKey: ["store-items", branchId, selectedCategory, lowStockOnly],
    queryFn: () => storeApi.getItems(branchId, selectedCategory, lowStockOnly),
    enabled: !!branchId,
  });
  const items = itemsRes?.data?.data ?? [];
  const lowStockCount = useMemo(
    () => items.filter((i) => i.isLowStock).length,
    [items],
  );

  const invalidateItems = () =>
    qc.invalidateQueries({ queryKey: ["store-items"] });
  const invalidateCategories = () =>
    qc.invalidateQueries({ queryKey: ["store-categories"] });

  const createCategoryMut = useMutation({
    mutationFn: storeApi.createCategory,
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success("Category added");
        invalidateCategories();
        setCategoryModal(null);
      } else toast.error(res.data.message);
    },
  });

  const updateCategoryMut = useMutation({
    mutationFn: storeApi.updateCategory,
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success("Category updated");
        invalidateCategories();
        setCategoryModal(null);
      } else toast.error(res.data.message);
    },
  });

  const createItemMut = useMutation({
    mutationFn: storeApi.createItem,
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success("Item added");
        invalidateItems();
        invalidateCategories();
        setItemModal(null);
      } else toast.error(res.data.message);
    },
  });

  const updateItemMut = useMutation({
    mutationFn: storeApi.updateItem,
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success("Item updated");
        invalidateItems();
        setItemModal(null);
      } else toast.error(res.data.message);
    },
  });

  const restockMut = useMutation({
    mutationFn: storeApi.restock,
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success("Stock updated");
        invalidateItems();
        setRestockTarget(null);
      } else toast.error(res.data.message);
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: storeApi.deleteItem,
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success("Item removed");
        invalidateItems();
        invalidateCategories();
      } else toast.error(res.data.message);
    },
  });

  const handleDelete = (item) => {
    if (confirm(`Remove "${item.name}" from the store?`))
      deleteItemMut.mutate(item.id);
  };

  const handleDeleteCategory = (category) => {
    if (category.itemCount > 0) {
      toast.error(
        `Move or delete the ${category.itemCount} item(s) in "${category.name}" first.`,
      );
      return;
    }
    if (!confirm(`Delete category "${category.name}"?`)) return;
    updateCategoryMut.mutate({
      id: category.id,
      name: category.name,
      iconKey: category.iconKey,
      customImageUrl: category.customImageUrl,
      isActive: false,
    });
    if (selectedCategory === category.id) setSelectedCategory(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Store
          </h1>
          <p className="text-[12px] text-gray-400 dark:text-white/30 mt-0.5">
            Manage items, categories, and stock levels
          </p>
        </div>
        {can.storeWrite && (
          <div className="flex gap-2">
            <button
              onClick={() => setCategoryModal({})}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10"
            >
              <Plus size={15} /> Category
            </button>
            <button
              onClick={() => setItemModal({})}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-white shadow-md"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              <Plus size={15} /> Item
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <AllItemsTile
          active={!selectedCategory}
          onClick={() => setSelectedCategory(null)}
          totalCount={totalItemCount}
        />
        {categories.map((c) => (
          <CategoryTile
            key={c.id}
            category={c}
            active={selectedCategory === c.id}
            onClick={() => setSelectedCategory(c.id)}
            canWrite={can.storeWrite}
            onEdit={setCategoryModal}
            onDelete={handleDeleteCategory}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setLowStockOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors
            ${lowStockOnly ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40"}`}
        >
          <AlertTriangle size={13} /> Low Stock Only
        </button>
        {lowStockCount > 0 && !lowStockOnly && (
          <span className="text-[12px] text-red-500 font-medium">
            {lowStockCount} item{lowStockCount > 1 ? "s" : ""} running low
          </span>
        )}
      </div>

      {itemsLoading ? (
        <p className="text-[13px] text-gray-400 dark:text-white/30">
          Loading items…
        </p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-white/30">
          <Package size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-[13px]">No items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              canWrite={can.storeWrite}
              onEdit={setItemModal}
              onRestock={setRestockTarget}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {categoryModal && (
        <CategoryFormModal
          category={categoryModal.id ? categoryModal : null}
          onClose={() => setCategoryModal(null)}
          onSubmit={(data) =>
            categoryModal.id
              ? updateCategoryMut.mutate(data)
              : createCategoryMut.mutate(data)
          }
          loading={createCategoryMut.isPending || updateCategoryMut.isPending}
        />
      )}

      {itemModal && (
        <ItemFormModal
          item={itemModal.id ? itemModal : null}
          categories={categories}
          onClose={() => setItemModal(null)}
          onSubmit={(data) =>
            itemModal.id
              ? updateItemMut.mutate({
                  id: itemModal.id,
                  rowVersion: itemModal.rowVersion,
                  ...data,
                })
              : createItemMut.mutate({ branchId, createdBy: userId, ...data })
          }
          loading={createItemMut.isPending || updateItemMut.isPending}
        />
      )}

      {restockTarget && (
        <RestockModal
          item={restockTarget}
          onClose={() => setRestockTarget(null)}
          onSubmit={(addQuantity) =>
            restockMut.mutate({
              id: restockTarget.id,
              addQuantity,
              rowVersion: restockTarget.rowVersion,
            })
          }
          loading={restockMut.isPending}
        />
      )}
    </div>
  );
}
