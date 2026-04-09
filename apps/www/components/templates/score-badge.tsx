import { Badge } from '@/components/ui';
import type { BadgeProps } from '@/components/ui/badge/types';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const TIERS = [
  { min: 0.85, intent: 'success', label: 'Runs great' },
  { min: 0.7, intent: 'info', label: 'Runs well' },
  { min: 0.5, intent: 'warning', label: 'Runs ok' },
  { min: 0.3, intent: 'orange', label: 'Runs poorly' },
  { min: 0, intent: 'fail', label: 'Barely runs' },
] as const;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ScoreBadge: React.FC<{ score: number; size?: BadgeProps['size'] }> = ({
  score,
  size = 'sm',
}) => {
  const tier = TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];

  return (
    <Badge size={size} variant="outline" intent={tier.intent}>
      {tier.label}
    </Badge>
  );
};

export default ScoreBadge;
