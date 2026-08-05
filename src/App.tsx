import {
  Archive,
  ArrowUp,
  Atom,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Database,
  FileText,
  FolderKanban,
  FolderOpen,
  Inbox,
  LayoutDashboard,
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
  Zap,
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

const navigation: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: '概览', icon: LayoutDashboard },
  { id: 'projects', label: '项目', icon: FolderKanban },
  { id: 'library', label: '资料库', icon: Library },
  { id: 'settings', label: '设置', icon: Settings },
];

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: '全部记录' },
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
  review: BarChart3,
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
  { label: '整理今天的研究计划', prompt: '帮我整理今天的研究计划，并拆成 3 个可执行任务。' },
  { label: '记录一个研究想法', prompt: '记录一个新的研究想法：' },
  { label: '复盘最近的进展', prompt: '帮我复盘最近的研究进展，并指出下一步最重要的工作。' },
];

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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，研究者';
  if (hour < 12) return '早上好，研究者';
  if (hour < 18) return '下午好，研究者';
  return '晚上好，研究者';
}

function App() {
  const [records, setRecords] = useState<ResearchRecord[]>(() => loadRecords());
  const [activeView, setActiveView] = useState<ViewId>('home');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '');
  const [composerValue, setComposerValue] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => saveRecords(records), [records]);

  useEffect(() => {
    if (!selectedId || !records.some((record) => record.id === selectedId)) {
      setSelectedId(records[0]?.id ?? '');
    }
  }, [records, selectedId]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        composerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedRecord = records.find((record) => record.id === selectedId);

  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesView = activeView === 'projects' ? record.type === 'project' : true;
      const matchesFilter = activeFilter === 'all' || record.type === activeFilter;
      const searchable = [record.title, record.description, record.workspace, ...record.tags]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      return matchesView && matchesFilter && matchesQuery && record.status !== 'archived';
    });
  }, [activeFilter, activeView, query, records]);

  const activeCount = records.filter((record) => record.status === 'active').length;
  const inProgressCount = records.filter((record) => record.status === 'in-progress').length;
  const completedCount = records.filter((record) => record.status === 'done').length;

  const showToast = (message: string) => setToast(message);

  const focusComposer = (value = '') => {
    if (value) setComposerValue(value);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const submitComposer = (event?: FormEvent) => {
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
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submitComposer();
    }
  };

  const updateRecord = (id: string, patch: Partial<ResearchRecord>) => {
    setRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record,
      ),
    );
  };

  const archiveSelected = () => {
    if (!selectedRecord) return;
    updateRecord(selectedRecord.id, { status: 'archived' });
    showToast('记录已归档');
  };

  const deleteSelected = () => {
    if (!selectedRecord) return;
    setRecords((current) => current.filter((record) => record.id !== selectedRecord.id));
    showToast('记录已删除');
  };

  const activeViewLabel = navigation.find((item) => item.id === activeView)?.label ?? '概览';

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${!contextOpen ? 'context-closed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-row">
            <div className="brand-mark"><Atom size={18} strokeWidth={2.3} /></div>
            {!sidebarCollapsed && (
              <div className="brand-copy">
                <span>Research</span>
                <strong>Workbench</strong>
              </div>
            )}
            <button
              className="icon-button sidebar-toggle"
              type="button"
              aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          <button className="new-session-button" type="button" onClick={() => focusComposer()}>
            <SquarePen size={16} />
            {!sidebarCollapsed && <span>新建研究</span>}
            {!sidebarCollapsed && <kbd><Command size={11} /> K</kbd>}
          </button>

          <div className="sidebar-label">工作区</div>
          <nav className="primary-nav" aria-label="主导航">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                  key={item.id}
                  type="button"
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={() => setActiveView(item.id)}
                >
                  <Icon size={17} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {!sidebarCollapsed && item.id === 'home' && <span className="nav-count">{records.length}</span>}
                </button>
              );
            })}
          </nav>

          {!sidebarCollapsed && (
            <>
              <div className="sidebar-section-heading">
                <span>最近项目</span>
                <button className="mini-icon-button" type="button" aria-label="添加项目" onClick={() => focusComposer('创建一个新的研究项目：')}>
                  <Plus size={14} />
                </button>
              </div>
              <div className="project-list">
                <button className="project-item active" type="button" onClick={() => setActiveView('projects')}>
                  <span className="project-dot purple" />
                  <span>Neural Search</span>
                  <ChevronRight size={13} />
                </button>
                <button className="project-item" type="button" onClick={() => setActiveView('projects')}>
                  <span className="project-dot blue" />
                  <span>Paper Audit</span>
                  <ChevronRight size={13} />
                </button>
                <button className="project-item" type="button" onClick={() => setActiveView('projects')}>
                  <span className="project-dot green" />
                  <span>Open Research</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="sidebar-bottom">
          {!sidebarCollapsed && (
            <div className="storage-status">
              <span className="live-dot" />
              <span>本地存储</span>
              <span className="storage-status-spacer" />
              <ShieldCheck size={14} />
            </div>
          )}
          <button className="account-row" type="button" title={sidebarCollapsed ? '研究者账户' : undefined}>
            <div className="avatar">研</div>
            {!sidebarCollapsed && <><span className="account-name">研究者</span><MoreHorizontal size={16} /></>}
          </button>
        </div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="breadcrumb-group">
            <button className="mobile-sidebar-button icon-button" type="button" aria-label="切换侧栏" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>
              {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <div className="breadcrumb">
              <span>Research Lab</span>
              <ChevronRight size={13} />
              <strong>{activeViewLabel}</strong>
            </div>
            <span className="local-badge"><span className="live-dot" /> LOCAL</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="帮助"><CircleHelp size={17} /></button>
            <button className="icon-button" type="button" aria-label="通知"><Bell size={17} /></button>
            <div className="topbar-divider" />
            <button className="topbar-profile" type="button"><span className="avatar small">研</span><ChevronDown size={14} /></button>
          </div>
        </header>

        <div className="main-scroll">
          {activeView === 'settings' ? (
            <SettingsView />
          ) : (
            <Dashboard
              activeView={activeView}
              activeFilter={activeFilter}
              activeCount={activeCount}
              completedCount={completedCount}
              composerRef={composerRef}
              composerValue={composerValue}
              contextOpen={contextOpen}
              filterMenuOpen={filterMenuOpen}
              greetingText={greeting()}
              inProgressCount={inProgressCount}
              onComposerChange={setComposerValue}
              onComposerKeyDown={handleComposerKeyDown}
              onFilterChange={(filter) => { setActiveFilter(filter); setFilterMenuOpen(false); }}
              onFilterMenuToggle={() => setFilterMenuOpen((open) => !open)}
              onPrompt={focusComposer}
              onSubmit={submitComposer}
              onToggleContext={() => setContextOpen((open) => !open)}
              onQueryChange={setQuery}
              onSelectRecord={(record) => setSelectedId(record.id)}
              query={query}
              records={visibleRecords}
              selectedId={selectedId}
              onShowToast={showToast}
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

interface DashboardProps {
  activeView: ViewId;
  activeFilter: FilterId;
  activeCount: number;
  completedCount: number;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  composerValue: string;
  contextOpen: boolean;
  filterMenuOpen: boolean;
  greetingText: string;
  inProgressCount: number;
  onComposerChange: (value: string) => void;
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFilterChange: (filter: FilterId) => void;
  onFilterMenuToggle: () => void;
  onPrompt: (prompt: string) => void;
  onSubmit: (event?: FormEvent) => void;
  onToggleContext: () => void;
  onQueryChange: (value: string) => void;
  onSelectRecord: (record: ResearchRecord) => void;
  onShowToast: (message: string) => void;
  query: string;
  records: ResearchRecord[];
  selectedId: string;
}

function Dashboard({
  activeView,
  activeFilter,
  activeCount,
  completedCount,
  composerRef,
  composerValue,
  contextOpen,
  filterMenuOpen,
  greetingText,
  inProgressCount,
  onComposerChange,
  onComposerKeyDown,
  onFilterChange,
  onFilterMenuToggle,
  onPrompt,
  onSubmit,
  onToggleContext,
  onQueryChange,
  onSelectRecord,
  onShowToast,
  query,
  records,
  selectedId,
}: DashboardProps) {
  const title = activeView === 'projects' ? '研究项目' : activeView === 'library' ? '资料库' : '今天想研究什么？';
  const subtitle = activeView === 'projects'
    ? '把长期目标拆成清晰、可追踪的研究线程。'
    : activeView === 'library'
      ? '论文、笔记、数据和复盘，都在这里保持可见。'
      : '从一个问题开始，逐步形成你的研究上下文。';

  return (
    <div className="dashboard-content">
      <section className="welcome-section">
        <div className="welcome-copy">
          <div className="eyebrow"><Sparkles size={13} /> {greetingText} <span className="eyebrow-separator">/</span> RESEARCH LAB</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="welcome-actions">
          <button className="secondary-button" type="button" onClick={() => onShowToast('导入功能将在下一步接入')}><Upload size={15} /> 导入数据</button>
          <button className="secondary-button" type="button" onClick={onToggleContext}><PanelRight size={15} /> {contextOpen ? '隐藏上下文' : '显示上下文'}</button>
        </div>
      </section>

      {activeView === 'home' && (
        <>
          <section className="prompt-grid" aria-label="快捷研究动作">
            {quickPrompts.map((item, index) => (
              <button className={`prompt-card prompt-card-${index}`} key={item.label} type="button" onClick={() => onPrompt(item.prompt)}>
                <span className="prompt-icon">{index === 0 ? <Zap size={16} /> : index === 1 ? <SquarePen size={16} /> : <BarChart3 size={16} />}</span>
                <span>{item.label}</span>
                <ChevronRight size={15} />
              </button>
            ))}
          </section>

          <section className="stats-grid" aria-label="研究统计">
            <StatCard label="进行中的记录" value={activeCount + inProgressCount} detail="保持研究流动" icon={Clock3} tone="violet" />
            <StatCard label="待处理任务" value={inProgressCount} detail="需要你的注意" icon={Inbox} tone="blue" />
            <StatCard label="已完成" value={completedCount} detail="最近的积累" icon={Check} tone="green" />
          </section>
        </>
      )}

      <section className="records-section">
        <div className="section-heading-row">
          <div>
            <div className="section-kicker">WORKSPACE ACTIVITY</div>
            <h2>{activeView === 'projects' ? '项目线程' : activeView === 'library' ? '全部资料' : '最近活动'}</h2>
          </div>
          <div className="records-tools">
            <label className="search-box">
              <Search size={15} />
              <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索记录" aria-label="搜索记录" />
              {query && <button className="clear-search" type="button" onClick={() => onQueryChange('')} aria-label="清除搜索"><X size={13} /></button>}
              {!query && <kbd>/</kbd>}
            </label>
            <div className="filter-wrap">
              <button className={`filter-button ${activeFilter !== 'all' ? 'selected' : ''}`} type="button" onClick={onFilterMenuToggle}><ListFilter size={15} /> 筛选</button>
              {filterMenuOpen && (
                <div className="filter-menu">
                  {filters.map((filter) => (
                    <button className={activeFilter === filter.id ? 'selected' : ''} type="button" key={filter.id} onClick={() => onFilterChange(filter.id)}>
                      {activeFilter === filter.id ? <Check size={14} /> : <span className="filter-placeholder" />}
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="record-list">
          {records.length > 0 ? records.map((record) => (
            <RecordRow key={record.id} onClick={() => onSelectRecord(record)} record={record} selected={record.id === selectedId} />
          )) : (
            <div className="empty-state">
              <div className="empty-icon"><Search size={20} /></div>
              <strong>没有找到匹配记录</strong>
              <span>试试换一个关键词，或者创建一条新的研究记录。</span>
            </div>
          )}
        </div>
      </section>

      <Composer
        composerRef={composerRef}
        onChange={onComposerChange}
        onKeyDown={onComposerKeyDown}
        onSubmit={onSubmit}
        value={composerValue}
      />
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: LucideIcon; tone: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={16} /></div>
      <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </div>
  );
}

function RecordRow({ record, selected, onClick }: { record: ResearchRecord; selected: boolean; onClick: () => void }) {
  const Icon = typeIcons[record.type];
  return (
    <button className={`record-row ${selected ? 'selected' : ''}`} type="button" onClick={onClick}>
      <div className={`record-icon ${typeColors[record.type]}`}><Icon size={17} /></div>
      <div className="record-copy">
        <div className="record-title-row"><strong>{record.title}</strong><span className={`status-dot ${record.status}`} /></div>
        <p>{record.description}</p>
        <div className="record-tags">
          <span className="record-type-label">{recordTypeLabels[record.type]}</span>
          {record.tags.slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
      </div>
      <div className="record-meta"><span>{relativeTime(record.updatedAt)}</span><ChevronRight size={15} /></div>
    </button>
  );
}

function Composer({
  composerRef,
  onChange,
  onKeyDown,
  onSubmit,
  value,
}: {
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event?: FormEvent) => void;
  value: string;
}) {
  return (
    <form className="composer" onSubmit={onSubmit}>
      <div className="composer-glow" />
      <div className="composer-inner">
        <textarea
          ref={composerRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="向你的研究工作区提问，或描述要创建的任务…"
          rows={2}
          aria-label="研究工作区输入框"
        />
        <div className="composer-footer">
          <div className="composer-tools">
            <button type="button" className="composer-tool" title="添加研究上下文"><Plus size={15} /><span>上下文</span></button>
            <button type="button" className="composer-tool" title="打开终端"><Terminal size={15} /><span>终端</span></button>
            <button type="button" className="composer-tool" title="添加文件"><FolderOpen size={15} /><span>文件</span></button>
          </div>
          <div className="composer-send-group">
            <span className="composer-hint"><Command size={11} /> Enter</span>
            <button className="send-button" type="submit" aria-label="创建记录"><ArrowUp size={17} /></button>
          </div>
        </div>
      </div>
    </form>
  );
}

function ContextPanel({
  onArchive,
  onDelete,
  onStatusChange,
  onToggle,
  record,
}: {
  onArchive: () => void;
  onDelete: () => void;
  onStatusChange: (status: RecordStatus) => void;
  onToggle: () => void;
  record?: ResearchRecord;
}) {
  const Icon = record ? typeIcons[record.type] : MessageSquare;
  return (
    <aside className="context-panel">
      <div className="context-header"><div><span className="section-kicker">RESEARCH CONTEXT</span><h2>上下文</h2></div><button className="icon-button" type="button" onClick={onToggle} aria-label="隐藏上下文"><ChevronRight size={17} /></button></div>
      {record ? (
        <>
          <div className="selected-record-card">
            <div className={`selected-record-icon ${typeColors[record.type]}`}><Icon size={19} /></div>
            <span className="selected-type">{recordTypeLabels[record.type]}</span>
            <h3>{record.title}</h3>
            <p>{record.description}</p>
            <div className="selected-tags">{record.tags.map((tag) => <span className="tag" key={tag}><Tag size={11} /> {tag}</span>)}</div>
          </div>
          <div className="context-block">
            <div className="context-block-title"><span>状态</span><span className={`status-label ${record.status}`}>{statusLabels[record.status]}</span></div>
            <select value={record.status} onChange={(event) => onStatusChange(event.target.value as RecordStatus)} aria-label="记录状态">
              {statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </div>
          <div className="context-block">
            <div className="context-line"><Clock3 size={14} /><span>最近更新</span><strong>{relativeTime(record.updatedAt)}</strong></div>
            <div className="context-line"><FolderKanban size={14} /><span>工作区</span><strong>{record.workspace}</strong></div>
            <div className="context-line"><Zap size={14} /><span>优先级</span><strong className={`priority-${record.priority}`}>{record.priority === 'high' ? '高' : record.priority === 'medium' ? '中' : '低'}</strong></div>
          </div>
          <div className="context-actions">
            <button type="button" onClick={onArchive}><Archive size={14} /> 归档</button>
            <button type="button" className="danger" onClick={onDelete}><Trash2 size={14} /> 删除</button>
          </div>
        </>
      ) : (
        <div className="context-empty"><div className="empty-icon"><PanelRight size={19} /></div><strong>选择一条记录</strong><span>这里会显示它的研究上下文和状态。</span></div>
      )}
      <div className="context-footer"><div className="footer-security"><ShieldCheck size={14} /><span>内容保存在本机</span></div><span className="footer-version">v1.0.0</span></div>
    </aside>
  );
}

function SettingsView() {
  return (
    <div className="settings-content">
      <div className="settings-heading"><div className="eyebrow"><Settings size={13} /> WORKSPACE SETTINGS</div><h1>设置</h1><p>调整你的本地研究工作区。</p></div>
      <div className="settings-card">
        <div className="settings-card-heading"><div><h2>外观</h2><p>Codex 风格的深色工作台布局已启用。</p></div><div className="theme-preview"><span /><span /><span /></div></div>
        <SettingRow label="深色模式" description="降低长时间研究时的视觉干扰" control={<span className="toggle on"><span /></span>} />
        <SettingRow label="紧凑记录列表" description="让更多研究上下文同时出现在屏幕上" control={<span className="toggle"><span /></span>} />
      </div>
      <div className="settings-card">
        <div className="settings-card-heading"><div><h2>数据</h2><p>所有记录默认保存在当前 Windows 用户的本地存储中。</p></div><ShieldCheck size={20} className="settings-muted-icon" /></div>
        <SettingRow label="自动保存" description="每次修改后自动写入 localStorage" control={<span className="setting-chip"><Check size={13} /> 已启用</span>} />
        <SettingRow label="导入 / 导出" description="在数据管理中备份或恢复 JSON 数据" control={<button className="small-action" type="button"><Upload size={13} /> 管理</button>} />
      </div>
    </div>
  );
}

function SettingRow({ label, description, control }: { label: string; description: string; control: React.ReactNode }) {
  return <div className="setting-row"><div><strong>{label}</strong><span>{description}</span></div>{control}</div>;
}

export default App;
