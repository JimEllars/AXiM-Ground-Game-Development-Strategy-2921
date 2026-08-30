import React, { useEffect, useState } from 'react';
import {
    Accordion, AccordionSummary, AccordionDetails,
    Typography, Box, Paper, Avatar, Grow, Tooltip
} from '@mui/material';
import { FiChevronDown, FiStar, FiTrendingUp, FiTarget, FiZap } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { db } from '../db';
import { useQuery } from 'react-query';
import { repsAPI } from '../services/api';

interface MilestoneProps {
    todayInteractions: number;
    todayCompletionRate: number;
}

const milestonesConfig = [
    { id: 'door_opener', name: 'Door Opener', desc: '10 doors knocked', icon: FiTarget, req: 10, check: (i: number, r: number, s: number) => i >= 10 },
    { id: 'first_strike', name: 'First Strike', desc: '1st appointment set', icon: FiZap, req: 1, check: (i: number, r: number, s: number) => s >= 1 },
    { id: 'half_century', name: 'Half-Century', desc: '50 doors knocked', icon: FiTrendingUp, req: 50, check: (i: number, r: number, s: number) => i >= 50 },
    { id: 'pace_setter', name: 'Pace Setter', desc: '>60% route completion', icon: FiStar, req: 60, check: (i: number, r: number, s: number) => r > 60 }
];

const RepDailyMilestones: React.FC<MilestoneProps> = ({ todayInteractions, todayCompletionRate }) => {
    const [unlocked, setUnlocked] = useState<string[]>([]);
    const [justUnlocked, setJustUnlocked] = useState<string | null>(null);

    // Get today's qualified leads (First Strike)
    const today = new Date().toISOString().split('T')[0];
    const { data: repStatsData } = useQuery(
        ['repStats', today],
        () => repsAPI.getStats({ startDate: today, endDate: today }).then(res => res.data)
    );

    const outcomes = repStatsData?.outcomeBreakdown || [];
    const soldOrQualified = outcomes.find((o: any) => o.outcome === 'Sold' || o.outcome === 'Qualified')?.count || 0;

    useEffect(() => {
        // Load offline cached unlocked milestones
        db.settings.get('milestones').then(doc => {
            if (doc && doc.data) {
                setUnlocked(doc.data);
            }
        });
    }, []);

    useEffect(() => {
        // Evaluate logic
        const newUnlocked = [...unlocked];
        let changed = false;

        milestonesConfig.forEach(m => {
            if (!newUnlocked.includes(m.id) && m.check(todayInteractions, todayCompletionRate, soldOrQualified)) {
                newUnlocked.push(m.id);
                changed = true;
                setJustUnlocked(m.id);
                setTimeout(() => setJustUnlocked(null), 3000); // clear glow after 3s
            }
        });

        if (changed) {
            setUnlocked(newUnlocked);
            db.settings.put({ id: 'milestones', data: newUnlocked });
        }
    }, [todayInteractions, todayCompletionRate, soldOrQualified, unlocked]);

    return (
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<SafeIcon icon={FiChevronDown} />}>
                <Typography variant="h6">Daily Milestones</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {milestonesConfig.map(m => {
                        const isUnlocked = unlocked.includes(m.id);
                        const isJustUnlocked = justUnlocked === m.id;

                        return (
                            <Tooltip key={m.id} title={`${m.desc} ${isUnlocked ? '(Unlocked!)' : '(Locked)'}`}>
                                <Paper
                                    elevation={isUnlocked ? 3 : 1}
                                    sx={{
                                        p: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        opacity: isUnlocked ? 1 : 0.5,
                                        filter: isUnlocked ? 'none' : 'grayscale(100%)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: isJustUnlocked ? '0 0 20px rgba(255, 215, 0, 0.8)' : undefined,
                                        transform: isJustUnlocked ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                >
                                    <Grow in={true} timeout={1000}>
                                        <Avatar sx={{
                                            bgcolor: isUnlocked ? 'primary.main' : 'grey.300',
                                            width: 56,
                                            height: 56,
                                            mb: 1
                                        }}>
                                            <SafeIcon icon={m.icon} size={24} />
                                        </Avatar>
                                    </Grow>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        {m.name}
                                    </Typography>
                                </Paper>
                            </Tooltip>
                        );
                    })}
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};

export default RepDailyMilestones;
