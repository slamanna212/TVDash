export interface RSSItem {
  title: string;
  description: string;
  pubDate: string;
  link?: string;
  guid?: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  items: RSSItem[];
}

/**
 * Simple RSS feed parser for Cloudflare Workers
 * Parses basic RSS 2.0 feeds
 */
export async function parseRSSFeed(url: string): Promise<RSSFeed> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MSP-Dashboard-Monitor/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const text = await response.text();
    return parseRSSText(text);
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    throw error;
  }
}

function parseRSSText(xml: string): RSSFeed {
  // Extract channel title and description
  const channelTitle = extractTag(xml, 'title') || 'Unknown Feed';
  const channelDesc = extractTag(xml, 'description') || '';

  // Extract all items
  const items: RSSItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const itemXml = match[1];
    const item: RSSItem = {
      title: extractTag(itemXml, 'title') || 'Untitled',
      description: extractTag(itemXml, 'description') || '',
      pubDate: extractTag(itemXml, 'pubDate') || new Date().toISOString(),
      link: extractTag(itemXml, 'link'),
      guid: extractTag(itemXml, 'guid'),
    };

    // Clean up description (remove HTML tags and CDATA)
    item.description = cleanDescription(item.description);

    items.push(item);
  }

  return {
    title: channelTitle,
    description: channelDesc,
    items,
  };
}

function extractTag(xml: string, tagName: string): string | undefined {
  // Handle CDATA sections
  const cdataPattern = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }

  // Handle regular tags
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(pattern);
  if (match) {
    return match[1].trim();
  }

  return undefined;
}

function cleanDescription(desc: string): string {
  // Remove HTML tags
  let cleaned = desc.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");

  return cleaned.trim();
}

/**
 * Check if any RSS items indicate an active incident
 */
export function hasActiveIncidents(items: RSSItem[], hoursToCheck = 24): boolean {
  if (items.length === 0) return false;

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - hoursToCheck * 60 * 60 * 1000);

  for (const item of items) {
    const pubDate = new Date(item.pubDate);

    // Check if item is recent
    if (pubDate > cutoffTime) {
      // Look for keywords indicating ongoing issues
      const combinedText = `${item.title} ${item.description}`.toLowerCase();

      // Skip resolved/informational items
      if (
        combinedText.includes('resolved') ||
        combinedText.includes('completed') ||
        combinedText.includes('summary')
      ) {
        continue;
      }

      // Check for incident keywords
      if (
        combinedText.includes('outage') ||
        combinedText.includes('degraded') ||
        combinedText.includes('incident') ||
        combinedText.includes('investigating') ||
        combinedText.includes('experiencing issues')
      ) {
        return true;
      }
    }
  }

  return false;
}
