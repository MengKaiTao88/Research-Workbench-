export type RecordType = 'project' | 'task' | 'note' | 'data' | 'file' | 'review';

export type RecordStatus = 'active' | 'in-progress' | 'done' | 'archived';

export type Priority = 'low' | 'medium' | 'high';

export interface ResearchRecord {
  id: string;
  title: string;
  description: string;
  type: RecordType;
  status: RecordStatus;
  priority: Priority;
  tags: string[];
  updatedAt: string;
  createdAt: string;
  workspace: string;
}

export const recordTypeLabels: Record<RecordType, string> = {
  project: '项目',
  task: '任务',
  note: '笔记',
  data: '数据',
  file: '文件',
  review: '复盘',
};

export const statusLabels: Record<RecordStatus, string> = {
  active: '进行中',
  'in-progress': '处理中',
  done: '已完成',
  archived: '已归档',
};

export const statusOptions: RecordStatus[] = ['active', 'in-progress', 'done', 'archived'];

