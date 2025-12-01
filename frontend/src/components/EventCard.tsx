import { Box, Card, Group, Text, Badge, Stack, Collapse } from '@mantine/core';
import { useState } from 'react';
import { IconAlertCircle, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import type { Event } from '../api/client';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Severity styling
  const severityConfig = {
    critical: {
      color: '#e53935',
      icon: IconAlertCircle,
      label: 'Critical',
    },
    warning: {
      color: '#fb8c00',
      icon: IconAlertTriangle,
      label: 'Warning',
    },
    info: {
      color: '#1e88e5',
      icon: IconInfoCircle,
      label: 'Info',
    },
  };

  const config = severityConfig[event.severity];
  const SeverityIcon = config.icon;

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Source colors
  const sourceColorMap: Record<string, string> = {
    service: 'blue',
    cloud: 'cyan',
    m365: 'grape',
    gworkspace: 'indigo',
    isp: 'orange',
    radar: 'red',
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      style={{
        borderLeft: `6px solid ${config.color}`,
        cursor: event.description ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        background: 'var(--bg-secondary)',
      }}
      onClick={() => event.description && setExpanded(!expanded)}
      onMouseEnter={(e) => {
        if (event.description) {
          e.currentTarget.style.transform = 'translateX(4px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        {/* Left: Icon + Content */}
        <Group align="flex-start" gap="md" style={{ flex: 1 }}>
          <SeverityIcon
            size={32}
            color={config.color}
            style={{ flexShrink: 0, marginTop: '0.25rem' }}
          />

          <Stack gap="xs" style={{ flex: 1 }}>
            <Group gap="sm">
              <Badge
                size="sm"
                variant="light"
                color={sourceColorMap[event.source] || 'gray'}
                style={{ fontSize: 'var(--font-sm)' }}
              >
                {event.source.toUpperCase()}
              </Badge>

              {event.entity_name && (
                <Text size="sm" c="dimmed" style={{ fontSize: 'var(--font-sm)' }}>
                  {event.entity_name}
                </Text>
              )}
            </Group>

            <Text
              size="lg"
              fw={600}
              style={{
                fontSize: 'var(--font-md)',
                lineHeight: 1.3,
              }}
            >
              {event.title}
            </Text>

            {event.description && (
              <Collapse in={expanded}>
                <Text
                  size="sm"
                  c="dimmed"
                  style={{
                    fontSize: 'var(--font-sm)',
                    marginTop: '0.5rem',
                  }}
                >
                  {event.description}
                </Text>
              </Collapse>
            )}
          </Stack>
        </Group>

        {/* Right: Timestamp + Status */}
        <Stack gap="xs" align="flex-end" style={{ flexShrink: 0 }}>
          <Text
            size="sm"
            c="dimmed"
            style={{ fontSize: 'var(--font-sm)' }}
          >
            {formatTime(event.occurred_at)}
          </Text>

          {event.resolved_at && (
            <Badge size="xs" color="green" variant="light">
              Resolved
            </Badge>
          )}
        </Stack>
      </Group>
    </Card>
  );
}
