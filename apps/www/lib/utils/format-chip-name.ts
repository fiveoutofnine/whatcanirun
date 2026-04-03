/** Strip manufacturer prefix for display (e.g. "Apple M1 Max" → "M1 Max"). */
const formatChipName = (name: string) => name.replace(/^\S+\s+/, '');

export default formatChipName;
