import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuthStore } from "../context/authStore";
import { storeApi, salesApi } from "../services/endpoints";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  TrendingUp,
  Calendar,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Filter,
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

const PAGE_SIZE = 8;

// Applied to every useQuery on this page so data only reloads on a
// deliberate user action (filter change, page click, or a mutation's own
// invalidateQueries) — never from window focus, remount, or reconnect.
const NO_AUTO_REFETCH = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
};

function StatCard({ icon: Icon, label, total, count, gradient }) {
  return (
    <div
      className="rounded-2xl p-4 text-white shadow-lg flex flex-col gap-1 relative overflow-hidden"
      style={{ background: gradient }}
    >
      <Icon size={18} className="opacity-80" />
      <p className="text-[11px] font-medium opacity-80 mt-1">{label}</p>
      <p className="text-xl font-bold">{total.toFixed(2)} EGP</p>
      <p className="text-[11px] opacity-70">
        {count} sale{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function AllCategoriesTile({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 w-24 rounded-xl overflow-hidden group transition-all duration-200
        ${active ? "ring-2 ring-blue-500 scale-[1.02]" : "ring-1 ring-gray-200 dark:ring-white/10 hover:scale-[1.02]"}`}
    >
      <div
        className="h-16 w-full flex items-center justify-center relative"
        style={{ background: "linear-gradient(135deg, #64748b, #334155)" }}
      >
        <LayoutGrid size={22} className="text-white/90" />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
      </div>
      <div className="bg-white dark:bg-[#161616] px-1.5 py-1.5">
        <p className="text-[11px] font-semibold text-gray-800 dark:text-white/80 truncate text-center">
          All
        </p>
      </div>
    </button>
  );
}

function SalesCategoryTile({ category, active, onClick }) {
  const Icon = ICONS[category.iconKey] ?? ICONS.default;
  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 w-24 rounded-xl overflow-hidden group transition-all duration-200
        ${active ? "ring-2 ring-blue-500 scale-[1.02]" : "ring-1 ring-gray-200 dark:ring-white/10 hover:scale-[1.02]"}`}
    >
      <div
        className="h-16 w-full flex items-center justify-center relative"
        style={{
          background: category.customImageUrl
            ? `url(${category.customImageUrl}) center/cover`
            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
        }}
      >
        {!category.customImageUrl && (
          <Icon size={22} className="text-white/90" />
        )}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
      </div>
      <div className="bg-white dark:bg-[#161616] px-1.5 py-1.5">
        <p className="text-[11px] font-semibold text-gray-800 dark:text-white/80 truncate text-center">
          {category.name}
        </p>
      </div>
    </button>
  );
}

export default function SalesPage() {
  const branchId = useAuthStore((s) => s.branchId);
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the date filter changes — otherwise you can get
  // stuck on page 4 of a filtered result that only has 2 pages.
  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate]);

  const { data: categoriesRes } = useQuery({
    queryKey: ["store-categories"],
    queryFn: storeApi.getCategories,
    ...NO_AUTO_REFETCH,
  });
  const categories = categoriesRes?.data?.data ?? [];

  const { data: itemsRes } = useQuery({
    queryKey: ["store-items", branchId, selectedCategory, false],
    queryFn: () => storeApi.getItems(branchId, selectedCategory, false),
    enabled: !!branchId,
    ...NO_AUTO_REFETCH,
  });
  const items = itemsRes?.data?.data ?? [];

  const { data: statsRes } = useQuery({
    queryKey: ["sales-stats", branchId],
    queryFn: () => salesApi.getStats(branchId),
    enabled: !!branchId,
    ...NO_AUTO_REFETCH,
  });
  const stats = statsRes?.data?.data;

  const fromIso = fromDate ? new Date(fromDate).toISOString() : undefined;
  const toIso = toDate
    ? new Date(toDate + "T23:59:59").toISOString()
    : undefined;

  const {
    data: salesRes,
    isLoading: salesLoading,
    isFetching: salesFetching,
  } = useQuery({
    queryKey: ["sales-history", branchId, fromIso, toIso, page],
    queryFn: () => salesApi.getSales(branchId, fromIso, toIso, page, PAGE_SIZE),
    enabled: !!branchId,
    keepPreviousData: true, // avoids a flash of "no sales" while flipping pages
    ...NO_AUTO_REFETCH,
  });
  const salesPage = salesRes?.data?.data; // PagedResult<SaleResponse>
  const sales = salesPage?.items ?? [];
  const totalCount = salesPage?.totalCount ?? 0;
  const totalPages = salesPage?.totalPages ?? 1;

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [cart],
  );

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.storeItemId === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          toast.error(`Only ${item.quantity} left`);
          return prev;
        }
        return prev.map((l) =>
          l.storeItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      if (item.quantity < 1) {
        toast.error("Out of stock");
        return prev;
      }
      return [
        ...prev,
        {
          storeItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          available: item.quantity,
        },
      ];
    });
  };

  const changeQty = (storeItemId, delta) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.storeItemId !== storeItemId) return l;
          const nextQty = l.quantity + delta;
          if (nextQty > l.available) {
            toast.error(`Only ${l.available} left`);
            return l;
          }
          return { ...l, quantity: nextQty };
        })
        .filter((l) => l.quantity > 0),
    );
  };

  const removeFromCart = (storeItemId) =>
    setCart((prev) => prev.filter((l) => l.storeItemId !== storeItemId));

  const createSaleMut = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success(
          `Sale completed — ${res.data.data.totalAmount.toFixed(2)} EGP`,
        );
        setCart([]);
        qc.invalidateQueries({ queryKey: ["store-items"] });
        qc.invalidateQueries({ queryKey: ["sales-stats"] });
        qc.invalidateQueries({ queryKey: ["sales-history"] });
        setPage(1); // jump back to the freshest page so the new sale is visible
      } else {
        toast.error(res.data.message);
      }
    },
    onError: () => toast.error("Sale failed — please retry"),
  });

  const completeSale = () => {
    if (cart.length === 0) return;
    createSaleMut.mutate({
      branchId,
      createdBy: userId,
      lines: cart.map((l) => ({
        storeItemId: l.storeItemId,
        quantity: l.quantity,
      })),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sales
        </h1>
        <p className="text-[12px] text-gray-400 dark:text-white/30 mt-0.5">
          Sell items from the store and track performance
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Calendar}
            label="This Month"
            total={stats.thisMonthTotal}
            count={stats.thisMonthCount}
            gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
          />
          <StatCard
            icon={CalendarRange}
            label="Last 3 Months"
            total={stats.last3MonthsTotal}
            count={stats.last3MonthsCount}
            gradient="linear-gradient(135deg, #0ea5e9, #6366f1)"
          />
          <StatCard
            icon={TrendingUp}
            label="Last Year"
            total={stats.lastYearTotal}
            count={stats.lastYearCount}
            gradient="linear-gradient(135deg, #059669, #0ea5e9)"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Category selector — image tiles, same visual language as the Store page */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
            <AllCategoriesTile
              active={!selectedCategory}
              onClick={() => setSelectedCategory(null)}
            />
            {categories.map((c) => (
              <SalesCategoryTile
                key={c.id}
                category={c}
                active={selectedCategory === c.id}
                onClick={() => setSelectedCategory(c.id)}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.quantity < 1}
                className="text-left rounded-xl bg-white dark:bg-[#161616] ring-1 ring-gray-200 dark:ring-white/10 p-3 hover:ring-blue-400 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:hover:scale-100"
              >
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                  {item.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400">
                    {item.price.toFixed(2)} EGP
                  </span>
                  <span
                    className={`text-[10px] ${item.isLowStock ? "text-red-500 font-semibold" : "text-gray-400 dark:text-white/30"}`}
                  >
                    {item.quantity} left
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Sales history — server-paginated */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-[14px] font-bold text-gray-900 dark:text-white">
                Recent Sales
              </h2>
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-gray-400" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2 py-1 rounded-lg text-[12px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70"
                />
                <span className="text-[11px] text-gray-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2 py-1 rounded-lg text-[12px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    className="text-[11px] text-blue-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div
              className={`space-y-2 transition-opacity ${salesFetching ? "opacity-60" : ""}`}
            >
              {salesLoading ? (
                <p className="text-[12px] text-gray-400 dark:text-white/30 text-center py-6">
                  Loading…
                </p>
              ) : sales.length === 0 ? (
                <p className="text-[12px] text-gray-400 dark:text-white/30 text-center py-6">
                  No sales found
                </p>
              ) : (
                sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-xl bg-white dark:bg-[#161616] ring-1 ring-gray-200 dark:ring-white/10 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedSaleId(
                          expandedSaleId === sale.id ? null : sale.id,
                        )
                      }
                      className="w-full flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <Receipt size={15} className="text-gray-400" />
                        <div className="text-left">
                          <p className="text-[13px] font-semibold text-gray-800 dark:text-white/80">
                            {new Date(sale.saleDate).toLocaleString()}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-white/30">
                            {sale.items.length} item
                            {sale.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-gray-900 dark:text-white">
                          {sale.totalAmount.toFixed(2)} EGP
                        </span>
                        {expandedSaleId === sale.id ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                      </div>
                    </button>
                    {expandedSaleId === sale.id && (
                      <div className="px-4 pb-3 border-t border-gray-100 dark:border-white/5 pt-2 space-y-1">
                        {sale.items.map((li, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-[12px] text-gray-600 dark:text-white/50"
                          >
                            <span>
                              {li.quantity}x {li.itemName}
                            </span>
                            <span>{li.lineTotal.toFixed(2)} EGP</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-[11px] text-gray-400 dark:text-white/30">
                  Page {page} of {totalPages} — {totalCount} total
                </p>
                <div className="flex gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#161616] ring-1 ring-gray-200 dark:ring-white/10 p-4 h-fit sticky top-6">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={16} className="text-gray-500" />
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">
              Cart
            </h3>
          </div>
          {cart.length === 0 ? (
            <p className="text-[12px] text-gray-400 dark:text-white/30 text-center py-8">
              Cart is empty
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map((l) => (
                <div
                  key={l.storeItemId}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 dark:text-white/80 truncate">
                      {l.name}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-white/30">
                      {l.price.toFixed(2)} EGP each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(l.storeItemId, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-[12px] font-semibold w-5 text-center">
                      {l.quantity}
                    </span>
                    <button
                      onClick={() => changeQty(l.storeItemId, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60"
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      onClick={() => removeFromCart(l.storeItemId)}
                      className="ml-1 text-red-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 dark:border-white/5 pt-3 flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-gray-500 dark:text-white/40">
              Total
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {total.toFixed(2)} EGP
            </span>
          </div>
          <button
            disabled={cart.length === 0 || createSaleMut.isPending}
            onClick={completeSale}
            className="w-full py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-md disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
          >
            {createSaleMut.isPending ? "Processing…" : "Complete Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}
