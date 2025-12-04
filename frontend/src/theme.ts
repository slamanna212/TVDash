import type { MantineColorsTuple } from '@mantine/core';
import { createTheme } from '@mantine/core';

const redAccent: MantineColorsTuple = [
  '#ffe9e9',
  '#ffd1d1',
  '#fba0a0',
  '#f76d6d',
  '#f44343',
  '#f22828',
  '#e53935',
  '#d42a2a',
  '#be2323',
  '#a51c1c',
];

export const theme = createTheme({
  primaryColor: 'red',
  colors: {
    red: redAccent,
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  defaultRadius: 'md',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
});

// Status colors for use in components
export const statusColors = {
  operational: '#2f9e44',
  degraded: '#fab005',
  outage: '#e03131',
  unknown: '#495057',
  maintenance: '#1971c2', // Blue for maintenance
};
