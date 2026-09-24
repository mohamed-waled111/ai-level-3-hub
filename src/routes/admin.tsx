import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookMarked, ClipboardList, FileText, GraduationCap, LayoutDashboard, Library, ScrollText } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Level 3 Academic Hub" },
      { name: "description", content: "Manage courses, lectures, quizzes, exams, summaries and the question bank." },
      { property: "og:title", content: "Admin — Level 3 Academic Hub" },
      { property: "og:description", content: "Platform administration for the Level 3 student hub." },
    ],
  }),
  component: AdminLayout,
});

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/courses", label: "Courses", icon: GraduationCap },
  { to: "/admin/lectures", label: "Lectures", icon: BookMarked },
  { to: "/admin/assessments", label: "Quizzes & Exams", icon: ClipboardList },
  { to: "/admin/summaries", label: "Summaries", icon: FileText },
  { to: "/admin/questions", label: "Question Bank", icon: Library },
] as const;

function AdminLayout() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", replace: true });
    else if (!isAdmin) navigate({ to: "/", replace: true });
  }, [loading, user, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return (
      <AppShell>
        <Container className="py-20">
          <p className="text-sm text-muted-foreground">Checking your access…</p>
        </Container>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Container className="py-8">
        <div className="flex items-center gap-2">
          <ScrollText className="size-4 text-primary" />
          <p className="label-eyebrow">Administration</p>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="card-surface h-fit p-2">
            {adminNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: Boolean((item as { exact?: boolean }).exact) }}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </Container>
    </AppShell>
  );
}
