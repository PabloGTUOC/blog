import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic"; // so the client gate always runs fresh

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminShell>{children}</AdminShell>;
}
