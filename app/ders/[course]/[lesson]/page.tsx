import { prisma } from "@/lib/db";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export default async function LessonPage({ params }: { params: { course: string; lesson: string } }) {
  const lesson = await prisma.lesson.findFirst({
    where: { slug: params.lesson, course: { slug: params.course } },
    include: {
      contents: {
        orderBy: { order: "asc" },
        include: { quiz: true },
      },
    },
  });
  if (!lesson) return <div>Ders bulunamadı.</div>;

  const mdBlocks = lesson.contents.filter((b) => b.type === "markdown");
  const quizBlocks = lesson.contents.filter((b) => b.type === "quiz" && b.quiz);

  return (
    <div className="space-y-8">
      <nav className="text-sm text-gray-600 dark:text-slate-400">
        <Link href="/" className="hover:underline">Anasayfa</Link> <span>/</span>{" "}
        <Link href={`/ders/${params.course}`} className="hover:underline">{lesson.courseId ? params.course : "Ders"}</Link>{" "}
        <span>/</span> {lesson.title}
      </nav>

      <header>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
      </header>

      {mdBlocks.map((block) => (
        <section key={block.id} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{block.title || "İçerik"}</h2>
          <article className="prose">
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}  // ← HTML etiketlerini işler
    components={{
      img: (props) => <img {...props} className="max-w-full h-auto rounded-xl" />,
      table: (props) => <table {...props} className="table-auto w-full border-collapse" />,
      th: (props) => <th {...props} className="border px-3 py-2" />,
      td: (props) => <td {...props} className="border px-3 py-2" />,
    }}
  >
    {block.markdown ?? ""}
  </ReactMarkdown>
</article>
        </section>
      ))}

      <section className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quizler</h2>
        {quizBlocks.length === 0 ? (
          <p className="text-gray-600 dark:text-slate-400">Bu derste henüz quiz yok.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {quizBlocks.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/ders/${params.course}/${params.lesson}/quiz/${b.quiz!.id}`}
                  className="block rounded-xl border border-black/10 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  {b.title || b.quiz!.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

