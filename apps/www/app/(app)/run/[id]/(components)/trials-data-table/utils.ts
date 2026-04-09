export function formatDuration(ms: number) {
  if (ms >= 1000) {
    return `${formatNumber(ms / 1000, 1)} s`;
  }

  return `${formatNumber(ms, 0)} ms`;
}

export function formatGb(mb: number) {
  return formatNumber(mb / 1024, 2);
}

export function formatNumber(value: number, fractionDigits = 1) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPercent(value: number) {
  return `${formatNumber(value * 100, 1)}%`;
}
