import { useState } from "react";
import { X } from "lucide-react";
import { useCreateIncome } from "@/lib/api";

export default function AddIncomeModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    description: "",
    amount: "",
    source: "Load",
    loadNumber: "",
    trailerNumber: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });
  const createIncome = useCreateIncome();

  const handleSubmit = async () => {
    if (!form.amount || isNaN(Number(form.amount))) return;
    await createIncome.mutateAsync({ ...form, amount: Number(form.amount) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-card rounded-t-2xl p-5 w-full max-w-[430px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-lg font-bold text-foreground">Add Income</p>
          <button onClick={onClose}><X size={22} className="text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description / Load</label>
            <input
              placeholder="e.g. Chicago to Dallas"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Load Number (optional)</label>
            <input
              placeholder="Load #"
              value={form.loadNumber}
              onChange={(e) => setForm({ ...form, loadNumber: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Trailer # (optional)</label>
            <input
              placeholder="Trailer number"
              value={form.trailerNumber}
              onChange={(e) => setForm({ ...form, trailerNumber: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes (optional)</label>
            <textarea
              placeholder="Any notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold text-foreground">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={createIncome.isPending}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: "hsl(var(--green))" }}
          >
            {createIncome.isPending ? "Saving..." : "Save Income"}
          </button>
        </div>
      </div>
    </div>
  );
}
