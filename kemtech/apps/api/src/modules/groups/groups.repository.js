/** SQL for study groups: members, invites, chat and assignments. */
export function createGroupsRepository(db) {
  return {
    // ---- groups and members
    async listForUser(userId) {
      const { rows } = await db.query(
        `SELECT g.id, g.name, g.description, m.role AS my_role,
                (SELECT count(*) FROM group_members x WHERE x.group_id = g.id)::int AS member_count,
                (SELECT count(*) FROM group_assignment_members am JOIN group_assignments a ON a.id = am.assignment_id
                  WHERE a.group_id = g.id AND am.user_id = $1 AND am.done_at IS NULL)::int AS open_tasks,
                -- unread chat messages (kept as grouped notifications; the chat panel shows them instead of the bell)
                COALESCE((SELECT sum(n.count) FROM notifications n
                           WHERE n.user_id = $1 AND n.type = 'group_message' AND n.ref_id = g.id AND n.read_at IS NULL), 0)::int AS unread_messages
           FROM study_groups g JOIN group_members m ON m.group_id = g.id AND m.user_id = $1
          ORDER BY g.updated_at DESC`,
        [userId],
      );
      return rows;
    },
    async getGroup(id) {
      const { rows } = await db.query('SELECT id, name, description, created_by, created_at FROM study_groups WHERE id = $1', [id]);
      return rows[0] ?? null;
    },
    async createGroup(userId, { name, description }) {
      const { rows } = await db.query('INSERT INTO study_groups (name, description, created_by) VALUES ($1,$2,$3) RETURNING id', [name, description, userId]);
      await db.query(`INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'leader')`, [rows[0].id, userId]);
      return rows[0];
    },
    async updateGroup(id, { name, description }) {
      const { rowCount } = await db.query('UPDATE study_groups SET name = $2, description = $3, updated_at = now() WHERE id = $1', [id, name, description]);
      return rowCount > 0;
    },
    async deleteGroup(id) {
      await db.query('DELETE FROM study_groups WHERE id = $1', [id]);
    },
    async roleOf(groupId, userId) {
      const { rows } = await db.query('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
      return rows[0]?.role ?? null;
    },
    async members(groupId) {
      const { rows } = await db.query(
        `SELECT u.id, u.name, u.avatar_url, m.role, m.joined_at, (NOT u.active OR u.deleted_at IS NOT NULL) AS blocked
           FROM group_members m JOIN users u ON u.id = m.user_id
          WHERE m.group_id = $1 ORDER BY (m.role = 'leader') DESC, (m.role = 'deputy') DESC, u.name`,
        [groupId],
      );
      return rows;
    },
    async addMember(groupId, userId) {
      await db.query(`INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [groupId, userId]);
    },
    async removeMember(groupId, userId) {
      await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
      // an assignment nobody has to do for this member any more
      await db.query(
        `DELETE FROM group_assignment_members WHERE user_id = $2
           AND assignment_id IN (SELECT id FROM group_assignments WHERE group_id = $1)`,
        [groupId, userId],
      );
    },
    async setRole(groupId, userId, role) {
      await db.query('UPDATE group_members SET role = $3 WHERE group_id = $1 AND user_id = $2', [groupId, userId, role]);
    },

    // ---- invites
    async createInvite(groupId, inviterId, inviteeId) {
      const { rows } = await db.query(
        'INSERT INTO group_invites (group_id, inviter_id, invitee_id) VALUES ($1,$2,$3) RETURNING id',
        [groupId, inviterId, inviteeId],
      );
      return rows[0];
    },
    async pendingInvite(groupId, inviteeId) {
      const { rows } = await db.query(`SELECT id FROM group_invites WHERE group_id = $1 AND invitee_id = $2 AND status = 'pending'`, [groupId, inviteeId]);
      return rows[0] ?? null;
    },
    async getInvite(id) {
      const { rows } = await db.query('SELECT id, group_id, inviter_id, invitee_id, status FROM group_invites WHERE id = $1', [id]);
      return rows[0] ?? null;
    },
    async resolveInvite(id, status) {
      await db.query('UPDATE group_invites SET status = $2, responded_at = now() WHERE id = $1', [id, status]);
    },
    async pendingInvites(groupId) {
      const { rows } = await db.query(
        `SELECT i.id, i.invitee_id, u.name, i.created_at FROM group_invites i JOIN users u ON u.id = i.invitee_id
          WHERE i.group_id = $1 AND i.status = 'pending' ORDER BY i.created_at DESC`,
        [groupId],
      );
      return rows;
    },
    async cancelInvite(groupId, id) {
      const { rowCount } = await db.query(`DELETE FROM group_invites WHERE id = $2 AND group_id = $1 AND status = 'pending'`, [groupId, id]);
      return rowCount > 0;
    },

    // ---- chat
    async messages(groupId, before, limit) {
      const { rows } = await db.query(
        `SELECT m.id, m.body, m.mentions, COALESCE(m.task_mentions, '[]'::jsonb) AS task_mentions, m.created_at, m.user_id, u.name AS author, u.avatar_url,
                (NOT u.active OR u.deleted_at IS NOT NULL) AS author_blocked,
                COALESCE((
                  SELECT json_agg(json_build_object(
                    'reaction', r.reaction,
                    'user_id', r.user_id,
                    'user_name', ru.name
                  ) ORDER BY r.created_at)
                  FROM group_message_reactions r
                  JOIN users ru ON ru.id = r.user_id
                  WHERE r.message_id = m.id
                ), '[]'::json) AS reactions
           FROM group_messages m JOIN users u ON u.id = m.user_id
          WHERE m.group_id = $1 AND ($2::bigint IS NULL OR m.id < $2)
          ORDER BY m.id DESC LIMIT $3`,
        [groupId, before ?? null, limit],
      );
      return rows.reverse();
    },
    async addMessage(groupId, userId, body, mentions = [], taskMentions = []) {
      const { rows } = await db.query(
        `INSERT INTO group_messages (group_id, user_id, body, mentions, task_mentions)
         VALUES ($1,$2,$3,$4::jsonb,$5::jsonb) RETURNING id, created_at`,
        [groupId, userId, body, JSON.stringify(mentions), JSON.stringify(taskMentions)],
      );
      await db.query('UPDATE study_groups SET updated_at = now() WHERE id = $1', [groupId]);
      return rows[0];
    },
    async toggleReaction(messageId, userId, reaction) {
      const { rows: existing } = await db.query(
        'SELECT reaction FROM group_message_reactions WHERE message_id = $1 AND user_id = $2',
        [messageId, userId],
      );
      if (existing.length > 0 && existing[0].reaction === reaction) {
        await db.query('DELETE FROM group_message_reactions WHERE message_id = $1 AND user_id = $2', [messageId, userId]);
        return { reaction: null };
      }
      await db.query(
        `INSERT INTO group_message_reactions (message_id, user_id, reaction)
         VALUES ($1, $2, $3)
         ON CONFLICT (message_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction, created_at = now()`,
        [messageId, userId, reaction],
      );
      return { reaction };
    },
    async getMessage(groupId, id) {
      const { rows } = await db.query('SELECT id, user_id, body FROM group_messages WHERE id = $2 AND group_id = $1', [groupId, id]);
      return rows[0] ?? null;
    },
    async deleteMessage(id) {
      await db.query('DELETE FROM group_messages WHERE id = $1', [id]);
    },

    // ---- assignments
    async assignments(groupId, userId) {
      const { rows } = await db.query(
        `SELECT a.id, a.title, a.description, a.due_date::text AS due_date, a.lesson_id, l.title AS lesson_title,
                a.created_at, a.created_by, c.name AS creator,
                (SELECT count(*) FROM group_assignment_members x WHERE x.assignment_id = a.id)::int AS total,
                (SELECT count(*) FROM group_assignment_members x WHERE x.assignment_id = a.id AND x.done_at IS NOT NULL)::int AS done,
                mine.user_id IS NOT NULL AS assigned_to_me, mine.done_at AS my_done_at,
                COALESCE((SELECT json_agg(json_build_object('id', x.user_id, 'name', u.name, 'done', x.done_at IS NOT NULL) ORDER BY u.name)
                            FROM group_assignment_members x JOIN users u ON u.id = x.user_id WHERE x.assignment_id = a.id), '[]'::json) AS people
           FROM group_assignments a
           JOIN users c ON c.id = a.created_by
           LEFT JOIN lessons l ON l.id = a.lesson_id
           LEFT JOIN group_assignment_members mine ON mine.assignment_id = a.id AND mine.user_id = $2
          WHERE a.group_id = $1 ORDER BY a.created_at DESC`,
        [groupId, userId],
      );
      return rows;
    },
    async getAssignment(groupId, id) {
      const { rows } = await db.query('SELECT id, title, created_by FROM group_assignments WHERE id = $2 AND group_id = $1', [groupId, id]);
      return rows[0] ?? null;
    },
    async createAssignment(groupId, userId, { title, description, dueDate, lessonId }, assigneeIds) {
      const { rows } = await db.query(
        `INSERT INTO group_assignments (group_id, created_by, title, description, due_date, lesson_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [groupId, userId, title, description, dueDate ?? null, lessonId ?? null],
      );
      await this.setAssignees(rows[0].id, assigneeIds);
      return rows[0];
    },
    async updateAssignment(id, { title, description, dueDate, lessonId }) {
      await db.query(
        'UPDATE group_assignments SET title = $2, description = $3, due_date = $4, lesson_id = $5 WHERE id = $1',
        [id, title, description, dueDate ?? null, lessonId ?? null],
      );
    },
    /** Replaces the people an assignment is given to, keeping the progress of those who stay. */
    async setAssignees(id, userIds) {
      await db.query('DELETE FROM group_assignment_members WHERE assignment_id = $1 AND NOT (user_id = ANY($2::bigint[]))', [id, userIds]);
      await db.query(
        `INSERT INTO group_assignment_members (assignment_id, user_id) SELECT $1, u FROM unnest($2::bigint[]) AS u ON CONFLICT DO NOTHING`,
        [id, userIds],
      );
    },
    async assignees(id) {
      const { rows } = await db.query('SELECT user_id FROM group_assignment_members WHERE assignment_id = $1', [id]);
      return rows.map((r) => r.user_id);
    },
    async deleteAssignment(id) {
      await db.query('DELETE FROM group_assignments WHERE id = $1', [id]);
    },
    async setDone(assignmentId, userId, done) {
      const { rowCount } = await db.query(
        'UPDATE group_assignment_members SET done_at = CASE WHEN $3 THEN now() ELSE NULL END WHERE assignment_id = $1 AND user_id = $2',
        [assignmentId, userId, done],
      );
      return rowCount > 0;
    },
  };
}
