import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Crown, Heart, Sparkles } from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";

import { BottomNav } from "./components/BottomNav";
import { ErrorScreen } from "./components/ErrorScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { AuthProvider, useAuth, useAuthBootstrap } from "./hooks/useAuth";
import { AdminArchivePage } from "./pages/AdminArchivePage";
import { AdminGiftFormPage } from "./pages/AdminGiftFormPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminReservationsPage } from "./pages/AdminReservationsPage";
import { GiftDetailsPage } from "./pages/GiftDetailsPage";
import { MyReservationsPage } from "./pages/MyReservationsPage";
import { WishlistPage } from "./pages/WishlistPage";

const queryClient = new QueryClient();

const AppShell = () => {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header app-header--glass">
        <div className="app-header__main">
          <Link to="/" className="brand">
            <Sparkles size={18} />
            <span>Список подарков</span>
          </Link>
          <span className={`role-pill ${user.role === "ADMIN" ? "role-pill--admin" : "role-pill--user"}`}>
            {user.role === "ADMIN" ? <Crown size={14} /> : <Heart size={14} />}
            {user.role === "ADMIN" ? "Администратор" : "Участник"}
          </span>
        </div>
        <p className="app-header__subtitle">
          {user.role === "ADMIN"
            ? "Управляйте списком подарков и бронированиями в одном месте."
            : "Выбирайте подарки и бронируйте их без дублей."}
        </p>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<WishlistPage />} />
          <Route path="/gift/:id" element={<GiftDetailsPage />} />
          <Route path="/my-reservations" element={<MyReservationsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/reservations" element={<AdminReservationsPage />} />
          <Route path="/admin/gifts/new" element={<AdminGiftFormPage />} />
          <Route path="/admin/gifts/:id/edit" element={<AdminGiftFormPage />} />
          <Route path="/admin/archive" element={<AdminArchivePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav role={user.role} />
    </div>
  );
};

const App = () => {
  const bootstrapState = useAuthBootstrap();

  if (bootstrapState.status === "loading") {
    return <LoadingScreen />;
  }

  if (bootstrapState.status === "error") {
    return <ErrorScreen message={bootstrapState.message} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={bootstrapState.user} token={bootstrapState.token}>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
