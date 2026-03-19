import { useState } from "react";
import { Download, FileText, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { useSummary, useExpenses, useIncome, fmtDate, fmtCurrency } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

type Tab = "all" | "income" | "expenses";

export default function Reports() {
  const [tab, setTab] = useState<Tab>("all");

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const { data: summary } = useSummary();
  const { data: expenses } = useExpenses();
  const { data: income } = useIncome();

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netProfit = summary?.netProfit ?? 0;

  const expenseByCategory: Record<string, number> = {};
  (expenses ?? []).forEach((e: any) => {
    const cat = e.category || "Other";
    expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(e.amount);
  });

  const chartData = [
    { name: "Income", value: totalIncome, color: "hsl(var(--green))" },
    { name: "Expenses", value: totalExpenses, color: "hsl(var(--red))" },
  ];

  const downloadCSV = () => {
    const rows = [
      ["Type", "Description", "Amount", "Date"],
      ...(income ?? []).map((i: any) => ["Income", i.description || "Load Income", i.amount, i.date || i.createdAt]),
      ...(expenses ?? []).map((e: any) => ["Expense", e.merchant || e.category, e.amount, e.date || e.createdAt]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "haulledger-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "all", label: "All", icon: BarChart3 },
    { key: "income", label: "Income", icon: TrendingUp },
    { key: "expenses", label: "Expenses", icon: TrendingDown },
  ];

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold text-foreground">Reports</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground">
            <FileText size={13} />
            IFTA
          </button>
          <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground">
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="mx-5 mb-3 flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-2.5">
        <span className="text-primary text-sm">📅</span>
        <span className="text-sm text-foreground font-medium">{fmtDate(thirtyDaysAgo)}</span>
        <span className="text-muted-foreground text-sm mx-1">→</span>
        <span className="text-primary text-sm">📅</span>
        <span className="text-sm text-foreground font-medium">{fmtDate(now)}</span>
      </div>

      {/* Segment */}
      <div className="mx-5 mb-3 flex bg-card border border-border rounded-xl p-1 gap-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? "bg-primary text-white" : "text-muted-foreground"}`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Net Profit Summary */}
      <div className="mx-5 mb-3 bg-card border border-border rounded-2xl p-5 text-center">
        <p className="text-[11px] font-bold text-muted-foreground tracking-wide mb-1">NET PROFIT</p>
        <p className="text-4xl font-extrabold text-green mb-4">{fmtCurrency(netProfit)}</p>
        <div className="flex gap-3">
          <div className="flex-1 bg-green-light rounded-xl p-3.5">
            <p className="text-[10px] font-bold text-green tracking-wide mb-1">INCOME</p>
            <p className="text-2xl font-extrabold text-green">${totalIncome.toFixed(0)}</p>
          </div>
          <div className="flex-1 bg-red-light rounded-xl p-3.5">
            <p className="text-[10px] font-bold text-red-500 tracking-wide mb-1">EXPENSES</p>
            <p className="text-2xl font-extrabold text-red-500">${totalExpenses.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      {(tab === "all" || tab === "expenses") && (
        <div className="mx-5 mb-3 bg-card border border-border rounded-2xl p-4">
          <p className="text-[11px] font-bold text-muted-foreground tracking-wide mb-3">EXPENSE BREAKDOWN</p>
          {Object.keys(expenseByCategory).length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <FileText size={36} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No expenses in range</p>
            </div>
          ) : (
            <div className="space-y-0">
              {Object.entries(expenseByCategory).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <span className="text-sm font-medium text-foreground">{cat}</span>
                  <span className="text-sm font-bold text-red-500">-{fmtCurrency(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Income vs Expenses Chart */}
      {(tab === "all" || tab === "income") && (
        <div className="mx-5 mb-4 bg-card border border-border rounded-2xl p-4">
          <p className="text-[11px] font-bold text-muted-foreground tracking-wide mb-3">INCOME VS EXPENSES</p>
          {totalIncome === 0 && totalExpenses === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No data in range</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barSize={40}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
