import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import NotFound from '@/shared/components/NotFound.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import ChatPanel from './ChatPanel.jsx';
import TasksPanel from './TasksPanel.jsx';
import MembersPanel from './MembersPanel.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import { useGroupQuery } from './queries.js';
import { ROLE_LABEL, isManager } from './roles.js';
import PageSkeleton from '@/shared/components/PageSkeleton.jsx';

const tabKey = (id) => `kt-group-tab-${id}`;

/** One group: chat, assignments, members and (for managers) settings. */
export default function GroupPage({ id }) {
  const { data, isLoading, error } = useGroupQuery(id);
  const nav = useNavigate();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const targetMid = searchParams?.get('mid');
  const [tab, setTab] = useState(() => {
    try {
      if (targetMid) return 'chat';
      return sessionStorage.getItem(tabKey(id)) || 'chat';
    } catch {
      return 'chat';
    }
  });
  const [highlightTaskId, setHighlightTaskId] = useState(null);

  const handleSelectTask = (taskId) => {
    setTab('tasks');
    setHighlightTaskId(taskId);
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(tabKey(id), tab);
    } catch {
      /* storage may be unavailable; the tab simply is not remembered */
    }
  }, [id, tab]);

  // the group was deleted or the user was removed: back to the list
  useEffect(() => {
    if (error && /nhóm/i.test(error.message)) nav({ to: '/groups', replace: true });
  }, [error, nav]);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <NotFound />;
  const { group, myRole, realRole, members, invites } = data;
  const manager = isManager(myRole);
  const tabs = [
    ['chat', '💬 Trò chuyện'],
    ['tasks', '📋 Bài tập'],
    ['members', `👥 Thành viên (${members.length})`],
    ...(manager ? [['settings', '⚙️ Cài đặt']] : []),
  ];
  const current = tabs.some(([k]) => k === tab) ? tab : 'chat';

  return (
    <div>
      <p className="link-btn" style={{ width: "130px" }}><Link to="/groups">← Nhóm học tập</Link></p>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h1 style={{ margin: 0 }}>{group.name}</h1>
        <span className="chip">{ROLE_LABEL[realRole ?? myRole]}{myRole !== realRole && ' · quyền quản trị'}</span>
      </div>
      {group.description && <p className="muted" style={{ marginTop: 0 }}>{group.description}</p>}

      <div className="tabs cats" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={current === k} className={`tab ${current === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {current === 'chat' && <ChatPanel groupId={group.id} myRole={myRole} members={members} onSelectTask={handleSelectTask} targetMessageId={targetMid} />}
      {current === 'tasks' && <TasksPanel groupId={group.id} myRole={myRole} members={members} highlightTaskId={highlightTaskId} />}
      {current === 'members' && <MembersPanel groupId={group.id} myRole={myRole} realRole={realRole} members={members} invites={invites} />}
      {current === 'settings' && <SettingsPanel group={group} myRole={myRole} />}
    </div>
  );
}