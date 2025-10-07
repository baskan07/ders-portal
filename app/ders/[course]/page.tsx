import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;

  const courseRow = await prisma.course.findUnique({
    where: { slug: course },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!courseRow) return <div>Bulunamadı.</div>;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600 dark:text-slate-400">
        <Link href="/" className="hover:underline">
          Anasayfa
        </Link>{" "}
        <span>/</span> {courseRow.title}
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{courseRow.title}</h1>
        {courseRow.desc && (
          <p className="text-gray-600 dark:text-slate-400">{courseRow.desc}</p>
        )}
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {courseRow.lessons.map((l) => (
          <li key={l.id} className="card p-4 hover:shadow-lg transition">
            <Link
              href={`/ders/${courseRow.slug}/${l.slug}`}
              className="flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold">{l.title}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Sıra: {l.order}
                </p>
              </div>
              <span className="text-blue-600 dark:text-blue-400">Aç</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
