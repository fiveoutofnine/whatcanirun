import LogoImg from '@/components/common/logo-img';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Manufacturer = 'nvidia' | 'amd' | 'intel' | 'apple';

type ParsedManufacturer = {
  manufacturer: Manufacturer | null;
  displayName: string;
  logo: React.FC<{ className?: string; size?: number }> | null;
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MANUFACTURER_PREFIXES: { prefix: string; manufacturer: Manufacturer }[] = [
  { prefix: 'nvidia', manufacturer: 'nvidia' },
  { prefix: 'geforce', manufacturer: 'nvidia' },
  { prefix: 'amd', manufacturer: 'amd' },
  { prefix: 'radeon', manufacturer: 'amd' },
  { prefix: 'intel', manufacturer: 'intel' },
  { prefix: 'apple', manufacturer: 'apple' },
];

const MANUFACTURER_LOGO: Record<Manufacturer, React.FC<{ className?: string; size?: number }>> = {
  apple: LogoImg.Apple,
  nvidia: LogoImg.Nvidia,
  amd: LogoImg.Amd,
  intel: LogoImg.Intel,
};

// -----------------------------------------------------------------------------
// Function
// -----------------------------------------------------------------------------

export default function parseManufacturer(value: string): ParsedManufacturer {
  const lower = value.toLowerCase();

  // Try prefix match first (strip the prefix from the display name).
  for (const { prefix, manufacturer } of MANUFACTURER_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return {
        manufacturer,
        displayName: value.slice(prefix.length).trim(),
        logo: MANUFACTURER_LOGO[manufacturer],
      };
    }
  }

  // Fall back to substring match (keep full name since prefix isn't leading).
  for (const { prefix, manufacturer } of MANUFACTURER_PREFIXES) {
    if (lower.includes(prefix)) {
      return {
        manufacturer,
        displayName: value,
        logo: MANUFACTURER_LOGO[manufacturer],
      };
    }
  }

  return { manufacturer: null, displayName: value, logo: null };
}
