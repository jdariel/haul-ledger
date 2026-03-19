import { useState } from "react";
import { ChevronRight, Download, FileText, LogOut, Trash2, Info, Navigation, Flame, GitMerge, BarChart2, Zap, Settings, Truck, Plus, X, Trash } from "lucide-react";
import { useAssets, useCreateAsset, useDeleteAsset, useFuelEntries, useCreateFuelEntry, useDeleteFuelEntry, useTrips, useCreateTrip, useDeleteTrip, useSavedRoutes, useCreateSavedRoute, useDeleteSavedRoute, useQuickExpenses, useCreateQuickExpense, useDeleteQuickExpense, fmtCurrency } from "@/lib/api";
import { getWeeklyMilesTarget, setWeeklyMilesTarget } from "@/lib/userPrefs";

type SubView = "main" | "settings" | "fleet" | "fuel" | "trips" | "routes" | "quick-add";

function MenuItem({ icon: Icon, iconBg, iconColor, title, subtitle, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 py-3.5 px-4 hover:bg-muted/30 transition-colors border-b border-border last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={19} className={iconColor} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </button>
  );
}

export default function More() {
  const [view, setView] = useState<SubView>("main");
  const [mileTarget, setMileTarget] = useState(String(getWeeklyMilesTarget()));
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number } | null>(null);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  const { data: assets } = useAssets();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();

  const { data: fuelEntries } = useFuelEntries();
  const createFuel = useCreateFuelEntry();
  const deleteFuel = useDeleteFuelEntry();

  const { data: trips } = useTrips();
  const createTrip = useCreateTrip();
  const deleteTrip = useDeleteTrip();

  const { data: routes } = useSavedRoutes();
  const createRoute = useCreateSavedRoute();
  const deleteRoute = useDeleteSavedRoute();

  const { data: quickExpenses } = useQuickExpenses();
  const createQuickExpense = useCreateQuickExpense();
  const deleteQuickExpense = useDeleteQuickExpense();

  const handleSaveMileTarget = () => {
    const n = parseInt(mileTarget, 10);
    if (!isNaN(n) && n > 0) setWeeklyMilesTarget(n);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    if (type === "asset") await deleteAsset.mutateAsync(id);
    else if (type === "fuel") await deleteFuel.mutateAsync(id);
    else if (type === "trip") await deleteTrip.mutateAsync(id);
    else if (type === "route") await deleteRoute.mutateAsync(id);
    else if (type === "qe") await deleteQuickExpense.mutateAsync(id);
    setConfirmDelete(null);
  };

  const handleCreateForm = async () => {
    if (showForm === "fleet") await createAsset.mutateAsync({ ...form, type: form.type || "Truck" });
    else if (showForm === "fuel") await createFuel.mutateAsync({ ...form, gallons: Number(form.gallons), pricePerGallon: Number(form.pricePerGallon), totalCost: Number(form.gallons || 0) * Number(form.pricePerGallon || 0) });
    else if (showForm === "trip") await createTrip.mutateAsync({ ...form, miles: Number(form.miles) });
    else if (showForm === "route") await createRoute.mutateAsync(form);
    else if (showForm === "qe") await createQuickExpense.mutateAsync({ ...form, defaultAmount: Number(form.defaultAmount) });
    setShowForm(null);
    setForm({});
  };

  // Settings View
  if (view === "settings") {
    return (
      <div className="min-h-full bg-background">
        <button onClick={() => setView("main")} className="flex items-center gap-1 px-5 pt-12 pb-2 text-primary text-sm font-semibold">
          ‹ More
        </button>
        <div className="px-5 mb-4">
          <h1 className="text-2xl font-extrabold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences.</p>
        </div>

        {/* Profile */}
        <div className="px-5 mb-5">
          <p className="text-lg font-bold text-foreground mb-3">Profile</p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-border">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-xl">DA</span>
              </div>
              <div>
                <p className="text-base font-bold text-foreground">Dariel Jimenez</p>
                <p className="text-sm text-muted-foreground">jimenezdariel16@gmail.com</p>
              </div>
            </div>
            {[
              { icon: "👤", label: "Name", value: "Dariel Jimenez" },
              { icon: "✉️", label: "Email", value: "jimenezdariel16@gmail.com" },
              { icon: "🔒", label: "Auth", value: "Replit" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <span>{r.icon}</span>
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                </div>
                <span className="text-sm text-foreground font-medium">{r.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span>☀️</span>
                <span className="text-sm text-muted-foreground">Appearance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground font-medium">Light</span>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="px-5 mb-5">
          <p className="text-lg font-bold text-foreground mb-3">Goals</p>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-light flex items-center justify-center flex-shrink-0">
                <Navigation size={17} className="text-teal" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Weekly Miles Target</p>
                <p className="text-xs text-muted-foreground">Track progress on your dashboard</p>
              </div>
              <input
                type="number"
                value={mileTarget}
                onChange={(e) => setMileTarget(e.target.value)}
                placeholder="e.g. 2500"
                className="w-20 text-sm text-center bg-background border border-border rounded-lg px-2 py-1.5 text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={handleSaveMileTarget}
                className="px-3 py-1.5 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Tools */}
        <div className="px-5 mb-5">
          <p className="text-lg font-bold text-foreground mb-3">Tools</p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <MenuItem icon={Truck} iconBg="bg-teal-light" iconColor="text-teal" title="Fleet" subtitle="Manage your trucks and trailers" onClick={() => setView("fleet")} />
          </div>
        </div>
      </div>
    );
  }

  // Fleet View
  if (view === "fleet") {
    return (
      <ListView
        title="Fleet"
        backLabel="Settings"
        onBack={() => setView("settings")}
        onAdd={() => { setShowForm("fleet"); setForm({ type: "Truck" }); }}
        items={assets ?? []}
        renderItem={(a: any) => (
          <div key={a.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <div className="w-9 h-9 rounded-xl bg-teal-light flex items-center justify-center">
              <Truck size={16} className="text-teal" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{a.year} {a.make} {a.model}</p>
              <p className="text-xs text-muted-foreground">{a.type} · {a.plateNumber || "No plate"}</p>
            </div>
            <button onClick={() => setConfirmDelete({ type: "asset", id: a.id })} className="text-muted-foreground/50 hover:text-red-400 p-1">
              <Trash2 size={15} />
            </button>
          </div>
        )}
        emptyText="No vehicles added yet."
        showForm={showForm === "fleet"}
        formTitle="Add Vehicle"
        onCloseForm={() => { setShowForm(null); setForm({}); }}
        onSubmitForm={handleCreateForm}
        formContent={
          <div className="space-y-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none">
              <option value="Truck">Truck</option>
              <option value="Trailer">Trailer</option>
            </select>
            <input placeholder="Year" type="number" value={form.year || ""} onChange={(e) => setForm({ ...form, year: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Make" value={form.make || ""} onChange={(e) => setForm({ ...form, make: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Model" value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Plate Number" value={form.plateNumber || ""} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
          </div>
        }
        confirmDelete={confirmDelete?.type === "asset" ? confirmDelete : null}
        onCancelDelete={() => setConfirmDelete(null)}
        onConfirmDelete={handleDeleteConfirm}
      />
    );
  }

  if (view === "fuel") {
    return (
      <ListView
        title="Fuel Log"
        backLabel="More"
        onBack={() => setView("main")}
        onAdd={() => { setShowForm("fuel"); setForm({}); }}
        items={fuelEntries ?? []}
        renderItem={(f: any) => (
          <div key={f.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <div className="w-9 h-9 rounded-xl bg-orange-light flex items-center justify-center">
              <Flame size={16} className="text-orange" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{f.vendor || "Fuel Stop"}</p>
              <p className="text-xs text-muted-foreground">{f.gallons}gal · {fmtCurrency(f.totalCost)}</p>
            </div>
            <button onClick={() => setConfirmDelete({ type: "fuel", id: f.id })} className="text-muted-foreground/50 hover:text-red-400 p-1"><Trash2 size={15} /></button>
          </div>
        )}
        emptyText="No fuel entries yet."
        showForm={showForm === "fuel"}
        formTitle="Add Fuel Entry"
        onCloseForm={() => { setShowForm(null); setForm({}); }}
        onSubmitForm={handleCreateForm}
        formContent={
          <div className="space-y-3">
            <input placeholder="Vendor / Station" value={form.vendor || ""} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Gallons" type="number" value={form.gallons || ""} onChange={(e) => setForm({ ...form, gallons: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Price per Gallon" type="number" step="0.01" value={form.pricePerGallon || ""} onChange={(e) => setForm({ ...form, pricePerGallon: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="State (e.g. TX)" value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
          </div>
        }
        confirmDelete={confirmDelete?.type === "fuel" ? confirmDelete : null}
        onCancelDelete={() => setConfirmDelete(null)}
        onConfirmDelete={handleDeleteConfirm}
      />
    );
  }

  if (view === "trips") {
    return (
      <ListView
        title="Trips"
        backLabel="More"
        onBack={() => setView("main")}
        onAdd={() => { setShowForm("trip"); setForm({}); }}
        items={trips ?? []}
        renderItem={(t: any) => (
          <div key={t.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <div className="w-9 h-9 rounded-xl bg-teal-light flex items-center justify-center">
              <Navigation size={16} className="text-teal" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{t.origin} → {t.destination}</p>
              <p className="text-xs text-muted-foreground">{t.miles} miles · {new Date(t.date || t.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => setConfirmDelete({ type: "trip", id: t.id })} className="text-muted-foreground/50 hover:text-red-400 p-1"><Trash2 size={15} /></button>
          </div>
        )}
        emptyText="No trips logged yet."
        showForm={showForm === "trip"}
        formTitle="Log Trip"
        onCloseForm={() => { setShowForm(null); setForm({}); }}
        onSubmitForm={handleCreateForm}
        formContent={
          <div className="space-y-3">
            <input placeholder="Origin (City, ST)" value={form.origin || ""} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Destination (City, ST)" value={form.destination || ""} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Miles" type="number" value={form.miles || ""} onChange={(e) => setForm({ ...form, miles: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
          </div>
        }
        confirmDelete={confirmDelete?.type === "trip" ? confirmDelete : null}
        onCancelDelete={() => setConfirmDelete(null)}
        onConfirmDelete={handleDeleteConfirm}
      />
    );
  }

  if (view === "routes") {
    return (
      <ListView
        title="Saved Routes"
        backLabel="More"
        onBack={() => setView("main")}
        onAdd={() => { setShowForm("route"); setForm({}); }}
        items={routes ?? []}
        renderItem={(r: any) => (
          <div key={r.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <div className="w-9 h-9 rounded-xl bg-teal-light flex items-center justify-center">
              <GitMerge size={16} className="text-teal" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.origin} → {r.destination}</p>
            </div>
            <button onClick={() => setConfirmDelete({ type: "route", id: r.id })} className="text-muted-foreground/50 hover:text-red-400 p-1"><Trash2 size={15} /></button>
          </div>
        )}
        emptyText="No saved routes yet."
        showForm={showForm === "route"}
        formTitle="Add Route"
        onCloseForm={() => { setShowForm(null); setForm({}); }}
        onSubmitForm={handleCreateForm}
        formContent={
          <div className="space-y-3">
            <input placeholder="Route Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Origin" value={form.origin || ""} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Destination" value={form.destination || ""} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Typical Rate ($)" type="number" value={form.typicalRate || ""} onChange={(e) => setForm({ ...form, typicalRate: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
          </div>
        }
        confirmDelete={confirmDelete?.type === "route" ? confirmDelete : null}
        onCancelDelete={() => setConfirmDelete(null)}
        onConfirmDelete={handleDeleteConfirm}
      />
    );
  }

  if (view === "quick-add") {
    return (
      <ListView
        title="Quick Add"
        backLabel="More"
        onBack={() => setView("main")}
        onAdd={() => { setShowForm("qe"); setForm({}); }}
        items={quickExpenses ?? []}
        renderItem={(q: any) => (
          <div key={q.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#fef9c3" }}>
              <Zap size={16} style={{ color: "#ca8a04" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{q.label}</p>
              <p className="text-xs text-muted-foreground">{q.category} · {fmtCurrency(q.defaultAmount)}</p>
            </div>
            <button onClick={() => setConfirmDelete({ type: "qe", id: q.id })} className="text-muted-foreground/50 hover:text-red-400 p-1"><Trash2 size={15} /></button>
          </div>
        )}
        emptyText="No quick expense templates."
        showForm={showForm === "qe"}
        formTitle="Add Quick Expense"
        onCloseForm={() => { setShowForm(null); setForm({}); }}
        onSubmitForm={handleCreateForm}
        formContent={
          <div className="space-y-3">
            <input placeholder="Label (e.g. Scale Fee)" value={form.label || ""} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
            <input placeholder="Default Amount ($)" type="number" value={form.defaultAmount || ""} onChange={(e) => setForm({ ...form, defaultAmount: e.target.value })} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
          </div>
        }
        confirmDelete={confirmDelete?.type === "qe" ? confirmDelete : null}
        onCancelDelete={() => setConfirmDelete(null)}
        onConfirmDelete={handleDeleteConfirm}
      />
    );
  }

  // Main More View
  return (
    <div className="min-h-full bg-background">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold text-foreground">More</h1>
      </div>

      {/* Menu */}
      <div className="mx-4 mb-4 bg-card border border-border rounded-2xl overflow-hidden">
        <MenuItem icon={Navigation} iconBg="bg-teal-light" iconColor="text-teal" title="Trips" subtitle="Log trips and track mileage" onClick={() => setView("trips")} />
        <MenuItem icon={Flame} iconBg="bg-orange-light" iconColor="text-orange" title="Fuel Log" subtitle="Track fuel purchases for IFTA" onClick={() => setView("fuel")} />
        <MenuItem icon={GitMerge} iconBg="bg-teal-light" iconColor="text-teal" title="Saved Routes" subtitle="Manage your route templates for quick income logging" onClick={() => setView("routes")} />
        <MenuItem icon={BarChart2} iconBg="bg-green-light" iconColor="text-green" title="Reports" subtitle="View financial reports and export data" onClick={() => {}} />
        <MenuItem icon={Zap} iconBg="bg-yellow-100" iconColor="text-yellow-600" title="Quick Add" subtitle="Save common expenses to log in one tap" onClick={() => setView("quick-add")} />
      </div>

      {/* Account */}
      <div className="px-4 mb-2">
        <p className="text-lg font-bold text-foreground mb-3">Account</p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden p-4 space-y-3">
          <button className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors">
            <Download size={15} />
            Export All Data
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors">
            <FileText size={15} />
            Export as CSV
          </button>
          <div className="flex gap-3 bg-muted/40 border border-border rounded-xl p-3.5">
            <Info size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              We recommend exporting your data monthly. Your records are stored securely, but a local backup is always a good idea.
            </p>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-3 bg-destructive rounded-xl text-sm font-bold text-white">
            <LogOut size={15} />
            Sign Out
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-3 border border-destructive rounded-xl text-sm font-semibold text-destructive">
            <Trash2 size={15} />
            Delete All Data
          </button>
        </div>
      </div>

      {/* Settings link */}
      <div className="mx-4 mb-6">
        <button onClick={() => setView("settings")} className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:bg-muted/20 transition-colors">
          <Settings size={20} className="text-muted-foreground" />
          <span className="flex-1 text-left text-sm font-semibold text-foreground">Settings</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function ListView({ title, backLabel, onBack, onAdd, items, renderItem, emptyText, showForm, formTitle, onCloseForm, onSubmitForm, formContent, confirmDelete, onCancelDelete, onConfirmDelete }: any) {
  return (
    <div className="min-h-full bg-background">
      <button onClick={onBack} className="flex items-center gap-1 px-5 pt-12 pb-2 text-primary text-sm font-semibold">
        ‹ {backLabel}
      </button>
      <div className="flex items-center justify-between px-5 mb-4">
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
        <button onClick={onAdd} className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <Plus size={18} className="text-white" strokeWidth={2.5} />
        </button>
      </div>

      <div className="mx-5">
        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-12 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden px-4">
            {items.map(renderItem)}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-card rounded-t-2xl p-5 w-full max-w-[430px]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold text-foreground">{formTitle}</p>
              <button onClick={onCloseForm}><X size={20} className="text-muted-foreground" /></button>
            </div>
            {formContent}
            <button onClick={onSubmitForm} className="w-full mt-4 py-3 bg-primary rounded-xl text-sm font-bold text-white">Save</button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-5 w-full max-w-[400px]">
            <p className="text-base font-bold text-foreground mb-1">Confirm Delete</p>
            <p className="text-sm text-muted-foreground mb-4">This item will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={onCancelDelete} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground">Cancel</button>
              <button onClick={onConfirmDelete} className="flex-1 py-2.5 bg-destructive rounded-xl text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
