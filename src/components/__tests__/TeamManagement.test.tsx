import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamManagement from '../TeamManagement';
import { usersAPI, teamsAPI } from '@/services/api';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@/services/api', () => ({
  usersAPI: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
  teamsAPI: {
    getTeams: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    assignUser: vi.fn(),
  },
}));

// Mock SafeIcon to return a simple span we can test against
vi.mock('@/common/SafeIcon', () => ({
  default: ({ icon: Icon, ...props }: any) => <span data-testid="icon" {...props} />
}));

describe('TeamManagement Component', () => {
  const mockUsers = [
    {
      id: '1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'REP',
      isActive: true,
      createdAt: '2023-01-01',
      teamId: null
    },
    {
      id: '2',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'MANAGER',
      isActive: true,
      createdAt: '2023-01-02',
      teamId: 'team1'
    }
  ];

  const mockTeams = [
    {
      id: 'team1',
      organizationId: 'org1',
      name: 'Alpha Team',
      description: 'The alpha team',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      memberCount: 1
    }
  ];

  beforeEach(() => {
    (usersAPI.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockUsers });
    (teamsAPI.getTeams as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockTeams });
    vi.clearAllMocks();
  });

  it('renders users and teams tabs', async () => {
    await act(async () => {
      render(<TeamManagement />);
    });

    expect(screen.getByText('Organization Management')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Teams' })).toBeInTheDocument();
  });

  it('loads and displays users', async () => {
    await act(async () => {
      render(<TeamManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('loads and displays teams when tab is switched', async () => {
    await act(async () => {
      render(<TeamManagement />);
    });

    const teamsTab = screen.getByRole('tab', { name: 'Teams' });
    fireEvent.click(teamsTab);

    await waitFor(() => {
      expect(screen.getByText('Alpha Team')).toBeInTheDocument();
      expect(screen.getByText('The alpha team')).toBeInTheDocument();
    });
  });

  it('opens create team dialog', async () => {
    await act(async () => {
      render(<TeamManagement />);
    });

    const teamsTab = screen.getByRole('tab', { name: 'Teams' });
    fireEvent.click(teamsTab);

    await waitFor(() => {
        expect(screen.getByText('Create Team')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: 'Create Team' });
    fireEvent.click(createBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
  });

  it('calls create team API on submit', async () => {
    (teamsAPI.createTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: 'newTeam', name: 'New Team', description: 'Desc' }
    });

    await act(async () => {
      render(<TeamManagement />);
    });

    const teamsTab = screen.getByRole('tab', { name: 'Teams' });
    fireEvent.click(teamsTab);

    await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Create Team' }));
    });

    fireEvent.change(screen.getByLabelText('Team Name'), { target: { value: 'New Team' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Desc' } });

    const dialog = screen.getByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: 'Create' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
        expect(teamsAPI.createTeam).toHaveBeenCalledWith({
            name: 'New Team',
            description: 'Desc'
        });
    });
  });
});
