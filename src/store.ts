import type { ResearchRecord } from './types';

const storageKey = 'research-workbench.codex-ui.records.v1';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

export const seedRecords: ResearchRecord[] = [
  {
    id: 'project-neural-search',
    title: 'Neural Search · 语义检索研究',
    description: '整理语义检索方向的关键论文，验证一个轻量级 reranker 实验方案。',
    type: 'project',
    status: 'active',
    priority: 'high',
    tags: ['文献调研', '实验', 'NLP'],
    updatedAt: hoursAgo(1),
    createdAt: hoursAgo(72),
    workspace: 'Research Lab',
  },
  {
    id: 'task-paper-review',
    title: '阅读并标注 ColBERTv2 论文',
    description: '提炼论文的训练目标、负采样策略和对比实验，记录可以复现的细节。',
    type: 'task',
    status: 'in-progress',
    priority: 'medium',
    tags: ['阅读', '重点'],
    updatedAt: hoursAgo(3),
    createdAt: hoursAgo(28),
    workspace: 'Research Lab',
  },
  {
    id: 'note-experiment',
    title: '实验备忘：先固定数据切分',
    description: '在比较两个 reranker 之前固定 train/dev/test 切分，并保存随机种子。',
    type: 'note',
    status: 'active',
    priority: 'low',
    tags: ['实验设计'],
    updatedAt: hoursAgo(7),
    createdAt: hoursAgo(40),
    workspace: 'Research Lab',
  },
  {
    id: 'data-msmarco',
    title: 'MS MARCO · passage 采样集',
    description: '实验使用的本地数据记录，包含下载来源、版本和预处理说明。',
    type: 'data',
    status: 'done',
    priority: 'medium',
    tags: ['数据集', '已准备'],
    updatedAt: hoursAgo(18),
    createdAt: hoursAgo(90),
    workspace: 'Research Lab',
  },
  {
    id: 'review-weekly',
    title: '本周研究复盘',
    description: '已经完成两篇论文精读，下一步聚焦小规模 ablation 和误差分析。',
    type: 'review',
    status: 'done',
    priority: 'low',
    tags: ['周报'],
    updatedAt: hoursAgo(24),
    createdAt: hoursAgo(24),
    workspace: 'Personal',
  },
];

export function loadRecords(): ResearchRecord[] {
  if (typeof window === 'undefined') return seedRecords;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return seedRecords;
    const parsed = JSON.parse(raw) as ResearchRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedRecords;
  } catch {
    return seedRecords;
  }
}

export function saveRecords(records: ResearchRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(records));
}

export function createRecord(title: string, description = title): ResearchRecord {
  const now = new Date().toISOString();
  return {
    id: `record-${Date.now()}`,
    title,
    description,
    type: 'task',
    status: 'active',
    priority: 'medium',
    tags: ['新建'],
    updatedAt: now,
    createdAt: now,
    workspace: 'Research Lab',
  };
}

