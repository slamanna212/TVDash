import { Modal, Text, Badge, Stack, Group, Skeleton } from '@mantine/core';
import { useEvents } from '../hooks/useEvents';
import { EventCard } from './EventCard';
import { statusColors } from '../theme';

interface ServiceIncidentModalProps {
  service: {
    name: string;
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    isMaintenance?: boolean;
  } | null;
  onClose: () => void;
}

export function ServiceIncidentModal({ service, onClose }: ServiceIncidentModalProps) {
  const { data, isLoading } = useEvents(
    service ? { entity_name: service.name, limit: 10 } : {}
  );

  const events = data?.events || [];

  const statusLabel = service?.isMaintenance
    ? 'Maintenance'
    : service?.status
      ? service.status.charAt(0).toUpperCase() + service.status.slice(1)
      : '';

  const badgeColor = service?.isMaintenance
    ? statusColors.maintenance
    : service ? statusColors[service.status] : undefined;

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
        ) : events.length === 0 ? (
          <Text
            c="dimmed"
            ta="center"
            py="xl"
            style={{ fontSize: 'var(--font-md)' }}
          >
            No recent incidents for this service
          </Text>
        ) : (
          events.map(event => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </Stack>
    </Modal>
  );
}
