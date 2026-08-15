import DashboardShell from "@/components/dashboard/layout/DashboardShell";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export const metadata = {
  title: "Dashboard - FriendBazar",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <DashboardShell>{children}</DashboardShell>
    </ProtectedRoute>
  );
}