import { NotFoundError } from '../../common/errors.js';

const FEATURED = 6;
const PREVIEW_SECTIONS = 2;

/** What a visitor without an account may read: the start of a few featured lessons. */
export function createPreviewService({ previewRepo }) {
  return {
    featured: () => previewRepo.featured(FEATURED),

    async lesson(id) {
      const lesson = await previewRepo.lesson(id);
      if (!lesson) throw new NotFoundError('Không tìm thấy bài học');
      const sections = await previewRepo.firstSections(id, PREVIEW_SECTIONS);
      return { lesson, sections, truncated: lesson.sections > sections.length };
    },
  };
}
