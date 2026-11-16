import { createRootRoute, createRoute, createRouter, Navigate, redirect, useParams } from '@tanstack/react-router';
import NotFound from '@/shared/components/NotFound.jsx';
import AppLayout from '@/shared/layout/AppLayout.jsx';
import TodayPage from '@/features/today/TodayPage.jsx';
import TracksPage from '@/features/tracks/TracksPage.jsx';
import TrackDetailPage from '@/features/tracks/TrackDetailPage.jsx';
import TopicsPage from '@/features/topics/TopicsPage.jsx';
import TopicDetailPage from '@/features/topics/TopicDetailPage.jsx';
import LessonPage from '@/features/lessons/LessonPage.jsx';
import PracticePage from '@/features/practice/PracticePage.jsx';
import WrongPage from '@/features/quiz/WrongPage.jsx';
import ProfilePage from '@/features/profile/ProfilePage.jsx';
import UserProfilePage from '@/features/profile/UserProfilePage.jsx';
import BasketPage from '@/features/review/BasketPage.jsx';
import BlogPage from '@/features/blog/BlogPage.jsx';
import GroupsPage from '@/features/groups/GroupsPage.jsx';
import GroupPage from '@/features/groups/GroupPage.jsx';
import PostPage from '@/features/blog/PostPage.jsx';
import PostEditorPage from '@/features/blog/PostEditorPage.jsx';
import MyPostsPage from '@/features/blog/MyPostsPage.jsx';
import AdminPage from '@/features/admin/AdminPage.jsx';
import GoPage from '@/features/go/GoPage.jsx';
import SearchPage from '@/features/search/SearchPage.jsx';

const rootRoute = createRootRoute({
  component: AppLayout,
  notFoundComponent: NotFound,
});

/** Adapters that pass the `$id` path param to pages as a prop. */
const PostRoute = () => <PostPage id={useParams({ strict: false }).id} />;
const GroupRoute = () => <GroupPage id={useParams({ strict: false }).id} />;
const EditRoute = () => <PostEditorPage id={useParams({ strict: false }).id} />;
const UserRoute = () => <UserProfilePage userId={useParams({ strict: false }).userId} />;

const route = (path, component, extra = {}) =>
  createRoute({ getParentRoute: () => rootRoute, path, component, ...extra });

const routeTree = rootRoute.addChildren([
  route('/', TodayPage),
  route('/tracks', TracksPage),
  route('/tracks/$trackId', TrackDetailPage),
  route('/topics', TopicsPage),
  route('/topics/$slug', TopicDetailPage),
  route('/lessons/$lessonId', LessonPage, {
    validateSearch: (s) => ({ s: Number.isFinite(Number(s.s)) && s.s !== undefined ? Number(s.s) : undefined }),
  }),
  // the old flashcard review page was removed: cards are browsed in the basket
  route('/review', () => null, { beforeLoad: () => { throw redirect({ to: '/basket' }); } }),
  route('/practice', PracticePage, {
    validateSearch: (s) => ({
      mode: ['quiz', 'wrong', 'basket', 'mock'].includes(s.mode) ? s.mode : 'quiz',
      topic: s.topic != null ? String(s.topic) : undefined,
    }),
  }),
  // old URLs keep working
  route('/quiz', () => null, { beforeLoad: () => { throw redirect({ to: '/practice', search: { mode: 'quiz' } }); } }),
  route('/wrong', WrongPage),
  route('/mock', () => null, { beforeLoad: () => { throw redirect({ to: '/practice', search: { mode: 'mock' } }); } }),
  // stats and achievements moved into the profile page, as tabs
  route('/stats', () => null, { beforeLoad: () => { throw redirect({ to: '/profile', search: { tab: 'stats' } }); } }),
  route('/search', SearchPage, { validateSearch: (s) => ({ q: s.q != null ? String(s.q) : '' }) }),
  route('/game', () => null, { beforeLoad: () => { throw redirect({ to: '/profile', search: { tab: 'achievements' } }); } }),
  // the old notebook page was removed
  route('/notes', () => null, { beforeLoad: () => { throw redirect({ to: '/' }); } }),
  route('/basket', BasketPage),
  route('/groups', GroupsPage),
  route('/groups/$id', GroupRoute),
  route('/blog', BlogPage),
  route('/blog/write', PostEditorPage),
  route('/blog/write/$id', EditRoute),
  route('/blog/mine', MyPostsPage),
  route('/blog/post/$id', PostRoute),
  route('/admin', AdminPage),
  route('/profile', ProfilePage, {
    validateSearch: (s) => ({ tab: ['profile', 'stats', 'achievements'].includes(s.tab) ? s.tab : 'profile' }),
  }),
  route('/users/$userId', UserRoute, {
    validateSearch: (s) => ({ tab: ['stats', 'achievements'].includes(s.tab) ? s.tab : 'stats' }),
  }),
  // visitors see the sign-in form here (AppLayout); someone already signed in is sent to Today
  route('/login', () => <Navigate to="/" replace />),
  route('/go', GoPage, { validateSearch: (s) => ({ p: s.p != null ? String(s.p) : '' }) }),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });