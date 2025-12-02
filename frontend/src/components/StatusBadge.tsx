import { Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import { statusColors } from '../theme';

interface StatusBadgeProps {
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const statusLabels = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  unknown: 'Unknown',
};

const statusIcons = {
  operational: '✓',
  degraded: '⚠',
  outage: '✗',
  unknown: '?',
};

const iconAnimations = {
  operational: {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: { type: 'spring' as const, stiffness: 500, damping: 15 },
  },
  degraded: {
    initial: undefined,
    animate: {
      scale: [1, 1.1, 1],
      rotate: [0, -5, 5, 0],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
  outage: {
    initial: undefined,
    animate: {
      scale: [1, 1.2, 1],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
  unknown: {
    initial: undefined,
    animate: {
      opacity: [0.6, 1, 0.6],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const animation = iconAnimations[status];

  return (
    <Badge
      color={statusColors[status]}
      size={size}
      radius="sm"
      variant="filled"
      style={{
        backgroundColor: statusColors[status],
        color: '#fff',
        fontWeight: 600,
      }}
    >
      <motion.span
        key={status}
        initial={animation.initial ?? false}
        animate={animation.animate}
        transition={animation.transition}
        style={{ display: 'inline-block' }}
      >
        {statusIcons[status]}
      </motion.span>{' '}
      {statusLabels[status]}
    </Badge>
  );
}
