import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as b from '@/features/blog/api.js';

export const blogKeys = {
  posts: ['blog', 'posts'],
  mine: ['blog', 'mine'],
  post: (id) => ['blog', 'post', Number(id)],
  review: (s) => ['blog', 'review', s],
  pending: ['blog', 'pending'],
};

export const usePostsQuery = () => useQuery({ queryKey: blogKeys.posts, queryFn: b.fetchPosts });
export const useMyPostsQuery = () => useQuery({ queryKey: blogKeys.mine, queryFn: b.fetchMyPosts });
export const usePostQuery = (id) => useQuery({ queryKey: blogKeys.post(id), queryFn: () => b.fetchPost(id), enabled: !!id });
export const useReviewListQuery = (status) => useQuery({ queryKey: blogKeys.review(status), queryFn: () => b.fetchReviewList(status) });
/** Number of posts waiting for approval (admins only; the caller decides whether to enable it). */
export const usePendingCount = (enabled) =>
  useQuery({ queryKey: blogKeys.pending, queryFn: b.fetchPendingCount, enabled, refetchInterval: 60000 });

const useBlogMutation = (fn, success) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, meta: { success }, onSuccess: () => qc.invalidateQueries({ queryKey: ['blog'] }) });
};
export const useCreatePost = () => useBlogMutation(b.createPost, 'Đã lưu bài viết');
export const useUpdatePost = () => useBlogMutation(({ id, ...body }) => b.updatePost(id, body), 'Đã cập nhật bài viết');
export const useDeletePost = () => useBlogMutation(b.deletePost, 'Đã xóa bài viết');
export const useReviewPost = () => useBlogMutation(({ id, ...body }) => b.reviewPost(id, body), 'Đã xử lý bài viết');

export const useCommentsQuery = (type, id) =>
  useQuery({ queryKey: ['blog', 'comments', type, Number(id)], queryFn: () => b.fetchComments(type, id), enabled: !!id });
export const useAddComment = () => useBlogMutation(b.addComment, 'Đã gửi bình luận');
export const useDeleteComment = () => useBlogMutation(b.deleteComment, 'Đã xóa bình luận');
