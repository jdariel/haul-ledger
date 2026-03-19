import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Trash2, Plus } from "lucide-react";
import { useIncome, useDeleteIncome, getWeekBounds, fmtDate, fmtCurrency } from "@/lib/api";
import AddIncomeModal from "@/components/AddIncomeModal";

export default function Income() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: income } = useIncome();
  const deleteIncome = useDeleteIncome();

  const { start, end } = getWeekBounds(weekOffset);
  const isCurrentWeek = weekOffset === 0;
  const weekLabel = isCurrentWeek ? "This Week" : weekOffset === -1 ? "Last Week" : "";

  const weekIncome = (income ?? []).filter((i: any) => {
    const d = new Date(i.date || i.createdAt);
    return d >= start && d <= end;
  });

  const weekTotal = weekIncome.reduce((s: number, i: any) => s + Number(i.amount), 0);

  const handleDelete = async (id: number) => {
    await deleteIncome.mutateAsync(id);
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="px-5 pt-12 pb-3">
        <h1 className="text-2xl font-extrabold text-foreground">Income</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Log your loads and settlements.</p>
      </div>

      {/* Add Income Button */}
      <div className="px-5 mb-4">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-green rounded-xl text-sm font-bold text-green hover:bg-green-light transition-colors"
          style={{ borderColor: "hsl(var(--green))", color: "hsl(var(--green))" }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Income
        </button>
      </div>

      {/* Week Navigator */}
      <div className="mx-5 mb-4 bg-card border border-border rounded-2xl flex items-center p-3.5">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1.5 text-muted-foreground hover:text-foreground">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-foreground">{fmtDate(start)} – {fmtDate(end)}</p>
          {weekLabel && <p className="text-xs text-muted-foreground">{weekLabel}</p>}
          <p className="text-sm font-bold mt-1" style={{ color: "hsl(var(--green))" }}>
            Week Total: +{fmtCurrency(weekTotal)}
          </p>
        </div>
        <button
          onClick={() => weekOffset < 0 && setWeekOffset(weekOffset + 1)}
          className={`p-1.5 ${weekOffset < 0 ? "text-muted-foreground hover:text-foreground" : "text-muted/30"}`}
          disabled={weekOffset >= 0}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* List */}
      <div className="px-5">
        {weekIncome.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <TrendingUp size={44} className="text-muted-foreground/40" />
            <p className="text-base font-semibold text-muted-foreground">No income logged this week.</p>
            <p className="text-sm text-muted-foreground/70">Tap + to add a load.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {weekIncome.map((item: any) => (
              <div key={item.id} className="bg-card border border-border rounded-2xl flex items-center gap-3 p-3.5">
                <div className="w-10 h-10 rounded-xl bg-green-light flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={17} className="text-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.description || "Load Income"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.trailerNumber && (
                      <span className="text-xs font-medium px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground">
                        Trailer #{item.trailerNumber}
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {item.notes.slice(0, 60)}{item.notes.length > 60 ? "…" : ""}
                      </p>
                    )}
                    {!item.notes && !item.trailerNumber && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.date || item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="text-sm font-bold text-green">+{fmtCurrency(Number(item.amount))}</span>
                  <button
                    onClick={() => setConfirmDelete(item.id)}
                    className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-5 w-full max-w-[400px]">
            <p className="text-base font-bold text-foreground mb-1">Delete Income</p>
            <p className="text-sm text-muted-foreground mb-4">Remove this income entry?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 bg-destructive rounded-xl text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddIncomeModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
