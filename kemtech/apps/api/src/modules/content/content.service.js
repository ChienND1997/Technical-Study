import { BadRequestError, NotFoundError } from '../../common/errors.js';

/** Turns free text into an accent-insensitive prefix tsquery: "dong bo" -> "dong:* & bo:*". Null when nothing usable. */
export function toTsQuery(q) {
  const terms = (q ?? '').normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);
  return terms.length ? terms.map((t) => `${t}:*`).join(' & ') : null;
}

/** Normalises a docs path coming from /go links. */
const cleanPath = (p) => p.replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '').trim();

/** Topics, lessons, search, link resolving and personal lesson notes. */
export function createContentService({ contentRepo }) {
  const topicCard = ({ parent_id, ...t }) => t;

  return {
    /** Top-level topics with progress; each carries its children (slug/title) for dropdowns. */
    async listTopics(userId) {
      const all = await contentRepo.topicStats(userId);
      return all.filter((t) => !t.parent_id).map((t) => ({ ...topicCard(t), children: all.filter((c) => c.parent_id === t.id).map(topicCard) }));
    },

    async getTopic(slug, userId) {
      const topic = await contentRepo.findTopic(slug);
      if (!topic) throw new NotFoundError('Không tìm thấy chủ đề.');
      const [all, lessons] = await Promise.all([contentRepo.topicStats(userId), contentRepo.topicLessons(topic.id, userId)]);
      const { parent_id, ...t } = topic;
      return { topic: t, children: all.filter((c) => c.parent_id === topic.id).map(({ id, easy, medium, hard, parent_id, ...c }) => c), lessons };
    },

    async getLesson(id, userId) {
      const lesson = await contentRepo.findLesson(id);
      if (!lesson) throw new NotFoundError('Không tìm thấy bài học.');
      const [sections, cards, near, note] = await Promise.all([
        contentRepo.lessonSections(id, userId), contentRepo.cardCounts(id, userId),
        contentRepo.neighbours(lesson.topic_id, lesson.ord), contentRepo.getNote(userId, id),
      ]);
      const { topic_id, ord, ...l } = lesson;
      const dir = (d, n) => n && { dir: d, ...n };
      return { lesson: l, sections, note: note?.body ?? '', cards, prev: dir('prev', near.prev), next: dir('next', near.next) };
    },

    /** Full-text search over sections; one best hit per lesson. */
    async search(q) {
      const ts = toTsQuery(q);
      if (!ts || (q ?? '').trim().length < 2) throw new BadRequestError('Từ khóa tìm kiếm cần ít nhất 2 ký tự.');
      return contentRepo.search(ts, 30);
    },

    /** Docs path (as written in rewritten markdown links) -> in-app route. */
    async resolve(p) {
      const path = cleanPath(p ?? '');
      if (!path) throw new BadRequestError('Thiếu đường dẫn.');
      const lessonId = await contentRepo.lessonIdByPath(path);
      if (lessonId) return { to: `/lessons/${lessonId}` };
      const topicPath = path.replace(/\/?index\.md$/, '').replace(/\/$/, '');
      const slug = topicPath && (await contentRepo.topicSlugByPath(topicPath));
      if (slug) return { to: `/topics/${slug}` };
      throw new NotFoundError('Không tìm thấy bài viết được liên kết.');
    },

    listNotes: (userId) => contentRepo.listNotes(userId),
    async getNote(userId, lessonId) {
      return (await contentRepo.getNote(userId, lessonId)) ?? { lesson_id: lessonId, body: '', updated_at: null };
    },
    async saveNote(userId, lessonId, body) {
      if (!(await contentRepo.findLesson(lessonId))) throw new NotFoundError('Không tìm thấy bài học.');
      return body.trim() ? contentRepo.saveNote(userId, lessonId, body) : (await contentRepo.deleteNote(userId, lessonId), { lesson_id: lessonId, body: '', updated_at: null });
    },
    async deleteNote(userId, lessonId) {
      await contentRepo.deleteNote(userId, lessonId);
      return { ok: true };
    },
  };
}
