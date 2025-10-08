// app/admin/page.tsx
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import ContentForm from "./_components/ContentForm";
import ConfirmDialog from "./_components/ConfirmDialog";
import SubmitButton from "./_components/SubmitButton";

export default async function AdminPage() {
  const courses = await prisma.course.findMany({
    orderBy: { title: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          contents: { include: { quiz: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });

  // Server actions
  async function createCourse(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const desc = String(formData.get("desc") || "").trim();
    if (!slug || !title) return;
    await prisma.course.create({ data: { slug, title, desc } });
    revalidatePath("/admin");
    revalidatePath("/");
  }

  async function deleteCourse(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;
    await prisma.attempt.deleteMany({
      where: { quiz: { contentBlock: { lesson: { courseId: id } } } },
    });
    await prisma.choice.deleteMany({
      where: { question: { quiz: { contentBlock: { lesson: { courseId: id } } } } },
    });
    await prisma.question.deleteMany({
      where: { quiz: { contentBlock: { lesson: { courseId: id } } } },
    });
    await prisma.quiz.deleteMany({
      where: { contentBlock: { lesson: { courseId: id } } },
    });
    await prisma.contentBlock.deleteMany({
      where: { lesson: { courseId: id } },
    });
    await prisma.lesson.deleteMany({ where: { courseId: id } });
    await prisma.course.delete({ where: { id } });
    revalidatePath("/admin");
    revalidatePath("/");
  }

  async function createLesson(formData: FormData) {
    "use server";
    const courseId = String(formData.get("courseId") || "");
    const slug = String(formData.get("slug") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const order = Number(formData.get("order") || 0);
    if (!courseId || !slug || !title) return;
    await prisma.lesson.create({ data: { courseId, slug, title, order } });
    revalidatePath("/admin");
  }

  async function deleteLesson(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;
    await prisma.attempt.deleteMany({
      where: { quiz: { contentBlock: { lessonId: id } } },
    });
    await prisma.choice.deleteMany({
      where: { question: { quiz: { contentBlock: { lessonId: id } } } },
    });
    await prisma.question.deleteMany({
      where: { quiz: { contentBlock: { lessonId: id } } },
    });
    await prisma.quiz.deleteMany({ where: { contentBlock: { lessonId: id } } });
    await prisma.contentBlock.deleteMany({ where: { lessonId: id } });
    await prisma.lesson.delete({ where: { id } });
    revalidatePath("/admin");
  }

  async function upsertContent(formData: FormData) {
    "use server";
    const lessonId = String(formData.get("lessonId") || "");
    const type = String(formData.get("type") || "markdown") as "markdown" | "quiz";
    const order = Number(formData.get("order") || 0);
    if (!lessonId) return;

    if (type === "quiz") {
      const quizTitle = String(formData.get("quizTitle") || "Quiz");
      const raw = String(formData.get("quizJson") || "[]");
      let items: { text: string; choices: string[]; correct: number }[] = [];
      try {
        items = JSON.parse(raw);
      } catch {
        items = [];
      }
      const block = await prisma.contentBlock.create({
        data: { lessonId, type: "quiz", order, title: quizTitle },
      });
      const quiz = await prisma.quiz.create({
        data: { contentBlockId: block.id, title: quizTitle },
      });
      for (const q of items) {
        const question = await prisma.question.create({
          data: { quizId: quiz.id, text: q.text },
        });
        const ids: string[] = [];
        for (const ch of q.choices) {
          const choice = await prisma.choice.create({
            data: { questionId: question.id, text: ch },
          });
          ids.push(choice.id);
        }
        await prisma.question.update({
          where: { id: question.id },
          data: { answerId: ids[q.correct] },
        });
      }
      revalidatePath("/admin");
      return;
    }

    // ---- MARKDOWN (docx/pdf/md/txt destekli) ----
    const blockTitle = String(formData.get("blockTitle") || "İçerik");
    let markdown = String(formData.get("markdown") || "");

    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      const lower = file.name.toLowerCase();

      if (lower.endsWith(".docx")) {
        const mammoth = (await import("mammoth")).default;
        const fs = await import("fs/promises");
        const path = await import("path");

        // Görseller için uploads klasörü garanti
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });

        const out = await mammoth.convertToHtml(
          { buffer: buf },
          {
            convertImage: mammoth.images.imgElement(async (image) => {
              const ext = image.contentType?.split("/")[1] || "png";
              const filename = `docx-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}.${ext}`;
              const filePath = path.join(uploadsDir, filename);
              const bytes = await image.read();
              await fs.writeFile(filePath, bytes);
              return { src: `/uploads/${filename}` };
            }),
          }
        );

        markdown = out.value; // HTML (ders sayfasında rehype-raw ile render ediliyor)
      } else if (lower.endsWith(".pdf")) {
        const { createRequire } = await import("node:module");
        const require = createRequire(process.cwd());
        const pdfParse = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;
        const data = await pdfParse(buf);
        markdown = data.text
          .split(/\n{2,}|\r\n{2,}/g)
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n\n");
      } else if (lower.endsWith(".md") || lower.endsWith(".txt")) {
        markdown = buf.toString("utf8");
      }
    }

    if (!markdown.trim()) markdown = "_(içerik eklenmedi)_";

    await prisma.contentBlock.create({
      data: { lessonId, type: "markdown", order, title: blockTitle, markdown },
    });
    revalidatePath("/admin");
  }

  async function deleteContent(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;
    await prisma.attempt.deleteMany({ where: { quiz: { contentBlockId: id } } });
    await prisma.choice.deleteMany({ where: { question: { quiz: { contentBlockId: id } } } });
    await prisma.question.deleteMany({ where: { quiz: { contentBlockId: id } } });
    await prisma.quiz.deleteMany({ where: { contentBlockId: id } });
    await prisma.contentBlock.delete({ where: { id } });
    revalidatePath("/admin");
  }

  // UI
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <ConfirmDialog />

      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {/* Kurs oluştur */}
      <section className="card p-6 space-y-3">
        <h2 className="font-semibold">Yeni Kurs</h2>
        <form action={createCourse} className="grid gap-3 sm:grid-cols-4">
          <input name="slug" placeholder="slug (ör. analiz)" className="input" />
          <input name="title" placeholder="başlık" className="input sm:col-span-2" />
          <input name="desc" placeholder="açıklama" className="input sm:col-span-4" />
          <div className="sm:col-span-4">
            <SubmitButton label="Oluştur" pendingLabel="Oluşturuluyor..." />
          </div>
        </form>
      </section>

      {/* Kurslar */}
      {courses.map((c) => (
        <section key={c.id} className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {c.title} <small>/{c.slug}</small>
            </h2>
            <form
              action={deleteCourse}
              data-confirm-title="Kursu sil"
              data-confirm="Bu kurs ve içindekiler silinecek. Geri alınamaz. Emin misin?"
            >
              <input type="hidden" name="id" value={c.id} />
              <SubmitButton label="Kursu Sil" pendingLabel="Siliniyor..." variant="danger" />
            </form>
          </div>

          {/* Ders ekle */}
          <details>
            <summary className="cursor-pointer">Ders Ekle</summary>
            <form action={createLesson} className="grid gap-3 mt-3 sm:grid-cols-4">
              <input type="hidden" name="courseId" value={c.id} />
              <input name="slug" placeholder="slug (ör. limit)" className="input" />
              <input name="title" placeholder="başlık" className="input sm:col-span-2" />
              <input name="order" type="number" defaultValue={0} className="input" />
              <div className="sm:col-span-4">
                <SubmitButton label="Dersi Oluştur" pendingLabel="Oluşturuluyor..." />
              </div>
            </form>
          </details>

          {/* İçerik ekle */}
          <ContentForm
            upsertContent={upsertContent}
            courseId={c.id}
            lessons={c.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              slug: l.slug,
              courseId: l.courseId,
            }))}
          />

          {/* Mevcut içerikler */}
          <ul className="grid gap-2">
            {c.lessons.map((l) => (
              <li key={l.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    {l.title} <small>(sıra: {l.order})</small>
                  </div>
                  <form
                    action={deleteLesson}
                    data-confirm-title="Dersi sil"
                    data-confirm="Bu ders ve içindekiler silinecek. Emin misin?"
                  >
                    <input type="hidden" name="id" value={l.id} />
                    <SubmitButton label="Dersi Sil" pendingLabel="Siliniyor..." variant="danger" />
                  </form>
                </div>

                <ul className="mt-3 grid gap-2">
                  {l.contents.map((b) => (
                    <li key={b.id} className="flex items-center justify-between">
                      <span>
                        {b.type === "markdown"
                          ? b.title || "İçerik"
                          : `Quiz → ${b.quiz?.title || "Adsız Quiz"}`}
                      </span>
                      <form
                        action={deleteContent}
                        data-confirm-title="İçeriği sil"
                        data-confirm="Bu içerik silinecek. Emin misin?"
                      >
                        <input type="hidden" name="id" value={b.id} />
                        <SubmitButton label="Sil" pendingLabel="Siliniyor..." variant="danger" />
                      </form>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
