import { api } from '@/shared/api/client.js';

export const fetchGroups = () => api('/groups');
export const createGroup = (body) => api('/groups', { method: 'POST', body });
export const fetchGroup = (id) => api(`/groups/${id}`);
export const updateGroup = (id, body) => api(`/groups/${id}`, { method: 'PUT', body });
export const deleteGroup = (id) => api(`/groups/${id}`, { method: 'DELETE' });

export const inviteUser = (id, userId) => api(`/groups/${id}/invites`, { method: 'POST', body: { userId } });
export const cancelInvite = (id, inviteId) => api(`/groups/${id}/invites/${inviteId}`, { method: 'DELETE' });
export const respondInvite = (inviteId, accept) => api(`/group-invites/${inviteId}/respond`, { method: 'POST', body: { accept } });

export const removeMember = (id, userId) => api(`/groups/${id}/members/${userId}`, { method: 'DELETE' });
export const setMemberRole = (id, userId, role) => api(`/groups/${id}/members/${userId}/role`, { method: 'PUT', body: { role } });
export const transferLeader = (id, userId) => api(`/groups/${id}/transfer`, { method: 'POST', body: { userId } });

/** Newest page of the chat; pass `before` (a message id) for the page of older messages. */
export const fetchMessages = (id, before) => api(`/groups/${id}/messages${before ? `?before=${before}` : ''}`);
export const sendMessage = (id, body, mentionIds = [], taskIds = []) => api(`/groups/${id}/messages`, { method: 'POST', body: { body, mentionIds, taskIds } });
export const reactMessage = (id, mid, reaction) => api(`/groups/${id}/messages/${mid}/reactions`, { method: 'POST', body: { reaction } });
export const deleteMessage = (id, mid) => api(`/groups/${id}/messages/${mid}`, { method: 'DELETE' });

export const fetchAssignments = (id) => api(`/groups/${id}/assignments`);
export const createAssignment = (id, body) => api(`/groups/${id}/assignments`, { method: 'POST', body });
export const deleteAssignment = (id, aid) => api(`/groups/${id}/assignments/${aid}`, { method: 'DELETE' });
export const setAssignmentDone = (id, aid, done) => api(`/groups/${id}/assignments/${aid}/done`, { method: 'PUT', body: { done } });