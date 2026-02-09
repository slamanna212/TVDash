import { Modal, Text, Badge, Stack, Group, Skeleton, Card, Box, Anchor, Timeline } from '@mantine/core';
import { IconExternalLink, IconAlertTriangle, IconAlertCircle, IconEye, IconChecks } from '@tabler/icons-react';
import { useServiceIncidents } from '../hooks/useServiceIncidents';
import { statusColors } from '../theme';
import type { ServiceIncident } from '../api/client';

interface ServiceIncidentModalProps {
  service: {
    id: number;
    name: string;
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    isMaintenance?: boolean;
  } | null;
  onClose: () => void;
}

const impactColors: Record<string, string> = {
  critical: '#e03131',
  major: '#e8590c',
  minor: '#fab005',
  maintenance: '#1971c2',
  none: '#495057',
};

const statusIcons: Record<string, typeof IconAlertCircle> = {
  investigating: IconAlertCircle,
  identified: IconAlertTriangle,
  monitoring: IconEye,
  resolved: IconChecks,
};

function formatTime(timestamp: string): string {
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

function IncidentCard({ incident }: { incident: ServiceIncident }) {
  const impactColor = impactColors[incident.impact] || impactColors.none;
  const sortedUpdates = [...incident.updates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      style={{
        borderLeft: `3px solid ${impactColor}`,
        background: 'var(--bg-secondary)',
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text fw={600} style={{ fontSize: 'var(--font-md)', flex: 1 }}>
            {incident.title}
          </Text>
          <Group gap="xs" style={{ flexShrink: 0 }}>
            <Badge
              size="sm"
              variant="filled"
              style={{ backgroundColor: impactColor }}
            >
              {incident.impact}
            </Badge>
            <Badge size="sm" variant="light" color="gray">
              {incident.status}
            </Badge>
          </Group>
        </Group>

        {incident.affectedComponents.length > 0 && (
          <Group gap="xs">
            {incident.affectedComponents.map((comp) => (
              <Badge key={comp} size="xs" variant="outline" color="gray">
                {comp}
              </Badge>
            ))}
          </Group>
        )}

        {sortedUpdates.length > 0 && (
          <Box mt="xs">
            <Timeline
              active={0}
              bulletSize={20}
              lineWidth={2}
              styles={{
                itemTitle: { fontSize: 'var(--font-sm)' },
                itemBody: { fontSize: 'var(--font-sm)' },
              }}
            >
              {sortedUpdates.map((update, idx) => {
                const StatusIcon = statusIcons[update.status] || IconAlertCircle;
                return (
                  <Timeline.Item
                    key={idx}
                    bullet={<StatusIcon size={12} />}
                    title={
                      <Group gap="xs">
                        {update.status && (
                          <Badge size="xs" variant="light" color="gray">
                            {update.status}
                          </Badge>
                        )}
                        <Text size="xs" c="dimmed">
                          {formatTime(update.createdAt)}
                        </Text>
                      </Group>
                    }
                  >
                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                      {update.body}
                    </Text>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </Box>
        )}

        <Text size="xs" c="dimmed" ta="right">
          Created {formatTime(incident.createdAt)}
          {incident.updatedAt && incident.updatedAt !== incident.createdAt &&
            ` · Updated ${formatTime(incident.updatedAt)}`}
        </Text>
      </Stack>
    </Card>
  );
}

export function ServiceIncidentModal({ service, onClose }: ServiceIncidentModalProps) {
  const { data, isLoading } = useServiceIncidents(service?.id ?? null);

  const statusLabel = service?.isMaintenance
    ? 'Maintenance'
    : service?.status
      ? service.status.charAt(0).toUpperCase() + service.status.slice(1)
      : '';

  const badgeColor = service?.isMaintenance
    ? statusColors.maintenance
    : service ? statusColors[service.status] : undefined;

  const statusPageUrl = data?.service?.statusPageUrl || null;
  const incidents = data?.incidents || [];

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
        {isLoading ? (
          <>
            <Skeleton height={80} radius="md" />
            <Skeleton height={80} radius="md" />
            <Skeleton height={80} radius="md" />
          </>
        ) : incidents.length > 0 ? (
          incidents.map((incident, idx) => (
            <IncidentCard key={idx} incident={incident} />
          ))
        ) : (
          <Text
            c="dimmed"
            ta="center"
            py="xl"
            style={{ fontSize: 'var(--font-md)' }}
          >
            No active incidents reported
          </Text>
        )}

        {statusPageUrl && (
          <Anchor
            href={statusPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            ta="center"
            size="sm"
            style={{ fontSize: 'var(--font-sm)' }}
          >
            <Group gap={4} justify="center">
              <Text>View status page</Text>
              <IconExternalLink size={14} />
            </Group>
          </Anchor>
        )}
      </Stack>
    </Modal>
  );
}
