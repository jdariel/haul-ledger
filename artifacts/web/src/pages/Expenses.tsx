import { useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Plus, Search, Trash2, Receipt } from "lucide-react";
import { useExpenses, useDeleteExpense, getWeekBounds, fmtDate, fmtCurrency } from "@/lib/api";
import AddExpenseModal from "@/components/AddExpenseModal";

const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  Fuel: { color: "text-orange", bg: "bg-orange-light" },
  Maintenance: { color: "text-purple-600", bg: "bg-purple-100" },
  Lumper: { color: "text-primary", bg: "bg-blue-50" },
  Tolls: { color: "text-muted-foreground", bg: "bg-muted" },
  Parking: { color: "text-teal", bg: "bg-teal-light" },
  "Scale Fee": { color: "text-orange", bg: "bg-orange-light" },
  Other: { color: "text-muted-foreground", bg: "bg-muted" },
};

export default function Expenses() {
  const [view, setView] = useState<"week" | "all">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: expenses, refetch } = useExpenses();
  const deleteExpense = useDeleteExpense();

  const { start, end } = getWeekBounds(weekOffset);
  const isCurrentWeek = weekOffset === 0;
  const weekLabel = isCurrentWeek ? "This Week" : weekOffset === -1 ? "Last Week" : "";

  const filtered = (expenses ?? []).filter((e: any) => {
    if (search && !e.merchant?.toLowerCase().includes(search.toLowerCase()) && !e.category?.toLowerCase().includes(search.toLowerCase())) return false;
    if (view === "week") {
      const d = new Date(e.date || e.createdAt);
      return d >= start && d <= end;
    }
    return true;
  });

  const weekTotal = filtered.reduce((s: number, e: any) => s + Number(e.amount), 0);

  const handleDelete = async (id: number) => {
    await deleteExpense.mutateAsync(id);
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="px-5 pt-12 pb-3">
        <h1 className="text-2xl font-extrabold text-foreground">Expenses</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track every penny spent on the road.</p>
      </div>

      {/* Action Row */}
      <div className="flex gap-2.5 px-5 mb-3">
        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border rounded-xl text-sm font-semibold text-foreground">
          <Filter size={14} />
          Filter
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary rounded-xl text-sm font-bold text-white"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Expense
        </button>
      </div>

      {/* Search */}
      <div className="mx-5 mb-3 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
        <Search size={15} className="text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by merchant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      {/* Week/All Toggle */}
      <div className="mx-5 mb-3 flex bg-card border border-border rounded-xl p-1">
        <button
          onClick={() => setView("week")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${view === "week" ? "bg-primary text-white" : "text-muted-foreground"}`}
        >
          Week
        </button>
        <button
          onClick={() => setView("all")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${view === "all" ? "bg-primary text-white" : "text-muted-foreground"}`}
        >
          All
        </button>
      </div>

      {/* Week Navigator */}
      {view === "week" && (
        <div className="mx-5 mb-3 bg-card border border-border rounded-2xl flex items-center p-3.5">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1.5 text-muted-foreground hover:text-foreground">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-foreground">{fmtDate(start)} – {fmtDate(end)}</p>
            {weekLabel && <p className="text-xs text-muted-foreground">{weekLabel}</p>}
            <p className="text-sm font-bold text-red-500 mt-1">Week Total: -{fmtCurrency(weekTotal)}</p>
          </div>
          <button
            onClick={() => weekOffset < 0 && setWeekOffset(weekOffset + 1)}
            className={`p-1.5 ${weekOffset < 0 ? "text-muted-foreground hover:text-foreground" : "text-muted/30"}`}
            disabled={weekOffset >= 0}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* List */}
      <div className="px-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Receipt size={40} className="text-muted-foreground/40" />
            <p className="text-base font-semibold text-muted-foreground">
              {view === "week" ? "No expenses this week." : "No expenses found."}
            </p>
            <p className="text-sm text-muted-foreground/70">Tap + to log your first expense.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e: any) => {
              const meta = CATEGORY_META[e.category] ?? CATEGORY_META.Other;
              return (
                <div key={e.id} className="bg-card border border-border rounded-2xl flex items-center gap-3 p-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    <Receipt size={17} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{e.merchant || e.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.category} · {new Date(e.date || e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-sm font-bold text-red-500">-{fmtCurrency(Number(e.amount))}</span>
                    <button
                      onClick={() => setConfirmDelete(e.id)}
                      className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-5 w-full max-w-[400px]">
            <p className="text-base font-bold text-foreground mb-1">Delete Expense</p>
            <p className="text-sm text-muted-foreground mb-4">Remove this expense? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 bg-destructive rounded-xl text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
