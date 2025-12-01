import { Box, Title, Text, Loader, Center, SimpleGrid } from '@mantine/core';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { apiClient, M365Service } from '../api/client';
import { M365ServiceCard } from '../components/M365ServiceCard';

export function M365WorkspacePage() {
  const { data: m365Data, loading: m365Loading, error: m365Error } = useAutoRefresh(
    () => apiClient.getM365(),
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
        Microsoft 365
      </Title>

      <M365Section data={m365Data} error={m365Error} />
    </Box>
  );
}

function M365Section({ data, error }: { data: any; error: Error | null }) {
  // Sort services by status priority
  const statusPriority: Record<string, number> = {
    outage: 0,
    degraded: 1,
    operational: 2,
    unknown: 3,
  };

  const sortedServices = data?.services
    ? [...data.services].sort((a: M365Service, b: M365Service) =>
        statusPriority[a.status] - statusPriority[b.status]
      )
    : [];

  if (error) {
    return (
      <Box style={{ padding: 'lg', height: '100%' }}>
        <Text c="red">M365 credentials not configured</Text>
        <Text size="sm" c="dimmed" mt="sm">
          Configure M365_TENANT_ID, M365_CLIENT_ID, and M365_CLIENT_SECRET to enable M365 monitoring
        </Text>
      </Box>
    );
  }

  return (
    <Box style={{ height: '100%' }}>
      {sortedServices.length > 0 ? (
        <SimpleGrid cols={5} spacing="md">
          {sortedServices.map((service: M365Service) => (
            <M365ServiceCard
              key={service.name}
              service={service}
              updatedAt={data.lastChecked}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Center style={{ height: '100%' }}>
          <Text c="dimmed">No M365 data available</Text>
        </Center>
      )}
    </Box>
  );
}
