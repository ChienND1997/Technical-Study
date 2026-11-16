import { api } from '@/shared/api/client.js';

export const fetchPosts = () => api('/blog/posts');
export const fetchMyPosts = () => api('/blog/mine');
export const fetchPost = (id) => api(`/blog/posts/${id}`);
export const createPost = (body) => api('/blog/posts', { method: 'POST', body });
export const updatePost = (id, body) => api(`/blog/posts/${id}`, { method: 'PUT', body });
export const deletePost = (id) => api(`/blog/posts/${id}`, { method: 'DELETE' });

// moderation (admin)
export const fetchReviewList = (status) => api(`/admin/blog?status=${status}`);
export const fetchPendingCount = () => api('/admin/blog/pending-count');
export const reviewPost = (id, body) => api(`/admin/blog/${id}/review`, { method: 'POST', body });

// comments: type is 'post' (community post) or 'lesson' (curated blog lesson)
export const fetchComments = (type, id) => api(`/blog/comments?type=${type}&id=${id}`);
export const addComment = (body) => api('/blog/comments', { method: 'POST', body });
export const deleteComment = (id) => api(`/blog/comments/${id}`, { method: 'DELETE' });
