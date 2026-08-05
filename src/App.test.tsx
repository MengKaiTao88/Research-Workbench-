import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('Research Workbench', () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the Codex-style research workspace', () => {
    render(<App />);
    expect(screen.getByText('今天想研究什么？')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('向你的研究工作区提问，或描述要创建的任务…')).toBeInTheDocument();
    expect(screen.getAllByText('Neural Search · 语义检索研究').length).toBeGreaterThan(0);
  });

  it('creates a local record from the composer', () => {
    render(<App />);
    const composer = screen.getByPlaceholderText('向你的研究工作区提问，或描述要创建的任务…');
    fireEvent.change(composer, { target: { value: '整理一份新的文献综述' } });
    fireEvent.keyDown(composer, { key: 'Enter', ctrlKey: true });

    expect(screen.getAllByText('整理一份新的文献综述').length).toBeGreaterThan(0);
    expect(screen.getByText('已添加到研究工作区')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('research-workbench.codex-ui.records.v1') ?? '[]')).toHaveLength(6);
  });

  it('makes settings controls interactive and persistent', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    const darkMode = screen.getByRole('switch', { name: '深色模式' });
    const compactTasks = screen.getByRole('switch', { name: '紧凑任务列表' });
    expect(darkMode).toHaveAttribute('aria-checked', 'true');
    expect(compactTasks).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(darkMode);
    fireEvent.click(compactTasks);

    expect(darkMode).toHaveAttribute('aria-checked', 'false');
    expect(compactTasks).toHaveAttribute('aria-checked', 'true');
    expect(JSON.parse(window.localStorage.getItem('research-workbench.codex-ui.preferences.v1') ?? '{}')).toEqual({
      darkMode: false,
      compactTasks: true,
    });
  });
});
