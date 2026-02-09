import { Modal, Text, Badge, Stack, Group, Card, Box } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import { statusColors } from '../theme';
import type { M365Service } from '../api/client';
import { getTimeAgo } from '../utils/time';

type M365Issue = M365Service['issues'][number];

interface M365IncidentModalProps {
  service: M365Service | null;
  onClose: () => void;
}

const severityColors: Record<string, string> = {
  critical: '#e03131',
  high: '#e8590c',
  warning: '#fab005',
  informational: '#1e88e5',
};

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function IssueCard({ issue }: { issue: M365Issue }) {
  const color = severityColors[issue.severity] || severityColors.informational;
  const SeverityIcon = issue.severity === 'critical' ? IconAlertCircle : IconAlertTriangle;

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      style={{
        borderLeft: `3px solid ${color}`,
        background: 'var(--bg-secondary)',
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group align="flex-start" gap="sm" style={{ flex: 1 }}>
            <Box style={{ flexShrink: 0, marginTop: '0.15rem' }}>
              <SeverityIcon size={18} color={color} />
            </Box>
            <Text fw={600} style={{ fontSize: 'var(--font-md)', flex: 1 }}>
              {issue.title}
            </Text>
          </Group>
          <Badge
            size="sm"
            variant="filled"
            style={{ backgroundColor: color, flexShrink: 0 }}
          >
            {issue.severity}
          </Badge>
        </Group>

        <Group gap="lg">
          <Text size="xs" c="dimmed">
            ID: {issue.id}
          </Text>
          <Text size="xs" c="dimmed">
            Started: {formatTimestamp(issue.startTime)} ({getTimeAgo(issue.startTime)})
          </Text>
          {issue.lastUpdate && (
            <Text size="xs" c="dimmed">
              Last update: {formatTimestamp(issue.lastUpdate)}
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export function M365IncidentModal({ service, onClose }: M365IncidentModalProps) {
  const statusLabel = service?.status
    ? service.status.charAt(0).toUpperCase() + service.status.slice(1)
    : '';

  const badgeColor = service ? statusColors[service.status] : undefined;
  const issues = service?.issues || [];

  return (
    <Modal
      opened={!!service}
      onClose={onClose}
      size="xl"
      title={
        service && (
          <Group gap="md">
            <Text fw={700} style={{ fontSize: 'var(--font-lg)' }}>
              {service.name}
            </Text>
            <Badge
              size="lg"
              variant="filled"
              style={{ backgroundColor: badgeColor }}
            >
              {statusLabel}
            </Badge>
          </Group>
        )
      }
      styles={{
        header: {
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        },
        body: {
          background: 'var(--bg-primary, #1a1b1e)',
          padding: 'var(--spacing-lg, 1.5rem)',
        },
        content: {
          background: 'var(--bg-primary, #1a1b1e)',
        },
      }}
    >
      <Stack gap="md">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))
        ) : (
          <Text
            c="dimmed"
            ta="center"
            py="xl"
            style={{ fontSize: 'var(--font-md)' }}
          >
            No active issues reported
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
