import { Divider, Text, Group } from '@mantine/core';

interface DaySeparatorProps {
  date: Date;
}

export function DaySeparator({ date }: DaySeparatorProps) {
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <Group
      my="xl"
      style={{
        position: 'relative',
      }}
    >
      <Divider
        style={{
          flex: 1,
          borderColor: '#2c2e33',
        }}
      />
      <Text
        size="lg"
        fw={700}
        c="dimmed"
        style={{
          fontSize: 'var(--font-lg)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {formatDate(date)}
      </Text>
      <Divider
        style={{
          flex: 1,
          borderColor: '#2c2e33',
        }}
      />
    </Group>
  );
}
