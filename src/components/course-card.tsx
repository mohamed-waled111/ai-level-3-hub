import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, FileText, ScrollText } from "lucide-react";
import { accentStyles, type CourseStats } from "@/lib/data";
import type { Course } from "@/lib/types";
import { ProgressBar } from "@/components/app-shell";

export function CourseCard({ course, stats }: { course: Course; stats: CourseStats }) {
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className="card-interactive group flex flex-col overflow-hidden"
    >
      <span className={`h-1.5 w-full ${accentStyles[course.accent] ?? "bg-primary"}`} />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-secondary px-2 py-1 text-[0.7rem] font-bold tracking-wider text-secondary-foreground">
            {course.code}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{stats.progress}%</span>
        </div>

        <h3 className="mt-4 text-lg font-bold leading-snug">{course.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{course.description}</p>

        <div className="mt-5 flex flex-wrap gap-2 text-[0.7rem] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
            <BookOpen className="size-3.5" /> {stats.lectures} Lectures
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
            <FileText className="size-3.5" /> {stats.quizzes} Quizzes
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
            <ScrollText className="size-3.5" /> {stats.exams} Exams
          </span>
        </div>

        <div className="mt-5">
          <ProgressBar value={stats.progress} />
        </div>

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Open Course
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
