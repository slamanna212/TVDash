import {
  IconCloud,
  IconServer,
  IconBrandAzure,
  IconBrandGoogle,
  IconMapPin,
} from '@tabler/icons-react';

/**
 * Get the icon for a cloud provider
 */
export function getProviderIcon(provider: string, size = 28) {
  switch (provider) {
    case 'AWS':
      return <IconCloud size={size} stroke={2} color="#FF9900" />;
    case 'Azure':
      return <IconBrandAzure size={size} stroke={2} color="#0078D4" />;
    case 'Google Cloud':
      return <IconBrandGoogle size={size} stroke={2} color="#4285F4" />;
    default:
      return <IconServer size={size} stroke={2} />;
  }
}

/**
 * Get the icon for a region (generic location pin)
 */
export function getRegionIcon(size = 24) {
  return <IconMapPin size={size} stroke={2} />;
}
