import { Lead } from '../types';

export const calculateLeadPriorityScore = (lead: any): number => {
  let score = 50; // Base score

  // Outcome history
  if (lead.lastInteraction) {
    const outcome = lead.lastInteraction.outcome?.toLowerCase();
    if (['interested', 'hot lead', 'follow-up required', 'follow up', 'contacted'].includes(outcome)) {
      score += 20;
    } else if (['completed', 'sold', 'sale', 'appointment set'].includes(outcome)) {
      score -= 30; // Already converted
    } else if (['not interested', 'do not knock'].includes(outcome)) {
      score -= 40; // Don't waste time
    } else if (['not home'].includes(outcome)) {
      score += 5; // Worth a second try
    }
  } else {
     // Uncontacted
     score += 10;
  }

  // Commercial uniform / facility services viability flags
  if (lead.commercial_uniform_fit) {
    const fit = lead.commercial_uniform_fit.toLowerCase();
    if (fit === 'high' || fit === 'excellent') score += 20;
    else if (fit === 'medium' || fit === 'good') score += 10;
    else if (fit === 'low' || fit === 'poor') score -= 10;
  }

  if (lead.credit_tier) {
    const tier = lead.credit_tier.toLowerCase();
    if (tier === 'a' || tier === 'excellent') score += 15;
    else if (tier === 'b' || tier === 'good') score += 5;
    else if (tier === 'c' || tier === 'fair') score -= 5;
    else if (tier === 'd' || tier === 'poor') score -= 15;
  }

  // Demographics / income segment from AXiM Insights (simulated through properties if present)
  if (lead.property_value_est) {
      // Assuming a string like '$500k+' or a number
      const valString = String(lead.property_value_est).replace(/[^0-9]/g, '');
      const valNum = parseInt(valString, 10);
      if (!isNaN(valNum)) {
         if (valNum > 500) score += 15; // > $500k
         else if (valNum > 250) score += 5;
      } else {
         if (String(lead.property_value_est).includes('+')) score += 10;
      }
  }

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score));
};

export const getPriorityBadgeProps = (score: number) => {
  if (score >= 75) return { label: 'High Priority', color: 'error' as const };
  if (score >= 40) return { label: 'Medium Priority', color: 'warning' as const };
  return { label: 'Standard', color: 'default' as const };
};
