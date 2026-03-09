const formatValueToPrecision = (
  value: number,
  decimals: number,
  toExponential: boolean,
): string => {
  if (value === 0) return '0';
  if (value >= 1e15) return value.toFixed(decimals);
  if (value >= 1e12) return `${(value / 1e12).toFixed(decimals)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(decimals)}k`;
  if (value < 1 / 10 ** decimals)
    return toExponential ? value.toExponential(decimals) : value.toPrecision(decimals);
  return (Math.round(value * 10 ** decimals) / 10 ** decimals).toString();
};

export default formatValueToPrecision;
