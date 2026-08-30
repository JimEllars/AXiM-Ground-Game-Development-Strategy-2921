import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RepDailyMilestones from '../RepDailyMilestones';
import { QueryClient, QueryClientProvider } from 'react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db';

vi.mock('../../services/api', () => ({
    repsAPI: {
        getStats: vi.fn().mockResolvedValue({
            data: {
                outcomeBreakdown: [{ outcome: 'Qualified', count: 1 }]
            }
        })
    }
}));

vi.mock('../../db', () => ({
    db: {
        settings: {
            get: vi.fn().mockResolvedValue({ data: [] }),
            put: vi.fn().mockResolvedValue(true)
        }
    }
}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
});

describe('RepDailyMilestones', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('renders and unlocks milestones based on interactions', async () => {
        await act(async () => {
            render(
                <QueryClientProvider client={queryClient}>
                    <RepDailyMilestones todayInteractions={15} todayCompletionRate={70} />
                </QueryClientProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Door Opener')).toBeInTheDocument();
        });

        // 15 knocks -> Door Opener unlocked
        // 70% rate -> Pace Setter unlocked
        // Qualified -> First Strike unlocked
        expect(db.settings.put).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'milestones',
                data: expect.arrayContaining(['door_opener', 'first_strike', 'pace_setter'])
            })
        );
    });

    it('does not unlock milestones if criteria is not met', async () => {
        await act(async () => {
            render(
                <QueryClientProvider client={queryClient}>
                    <RepDailyMilestones todayInteractions={0} todayCompletionRate={0} />
                </QueryClientProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Half-Century')).toBeInTheDocument();
        });

        // Should only unlock First Strike due to mocked Qualified lead (1)
        expect(db.settings.put).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'milestones',
                data: ['first_strike']
            })
        );
    });
});
