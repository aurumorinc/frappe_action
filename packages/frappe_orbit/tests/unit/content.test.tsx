import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import OrbitCoPilot from '../../content';

// Mock chrome API
(globalThis as any).chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
};

describe('OrbitCoPilot UI', () => {
  it('renders the initial todo list', () => {
    render(<OrbitCoPilot />);
    
    expect(screen.getByText('Orbit Co-Pilot')).toBeInTheDocument();
    expect(screen.getByText('0/2 tasks completed')).toBeInTheDocument();
    expect(screen.getByText('0% completed')).toBeInTheDocument();
    
    expect(screen.getByText('Enrich Lead Data')).toBeInTheDocument();
    expect(screen.getByText('Verify Contact Info')).toBeInTheDocument();
  });

  it('drills down into sub-tasks when a todo is clicked', async () => {
    render(<OrbitCoPilot />);
    
    const todoItem = screen.getByText('Enrich Lead Data');
    fireEvent.click(todoItem);
    
    // Should show sub-tasks
    expect(screen.getByText('Sub-tasks for: Enrich Lead Data')).toBeInTheDocument();
    expect(screen.getByText('Find Email Address')).toBeInTheDocument();
    expect(screen.getByText('Verify LinkedIn Profile')).toBeInTheDocument();
    
    // Should show "Mark completed" button
    expect(screen.getByText('Mark completed')).toBeInTheDocument();
  });

  it('returns to the main list when "Back to Tasks" is clicked', async () => {
    render(<OrbitCoPilot />);
    
    fireEvent.click(screen.getByText('Enrich Lead Data'));
    expect(screen.getByText('Sub-tasks for: Enrich Lead Data')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Back to Tasks'));
    expect(screen.queryByText('Sub-tasks for: Enrich Lead Data')).not.toBeInTheDocument();
    expect(screen.getByText('Enrich Lead Data')).toBeInTheDocument();
  });

  it('clears active todo when "Mark completed" is clicked', async () => {
    render(<OrbitCoPilot />);
    
    fireEvent.click(screen.getByText('Enrich Lead Data'));
    expect(screen.getByText('Sub-tasks for: Enrich Lead Data')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Mark completed'));
    
    // Should return to main list
    expect(screen.queryByText('Sub-tasks for: Enrich Lead Data')).not.toBeInTheDocument();
    expect(screen.getByText('Enrich Lead Data')).toBeInTheDocument();
  });
});
