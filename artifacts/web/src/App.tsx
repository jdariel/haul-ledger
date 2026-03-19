import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Income from "@/pages/Income";
import Reports from "@/pages/Reports";
import More from "@/pages/More";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function Router() {
  return (
    <>
      <div className="pb-nav flex-1 overflow-y-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/income" component={Income} />
          <Route path="/reports" component={Reports} />
          <Route path="/more" component={More} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <div className="app-shell">
          <Router />
        </div>
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
