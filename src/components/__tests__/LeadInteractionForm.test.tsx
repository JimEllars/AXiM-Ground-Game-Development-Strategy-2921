import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LeadInteractionForm from '../LeadInteractionForm';
import { settingsAPI } from '@/services/api';

vi.mock('@/services/api', () => ({
  settingsAPI: {
    getSettings: vi.fn(),
  },
  interactionsAPI: {
    create: vi.fn(),
  },
}));

vi.mock('@/db', () => ({
  db: {
    settings: {
      put: vi.fn(),
      get: vi.fn(),
    },
    interactions: {
      add: vi.fn(),
    },
  },
}));

describe('LeadInteractionForm Survey Rendering', () => {
  let queryClient: QueryClient;
  const mockLead = {
    id: 'lead-123',
    firstName: 'John',
    lastName: 'Doe',
    streetAddress: '123 Main St',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it('should render multiple_choice, text, and boolean survey questions', async () => {
    const mockSurveys = [
      {
        id: 'survey-1',
        name: 'Door Knock Script',
        questions: [
          { id: 'q1', type: 'text', text: 'What is your main concern?' },
          { id: 'q2', type: 'multiple_choice', text: 'Current provider?', options: ['A', 'B', 'C'] },
          { id: 'q3', type: 'boolean', text: 'Are you the homeowner?' },
        ],
      },
    ];

    (settingsAPI.getSettings as any).mockResolvedValue({
      data: { surveys: mockSurveys, dispositions: [{ name: 'Contacted', require_notes: false }] },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LeadInteractionForm lead={mockLead} onSubmit={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Door Knock Script')).toBeInTheDocument();
  });
});