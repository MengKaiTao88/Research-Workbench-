import {
  Archive,
  ArrowUp,
  Atom,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Database,
  Ellipsis,
  FileText,
  FolderKanban,
  FolderOpen,
  Inbox,
  Library,
  ListFilter,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Tag,
  Terminal,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createRecord, loadRecords, saveRecords } from './store';
import {
  recordTypeLabels,
  statusLabels,
  statusOptions,
  type RecordStatus,
  type RecordType,
  type ResearchRecord,
} from './types';

type ViewId = 'home' | 'projects' | 'library' | 'settings';
type FilterId = 'all' | RecordType;
type WorkspacePreferences = {
  darkMode: boolean;
  compactTasks: boolean;
};

const preferencesStorageKey = 'research-workbench.codex-ui.preferences.v1';
const defaultPreferences: WorkspacePreferences = { darkMode: true, compactTasks: false };

function loadPreferences(): WorkspacePreferences {
  if (typeof window === 'undefined') return defaultPreferences;

  try {
    const raw = window.localStorage.getItem(preferencesStorageKey);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences>;
    return {
      darkMode: parsed.darkMode !== false,
      compactTasks: parsed.compactTasks === true,
    };
  } catch {
    return defaultPreferences;
  }
}

const navigation: Array<{ id: Exclude<ViewId, 'settings'>; label: string; icon: LucideIcon }> = [
  { id: 'home', label: '任务', icon: MessageSquare },
  { id: 'projects', label: '项目', icon: FolderKanban },
  { id: 'library', label: '资料库', icon: Library },
];

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: '全部任务' },
  { id: 'project', label: '项目' },
  { id: 'task', label: '任务' },
  { id: 'note', label: '笔记' },
  { id: 'data', label: '数据' },
  { id: 'file', label: '文件' },
  { id: 'review', label: '复盘' },
];

const typeIcons: Record<RecordType, LucideIcon> = {
  project: FolderKanban,
  task: Check,
  note: FileText,
  data: Database,
  file: FileText,
  review: BookOpen,
};

const typeColors: Record<RecordType, string> = {
  project: 'violet',
  task: 'blue',
  note: 'amber',
  data: 'green',
  file: 'slate',
  review: 'pink',
};

const quickPrompts = [
  {
    icon: Sparkles,
    label: '整理今天的研究计划',
    prompt: '帮我整理今天的研究计划，并拆成 3 个可执行任务。',
  },
  {
    icon: FileText,
    label: '记录一个研究想法',
    prompt: '记录一个新的研究想法：',
  },
  {
    icon: BarChartIcon,
    label: '复盘最近的进展',
    prompt: '帮我复盘最近的研究进展，并指出下一步最重要的工作。',
  },
];

