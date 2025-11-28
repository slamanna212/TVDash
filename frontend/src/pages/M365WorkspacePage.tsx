import { Box, Title, Grid, Card, Text, Stack, Group, Loader, Center, SimpleGrid } from '@mantine/core';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { apiClient, M365Service, GWorkspaceService } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { statusColors } from '../theme';

export function M365WorkspacePage() {
  const { data: m365Data, loading: m365Loading, error: m365Error } = useAutoRefresh(
    () => apiClient.getM365(),
    60
  );

  const { data: workspaceData } = useAutoRefresh(
    () => apiClient.getGWorkspace(),
    60
  );

  if (m365Loading && !m365Data) {
    return (
      <Center style={{ height: '100%' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Microsoft 365 & Google Workspace
      </Title>

      <Grid gutter="xl">
        {/* Microsoft 365 - 75% */}
        <Grid.Col span={9}>
          <M365Section data={m365Data} error={m365Error} />
        </Grid.Col>

        {/* Google Workspace - 25% */}
        <Grid.Col span={3}>
          <WorkspaceSection data={workspaceData} />
        </Grid.Col>
      </Grid>
    </Box>
  );
}

function M365Section({ data, error }: { data: any; error: Error | null }) {
  if (error) {
    return (
      <Card shadow="md" padding="lg" style={{ background: 'var(--bg-secondary)', height: '100%' }}>
        <Text c="red">M365 credentials not configured</Text>
        <Text size="sm" c="dimmed" mt="sm">
          Configure M365_TENANT_ID, M365_CLIENT_ID, and M365_CLIENT_SECRET to enable M365 monitoring
        </Text>
      </Card>
    );
  }

  return (
    <Card shadow="md" padding="lg" style={{ background: 'var(--bg-secondary)', height: '100%' }}>
      <Stack gap="md" style={{ height: '100%' }}>
        <Group justify="space-between">
          <Text size="calc(var(--font-lg) * 1.2)" fw={700}>
            Microsoft 365
          </Text>
          {data && <StatusBadge status={data.overall as any} size="lg" />}
        </Group>

        {data && data.services && data.services.length > 0 ? (
          <SimpleGrid cols={2} spacing="md">
            {data.services.map((service: M365Service) => (
              <Card
                key={service.name}
                padding="md"
                radius="sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${statusColors[service.status]}`,
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600}>{service.name}</Text>
                    <StatusBadge status={service.status} size="sm" />
                  </Group>

                  {service.issues && service.issues.length > 0 && (
                    <Stack gap="xs">
                      {service.issues.slice(0, 2).map((issue) => (
                        <Box key={issue.id}>
                          <Text size="xs" c="dimmed">
                            {issue.title}
                          </Text>
                        </Box>
                      ))}
                      {service.issues.length > 2 && (
                        <Text size="xs" c="dimmed">
                          +{service.issues.length - 2} more
                        </Text>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <Center style={{ flex: 1 }}>
            <Text c="dimmed">No M365 data available</Text>
          </Center>
        )}
      </Stack>
    </Card>
  );
}

function WorkspaceSection({ data }: { data: any }) {
  return (
    <Card shadow="md" padding="lg" style={{ background: 'var(--bg-secondary)', height: '100%' }}>
      <Stack gap="md" style={{ height: '100%' }}>
        <Group justify="space-between">
          <Text size="var(--font-lg)" fw={700}>
            Google Workspace
          </Text>
          {data && <StatusBadge status={data.overall as any} size="md" />}
        </Group>

        {data && data.services && data.services.length > 0 ? (
          <Stack gap="sm">
            {data.services.map((service: GWorkspaceService) => (
              <Card
                key={service.name}
                padding="sm"
                radius="sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderLeft: `3px solid ${statusColors[service.status]}`,
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      {service.name}
                    </Text>
                    <StatusBadge status={service.status} size="xs" />
                  </Group>

                  {service.incident && (
                    <Text size="xs" c="dimmed">
                      {service.incident.title}
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        ) : (
          <Center style={{ flex: 1 }}>
            <Text c="dimmed" size="sm">
              No Workspace data
            </Text>
          </Center>
        )}
      </Stack>
    </Card>
  );
}
