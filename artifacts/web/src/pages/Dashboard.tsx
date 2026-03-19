import { useState, useEffect } from "react";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, Navigation, Flame, Plus, ChevronRight } from "lucide-react";
import { useSummary, useExpenses, useIncome, useQuickExpenses, useCreateExpense, getWeekBounds, fmtShort, fmtCurrency } from "@/lib/api";
import { getWeeklyMilesTarget } from "@/lib/userPrefs";
import { Button } from "@/components/ui/button";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";

export default function Dashboard() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [quickLogging, setQuickLogging] = useState<any | null>(null);

  const { data: summary } = useSummary();
  const { data: expenses } = useExpenses();
  const { data: income } = useIncome();
  const { data: quickExpenses } = useQuickExpenses();
  const createExpense = useCreateExpense();

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netProfit = summary?.netProfit ?? 0;
  const weeklyMiles = summary?.weeklyMiles ?? 0;
  const milesTarget = getWeeklyMilesTarget();

  const recentActivity = [
    ...(income ?? []).map((i: any) => ({ ...i, _type: "income" })),
    ...(expenses ?? []).map((e: any) => ({ ...e, _type: "expense" })),
  ]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5);

  const handleQuickLog = async (qe: any) => {
    setQuickLogging(qe.id);
    try {
      await createExpense.mutateAsync({
        category: qe.category,
        merchant: qe.label,
        amount: qe.defaultAmount,
        date: new Date().toISOString().split("T")[0],
      });
    } finally {
      setQuickLogging(null);
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold text-foreground">This Week</h1>
        <div className="flex items-center bg-card border border-border rounded-xl p-1">
          <button
            onClick={() => setPeriod("week")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${period === "week" ? "bg-primary text-white" : "text-muted-foreground"}`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${period === "month" ? "bg-primary text-white" : "text-muted-foreground"}`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Net Profit Card */}
      <div className="mx-4 mb-3 bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-muted-foreground tracking-wide">NET PROFIT</span>
          <div className="w-9 h-9 rounded-xl bg-green-light flex items-center justify-center">
            <TrendingUp size={17} className="text-green" />
          </div>
        </div>
        <p className={`text-4xl font-extrabold mb-2 ${netProfit >= 0 ? "text-green" : "text-red-500"}`}>
          {fmtCurrency(netProfit)}
        </p>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green" />
            <span className="text-sm text-muted-foreground font-medium">{fmtCurrency(totalIncome)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--orange))" }} />
            <span className="text-sm text-muted-foreground font-medium">{fmtCurrency(totalExpenses)}</span>
          </div>
        </div>
        <div className="mt-4 h-px bg-border" />
      </div>

      {/* Stats Grid */}
      <div className="mx-4 grid grid-cols-2 gap-2.5 mb-3">
        <Link href="/income">
          <div className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/30 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-green-light flex items-center justify-center mb-2.5">
              <TrendingUp size={17} className="text-green" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground tracking-wide mb-1">INCOME</p>
            <p className="text-2xl font-extrabold text-green">{fmtCurrency(totalIncome)}</p>
          </div>
        </Link>

        <Link href="/expenses">
          <div className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-red-300 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-red-light flex items-center justify-center mb-2.5">
              <TrendingDown size={17} className="text-red-500" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground tracking-wide mb-1">EXPENSES</p>
            <p className="text-2xl font-extrabold text-red-500">{fmtCurrency(totalExpenses)}</p>
          </div>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-teal-light flex items-center justify-center mb-2.5">
            <Navigation size={17} className="text-teal" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground tracking-wide mb-1">MILES</p>
          <p className="text-2xl font-extrabold text-foreground">{weeklyMiles.toLocaleString()}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-orange-light flex items-center justify-center mb-2.5">
            <Flame size={17} className="text-orange" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground tracking-wide mb-1">FUEL COST/MILE</p>
          <p className="text-2xl font-extrabold text-foreground">—</p>
        </div>

        <div className="col-span-2 bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-light flex items-center justify-center">
              <Navigation size={17} className="text-teal" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground tracking-wide">MILES THIS WEEK</p>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{weeklyMiles > 0 ? weeklyMiles.toLocaleString() : "—"}</p>
          {milesTarget > 0 && weeklyMiles > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{weeklyMiles.toLocaleString()} mi</span>
                <span>{Math.round((weeklyMiles / milesTarget) * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (weeklyMiles / milesTarget) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Log */}
      {quickExpenses && quickExpenses.length > 0 && (
        <div className="mx-4 mb-3">
          <p className="text-base font-bold text-foreground mb-2">Quick Log</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {quickExpenses.map((qe: any) => (
              <button
                key={qe.id}
                onClick={() => handleQuickLog(qe)}
                disabled={quickLogging === qe.id}
                className="flex-shrink-0 bg-card border border-border rounded-xl px-4 py-2.5 text-left hover:border-primary/40 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground">{qe.label}</p>
                <p className="text-xs text-muted-foreground">{fmtCurrency(qe.defaultAmount)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mx-4 mb-4 bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-foreground">Recent Activity</p>
          <Link href="/expenses" className="text-sm font-semibold text-primary">View All</Link>
        </div>
        {recentActivity.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No recent activity.</div>
        ) : (
          <div className="space-y-0.5">
            {recentActivity.map((item: any, i: number) => {
              const isIncome = item._type === "income";
              return (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isIncome ? "bg-green-light" : "bg-red-light"}`}>
                    {isIncome ? <TrendingUp size={14} className="text-green" /> : <TrendingDown size={14} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {isIncome ? (item.description || "Income") : (item.merchant || item.category)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtShort(new Date(item.date || item.createdAt))}
                    </p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${isIncome ? "text-green" : "text-red-500"}`}>
                    {isIncome ? "+" : "-"}{fmtCurrency(Number(item.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-[80px] right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-primary/90 transition-colors"
        style={{ maxWidth: "calc(430px - 1rem)", right: "max(1rem, calc(50vw - 215px + 1rem))" }}
      >
        <Plus size={26} className="text-white" strokeWidth={2.5} />
      </button>

      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} />}
      {showAddIncome && <AddIncomeModal onClose={() => setShowAddIncome(false)} />}
    </div>
  );
}