function BarChartIcon(props: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={props.size ?? 16} viewBox="0 0 24 24" width={props.size ?? 16}>
      <path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6M20 16v-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function relativeTime(iso: string) {
  const distance = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(distance / 60000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

function sameDay(first: string, second: Date) {
  const date = new Date(first);
  return date.toDateString() === second.toDateString();
}

function statusTone(status: RecordStatus) {
  if (status === 'in-progress') return '处理中';
  return statusLabels[status];
}

function App() {
  const [records, setRecords] = useState<ResearchRecord[]>(() => loadRecords());
  const [activeView, setActiveView] = useState<ViewId>('home');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() => loadPreferences());
  const [toast, setToast] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => saveRecords(records), [records]);

  useEffect(() => {
    window.localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (selectedId && !records.some((record) => record.id === selectedId)) {
      setSelectedId('');
    }
  }, [records, selectedId]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openNewTask();
      }
      if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('.sidebar-search input')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedRecord = records.find((record) => record.id === selectedId);
  const matchingRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records
      .filter((record) => record.status !== 'archived')
      .filter((record) => activeFilter === 'all' || record.type === activeFilter)
      .filter((record) => {
        if (!normalizedQuery) return true;
        const searchable = [record.title, record.description, record.workspace, ...record.tags]
          .join(' ')
          .toLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());
  }, [activeFilter, query, records]);

  const browseRecords = useMemo(() => {
    if (activeView === 'projects') return matchingRecords.filter((record) => record.type === 'project');
    if (activeView === 'library') return matchingRecords.filter((record) => record.type !== 'task');
    return matchingRecords;
  }, [activeView, matchingRecords]);

  const showToast = (message: string) => setToast(message);

  function openNewTask() {
    setSelectedId('');
    setActiveView('home');
    setComposerValue('');
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  function focusComposer(value = '') {
    if (value) setComposerValue(value);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  function submitComposer(event?: FormEvent) {
    event?.preventDefault();
    const title = composerValue.trim();
    if (!title) {
      focusComposer();
      return;
    }
    const record = createRecord(title, `由研究工作区创建：${title}`);
    setRecords((current) => [record, ...current]);
    setSelectedId(record.id);
    setComposerValue('');
    setActiveView('home');
    showToast('已添加到研究工作区');
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submitComposer();
    }
  }

  function updateRecord(id: string, patch: Partial<ResearchRecord>) {
    setRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record,
      ),
    );
  }

  function archiveSelected() {
    if (!selectedRecord) return;
    updateRecord(selectedRecord.id, { status: 'archived' });
    showToast('任务已归档');
  }

  function deleteSelected() {
    if (!selectedRecord) return;
    setRecords((current) => current.filter((record) => record.id !== selectedRecord.id));
    setSelectedId('');
    showToast('任务已删除');
  }

  function selectRecord(record: ResearchRecord) {
    setSelectedId(record.id);
    setActiveView('home');
    setContextOpen(false);
  }

  function togglePreference(key: keyof WorkspacePreferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function exportRecords() {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), records }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'research-workbench-backup.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast('已导出本地任务数据');
  }

  const currentWorkspaceLabel = activeView === 'projects' ? '项目' : activeView === 'library' ? '资料库' : activeView === 'settings' ? '设置' : '任务';

  return (
    <div className={`codex-app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${contextOpen ? 'context-open' : ''} ${preferences.darkMode ? '' : 'light-theme'} ${preferences.compactTasks ? 'compact-tasks' : ''}`}>
      <WorkspaceSidebar
        activeFilter={activeFilter}
        activeView={activeView}
        filterMenuOpen={filterMenuOpen}
        onFilterChange={(filter) => { setActiveFilter(filter); setFilterMenuOpen(false); }}
        onFilterMenuToggle={() => setFilterMenuOpen((open) => !open)}
        onNewTask={openNewTask}
        onQueryChange={setQuery}
        onSelectRecord={selectRecord}
        onSetActiveView={(view) => { setActiveView(view); if (view !== 'home') setSelectedId(''); }}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        query={query}
        records={matchingRecords}
        selectedId={selectedId}
      />

      <main className="workspace-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-sidebar-button" type="button" aria-label="切换任务侧栏" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>
              {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <button className="workspace-switcher" type="button" onClick={() => setActiveView('home')}>
              <span className="workspace-switcher-mark"><Atom size={14} /></span>
              <span className="workspace-switcher-copy"><strong>Research Lab</strong><small>本地工作区</small></span>
              <ChevronDown size={14} />
            </button>
            <ChevronRight className="topbar-chevron" size={14} />
            <span className="topbar-current">{selectedRecord?.title ?? currentWorkspaceLabel}</span>
          </div>
          <div className="topbar-right">
            <button className="mode-pill" type="button" onClick={() => showToast('当前使用本地研究工作区')}><span className="live-dot" /> 本地模式 <ChevronDown size={12} /></button>
            <button className="icon-button topbar-context-button" type="button" aria-label={contextOpen ? '隐藏任务上下文' : '显示任务上下文'} onClick={() => setContextOpen((open) => !open)}>
              <PanelRight size={17} />
            </button>
            <button className="icon-button topbar-help" type="button" aria-label="帮助" onClick={() => showToast('研究工作区已准备就绪')}><CircleHelp size={17} /></button>
            <button className="icon-button topbar-notification" type="button" aria-label="通知" onClick={() => showToast('暂无新通知')}><Bell size={17} /></button>
            <div className="topbar-divider" />
            <button className="profile-button" type="button" aria-label="打开账户菜单"><span className="avatar small">研</span><ChevronDown size={13} /></button>
          </div>
        </header>

        <div className="main-scroll">
          {activeView === 'settings' ? (
            <SettingsView compactTasks={preferences.compactTasks} darkMode={preferences.darkMode} onExport={exportRecords} onToggleCompactTasks={() => togglePreference('compactTasks')} onToggleDarkMode={() => togglePreference('darkMode')} />
          ) : activeView === 'home' ? (
            <TaskThread
              composerRef={composerRef}
              composerValue={composerValue}
              onComposerChange={setComposerValue}
              onComposerKeyDown={handleComposerKeyDown}
              onPrompt={focusComposer}
              onShowToast={showToast}
              onSubmit={submitComposer}
              record={selectedRecord}
            />
          ) : (
            <WorkspaceBrowser
              activeFilter={activeFilter}
              filterMenuOpen={filterMenuOpen}
              onFilterChange={(filter) => { setActiveFilter(filter); setFilterMenuOpen(false); }}
              onFilterMenuToggle={() => setFilterMenuOpen((open) => !open)}
              onSelectRecord={selectRecord}
              onShowToast={showToast}
              records={browseRecords}
              view={activeView}
            />
          )}
        </div>
      </main>

      {contextOpen && activeView !== 'settings' && (
        <ContextPanel
          onArchive={archiveSelected}
          onDelete={deleteSelected}
          onStatusChange={(status) => selectedRecord && updateRecord(selectedRecord.id, { status })}
          onToggle={() => setContextOpen(false)}
          record={selectedRecord}
        />
      )}

      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </div>
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

interface WorkspaceSidebarProps {
  activeFilter: FilterId;
  activeView: ViewId;
  filterMenuOpen: boolean;
  onFilterChange: (filter: FilterId) => void;
  onFilterMenuToggle: () => void;
  onNewTask: () => void;
  onQueryChange: (value: string) => void;
  onSelectRecord: (record: ResearchRecord) => void;
  onSetActiveView: (view: ViewId) => void;
  onToggleCollapse: () => void;
  query: string;
  records: ResearchRecord[];
  selectedId: string;
}

function WorkspaceSidebar({
  activeFilter,
  activeView,
  filterMenuOpen,
  onFilterChange,
  onFilterMenuToggle,
  onNewTask,
  onQueryChange,
  onSelectRecord,
  onSetActiveView,
  onToggleCollapse,
  query,
  records,
  selectedId,
}: WorkspaceSidebarProps) {
  const today = new Date();
  const todayRecords = records.filter((record) => sameDay(record.updatedAt, today));
  const earlierRecords = records.filter((record) => !sameDay(record.updatedAt, today));

  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-scroll">
        <div className="sidebar-brand-row">
          <div className="sidebar-brand-mark"><Atom size={16} strokeWidth={2.3} /></div>
          <div className="sidebar-brand-copy"><strong>Research</strong><span>Workbench</span></div>
          <button className="icon-button sidebar-collapse-button" type="button" aria-label="收起任务侧栏" onClick={onToggleCollapse}><PanelLeftClose size={16} /></button>
        </div>

        <button className="new-task-button" type="button" onClick={onNewTask}>
          <SquarePen size={16} />
          <span>新建任务</span>
          <kbd><Command size={10} /> K</kbd>
        </button>

        <label className="sidebar-search">
          <Search size={15} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索任务" aria-label="搜索任务" />
          {query ? <button type="button" aria-label="清除搜索" onClick={() => onQueryChange('')}><X size={13} /></button> : <kbd>/</kbd>}
        </label>

        <div className="sidebar-nav-label">工作区</div>
        <nav className="sidebar-nav" aria-label="工作区导航">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button className={`sidebar-nav-item ${activeView === item.id ? 'active' : ''}`} key={item.id} type="button" onClick={() => onSetActiveView(item.id)}>
                <Icon size={16} />
                <span>{item.label}</span>
                {item.id === 'home' && <em>{records.length}</em>}
              </button>
            );
          })}
        </nav>

        <div className="task-history-header">
          <span>最近任务</span>
          <div className="task-history-actions">
            <button className={`history-filter-button ${activeFilter !== 'all' ? 'active' : ''}`} type="button" aria-label="筛选任务" onClick={onFilterMenuToggle}><ListFilter size={14} /></button>
            <button className="history-filter-button" type="button" aria-label="刷新任务列表" onClick={() => onQueryChange('')}><Ellipsis size={15} /></button>
          </div>
          {filterMenuOpen && (
            <div className="sidebar-filter-menu">
              {filters.map((filter) => (
                <button className={activeFilter === filter.id ? 'selected' : ''} type="button" key={filter.id} onClick={() => onFilterChange(filter.id)}>
                  {activeFilter === filter.id ? <Check size={13} /> : <span />}
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="task-history-list">
          {todayRecords.length > 0 && <TaskGroup label="今天" records={todayRecords} selectedId={selectedId} onSelect={onSelectRecord} />}
          {earlierRecords.length > 0 && <TaskGroup label="更早" records={earlierRecords} selectedId={selectedId} onSelect={onSelectRecord} />}
          {records.length === 0 && <div className="sidebar-empty"><Search size={15} /><span>没有匹配的任务</span></div>}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className={`sidebar-settings ${activeView === 'settings' ? 'active' : ''}`} type="button" onClick={() => onSetActiveView('settings')}><Settings size={16} /><span>设置</span></button>
        <div className="sidebar-local-status"><span className="live-dot" /><span>本地存储</span><ShieldCheck size={13} /></div>
        <button className="account-row" type="button"><span className="avatar">研</span><span className="account-copy"><strong>研究者</strong><small>个人工作区</small></span><MoreHorizontal size={16} /></button>
      </div>
    </aside>
  );
}

function TaskGroup({ label, records, selectedId, onSelect }: { label: string; records: ResearchRecord[]; selectedId: string; onSelect: (record: ResearchRecord) => void }) {
  return (
    <section className="task-group">
      <div className="task-group-label">{label}</div>
      {records.map((record) => <TaskHistoryRow key={record.id} record={record} selected={record.id === selectedId} onClick={() => onSelect(record)} />)}
    </section>
  );
}

function TaskHistoryRow({ record, selected, onClick }: { record: ResearchRecord; selected: boolean; onClick: () => void }) {
  const Icon = typeIcons[record.type];
  return (
    <button className={`task-history-row ${selected ? 'selected' : ''}`} type="button" onClick={onClick}>
      <span className={`task-history-icon ${typeColors[record.type]}`}><Icon size={14} /></span>
      <span className="task-history-copy"><strong>{record.title}</strong><small>{relativeTime(record.updatedAt)}</small></span>
      <span className={`status-dot ${record.status}`} />
    </button>
  );
}

interface TaskThreadProps {
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPrompt: (prompt: string) => void;
  onShowToast: (message: string) => void;
  onSubmit: (event?: FormEvent) => void;
  record?: ResearchRecord;
}

function TaskThread({ composerRef, composerValue, onComposerChange, onComposerKeyDown, onPrompt, onShowToast, onSubmit, record }: TaskThreadProps) {
  return record ? (
    <div className="thread-layout thread-layout-with-record">
      <div className="thread-content">
        <div className="thread-heading">
          <div className="thread-kicker"><MessageSquare size={13} /> 任务线程 <span>/</span> {recordTypeLabels[record.type]}</div>
          <h1>{record.title}</h1>
          <div className="thread-metadata"><span><Clock3 size={13} /> 更新于 {relativeTime(record.updatedAt)}</span><span className={`thread-status ${record.status}`}><span className="status-dot" /> {statusTone(record.status)}</span><span>{record.workspace}</span></div>
        </div>
        <div className="message-stack">
          <div className="message-row user-message-row">
            <div className="message-avatar user-message-avatar">研</div>
            <div className="message-body"><div className="message-author"><strong>你</strong><span>刚刚</span></div><p>{record.title}</p></div>
          </div>
          <div className="message-row assistant-message-row">
            <div className="message-avatar assistant-message-avatar"><Atom size={16} /></div>
            <div className="message-body">
              <div className="message-author"><strong>Research Workbench</strong><span>本地研究代理</span></div>
              <p>好的，我已经把这项研究工作整理成一个可追踪的任务。你可以继续补充目标、资料或下一步行动。</p>
              <div className="thread-task-card">
                <div className="thread-task-card-heading"><div><span className="thread-card-kicker">RESEARCH CONTEXT</span><strong>{record.title}</strong></div><button type="button" aria-label="更多任务操作" onClick={() => onShowToast('更多操作请在右侧上下文中查看')}><Ellipsis size={16} /></button></div>
                <p>{record.description}</p>
                <div className="thread-card-footer"><span className={`status-pill ${record.status}`}><span className="status-dot" />{statusTone(record.status)}</span><span>{record.tags.slice(0, 3).map((tag) => `#${tag}`).join('  ')}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="thread-next-step"><Sparkles size={14} /><span>继续在下方输入，让这个任务逐步变得清晰。</span></div>
      </div>
      <Composer composerRef={composerRef} onChange={onComposerChange} onKeyDown={onComposerKeyDown} onShowToast={onShowToast} onSubmit={onSubmit} value={composerValue} />
    </div>
  ) : (
    <div className="thread-layout thread-layout-empty">
      <div className="empty-thread-content">
        <div className="empty-thread-mark"><Atom size={22} strokeWidth={1.7} /></div>
        <div className="empty-thread-kicker">RESEARCH WORKBENCH</div>
        <h1>今天想研究什么？</h1>
        <p>从一句任务开始，像使用 Codex 一样逐步形成你的研究上下文。</p>
        <div className="starter-prompts" aria-label="快捷任务">
          {quickPrompts.map(({ icon: Icon, label, prompt }) => (
            <button type="button" key={label} onClick={() => onPrompt(prompt)}><span><Icon size={15} /></span>{label}<ChevronRight size={14} /></button>
          ))}
        </div>
      </div>
      <Composer composerRef={composerRef} onChange={onComposerChange} onKeyDown={onComposerKeyDown} onShowToast={onShowToast} onSubmit={onSubmit} value={composerValue} />
    </div>
  );
}

function Composer({ composerRef, onChange, onKeyDown, onShowToast, onSubmit, value }: { composerRef: React.RefObject<HTMLTextAreaElement | null>; onChange: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void; onShowToast: (message: string) => void; onSubmit: (event?: FormEvent) => void; value: string }) {
  return (
    <form className="composer-dock" onSubmit={onSubmit}>
      <div className="composer-box">
        <textarea ref={composerRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder="向你的研究工作区提问，或描述要创建的任务…" rows={1} aria-label="研究工作区输入框" />
        <div className="composer-toolbar">
          <div className="composer-toolbar-left">
            <button type="button" onClick={() => onShowToast('上下文添加入口已准备')}><Plus size={15} /><span>上下文</span></button>
            <button type="button" onClick={() => onShowToast('终端工具将在任务运行时接入')}><Terminal size={14} /><span>终端</span></button>
            <button type="button" onClick={() => onShowToast('选择本地文件作为研究资料')}><FolderOpen size={14} /><span>文件</span></button>
          </div>
          <div className="composer-toolbar-right">
            <span className="composer-mode"><span className="live-dot" /> 本地</span>
            <span className="composer-shortcut"><Command size={11} /> Enter</span>
            <button className="composer-send" type="submit" aria-label="创建任务" disabled={!value.trim()}><ArrowUp size={16} /></button>
          </div>
        </div>
      </div>
      <div className="composer-disclaimer">Research Workbench 会把任务和研究上下文保存在本机。</div>
    </form>
  );
}

interface WorkspaceBrowserProps {
  activeFilter: FilterId;
  filterMenuOpen: boolean;
  onFilterChange: (filter: FilterId) => void;
  onFilterMenuToggle: () => void;
  onSelectRecord: (record: ResearchRecord) => void;
  onShowToast: (message: string) => void;
  records: ResearchRecord[];
  view: ViewId;
}

function WorkspaceBrowser({ activeFilter, filterMenuOpen, onFilterChange, onFilterMenuToggle, onSelectRecord, onShowToast, records, view }: WorkspaceBrowserProps) {
  const isProjects = view === 'projects';
  return (
    <div className="browser-view">
      <div className="browser-heading">
        <div className="thread-kicker"><FolderKanban size={13} /> WORKSPACE</div>
        <h1>{isProjects ? '项目' : '资料库'}</h1>
        <p>{isProjects ? '把长期研究目标拆成可以持续推进的任务线程。' : '保存论文、数据、笔记和复盘，让每次研究都有上下文。'}</p>
      </div>
      <div className="browser-toolbar"><span>{records.length} 条记录</span><div className="browser-toolbar-actions"><button className={activeFilter !== 'all' ? 'active' : ''} type="button" onClick={onFilterMenuToggle}><ListFilter size={14} /> 筛选</button>{filterMenuOpen && <div className="browser-filter-menu">{filters.map((filter) => <button className={activeFilter === filter.id ? 'selected' : ''} type="button" key={filter.id} onClick={() => onFilterChange(filter.id)}>{activeFilter === filter.id && <Check size={13} />}{filter.label}</button>)}</div>}<button type="button" onClick={() => onShowToast('导入功能将在下一步接入')}><Upload size={14} /> 导入</button></div></div>
      <div className="browser-record-list">
        {records.length > 0 ? records.map((record) => <BrowserRecordRow key={record.id} record={record} onClick={() => onSelectRecord(record)} />) : <div className="browser-empty"><Inbox size={20} /><strong>还没有匹配的记录</strong><span>回到任务页创建一个新的研究线程。</span></div>}
      </div>
    </div>
  );
}

function BrowserRecordRow({ record, onClick }: { record: ResearchRecord; onClick: () => void }) {
  const Icon = typeIcons[record.type];
  return (
    <button className="browser-record-row" type="button" onClick={onClick}>
      <span className={`browser-record-icon ${typeColors[record.type]}`}><Icon size={17} /></span>
      <span className="browser-record-copy"><strong>{record.title}</strong><span>{record.description}</span><small><span className={`status-dot ${record.status}`} />{statusTone(record.status)} · {relativeTime(record.updatedAt)} · {record.tags.slice(0, 2).join('、')}</small></span>
      <ChevronRight size={16} />
    </button>
  );
}

function ContextPanel({ onArchive, onDelete, onStatusChange, onToggle, record }: { onArchive: () => void; onDelete: () => void; onStatusChange: (status: RecordStatus) => void; onToggle: () => void; record?: ResearchRecord }) {
  const Icon = record ? typeIcons[record.type] : MessageSquare;
  return (
    <aside className="context-panel">
      <div className="context-panel-header"><div><span className="context-kicker">TASK CONTEXT</span><h2>任务上下文</h2></div><button className="icon-button" type="button" aria-label="隐藏任务上下文" onClick={onToggle}><PanelRight size={16} /></button></div>
      {record ? (
        <div className="context-panel-scroll">
          <div className="context-summary"><div className={`context-record-icon ${typeColors[record.type]}`}><Icon size={18} /></div><span className="context-type">{recordTypeLabels[record.type]}</span><h3>{record.title}</h3><p>{record.description}</p><div className="context-tags">{record.tags.map((tag) => <span key={tag}><Tag size={11} />{tag}</span>)}</div></div>
          <div className="context-section"><div className="context-section-title"><span>状态</span><strong className={record.status}>{statusTone(record.status)}</strong></div><select value={record.status} onChange={(event) => onStatusChange(event.target.value as RecordStatus)} aria-label="任务状态">{statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div>
          <div className="context-section context-facts"><div><Clock3 size={14} /><span>最近更新</span><strong>{relativeTime(record.updatedAt)}</strong></div><div><FolderKanban size={14} /><span>工作区</span><strong>{record.workspace}</strong></div><div><Sparkles size={14} /><span>优先级</span><strong className={`priority-${record.priority}`}>{record.priority === 'high' ? '高' : record.priority === 'medium' ? '中' : '低'}</strong></div></div>
          <div className="context-section context-actions"><button type="button" onClick={onArchive}><Archive size={14} /> 归档</button><button className="danger" type="button" onClick={onDelete}><Trash2 size={14} /> 删除</button></div>
        </div>
      ) : (
        <div className="context-panel-empty"><div><PanelRight size={18} /></div><strong>打开一个任务</strong><span>选择左侧任务后，这里会显示它的研究上下文。</span></div>
      )}
      <div className="context-panel-footer"><span><ShieldCheck size={13} /> 内容保存在本机</span><small>v1.1.0</small></div>
    </aside>
  );
}

function SettingsView({ compactTasks, darkMode, onExport, onToggleCompactTasks, onToggleDarkMode }: { compactTasks: boolean; darkMode: boolean; onExport: () => void; onToggleCompactTasks: () => void; onToggleDarkMode: () => void }) {
  return (
    <div className="settings-view">
      <div className="browser-heading"><div className="thread-kicker"><Settings size={13} /> WORKSPACE SETTINGS</div><h1>设置</h1><p>调整本地研究工作区的外观和数据行为。</p></div>
      <div className="settings-card"><div className="settings-card-heading"><div><h2>外观</h2><p>当前界面使用接近 Codex 的任务布局。</p></div><div className="theme-preview"><span /><span /><span /></div></div><SettingRow label="深色模式" description="降低长时间研究时的视觉干扰" control={<button className={`toggle ${darkMode ? 'on' : ''}`} type="button" role="switch" aria-checked={darkMode} aria-label="深色模式" onClick={onToggleDarkMode}><span /></button>} /><SettingRow label="紧凑任务列表" description="让左侧同时显示更多最近任务" control={<button className={`toggle ${compactTasks ? 'on' : ''}`} type="button" role="switch" aria-checked={compactTasks} aria-label="紧凑任务列表" onClick={onToggleCompactTasks}><span /></button>} /></div>
      <div className="settings-card"><div className="settings-card-heading"><div><h2>数据</h2><p>所有记录默认保存在当前 Windows 用户的本地存储中。</p></div><ShieldCheck size={20} className="settings-muted-icon" /></div><SettingRow label="自动保存" description="每次修改后自动写入本地存储" control={<span className="setting-chip"><Check size={13} /> 已启用</span>} /><SettingRow label="导入 / 导出" description="下载一份当前任务和研究上下文的 JSON 备份" control={<button className="small-action" type="button" onClick={onExport}><Upload size={13} /> 导出</button>} /></div>
    </div>
  );
}

function SettingRow({ label, description, control }: { label: string; description: string; control: React.ReactNode }) {
  return <div className="setting-row"><div><strong>{label}</strong><span>{description}</span></div>{control}</div>;
}

export default App;
