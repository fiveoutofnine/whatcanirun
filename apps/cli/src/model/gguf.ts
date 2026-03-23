/**
 * Lightweight GGUF metadata-only parser.
 * Reads the binary header and KV pairs without loading tensor data.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GgufMetadata {
  architecture?: string;
  name?: string;
  quant?: string;
  fileType?: number;
  sizeLabel?: string;
  contextLength?: number;
  blockCount?: number;
  embeddingLength?: number;
}

// -----------------------------------------------------------------------------
// File type → quant string mapping
// -----------------------------------------------------------------------------

const FILE_TYPE_QUANT: Record<number, string> = {
  0: 'f32',
  1: 'f16',
  2: 'q4_0',
  3: 'q4_1',
  // 4, 5: deprecated Q4_2, Q4_3
  7: 'q8_0',
  8: 'q8_1',
  10: 'q2_k',
  11: 'q3_k_s',
  12: 'q3_k_m',
  13: 'q3_k_l',
  14: 'q4_k_s',
  15: 'q4_k_m',
  16: 'q5_k_s',
  17: 'q5_k_m',
  18: 'q6_k',
  19: 'iq2_xxs',
  20: 'iq2_xs',
  21: 'iq3_xxs',
  22: 'iq1_s',
  23: 'iq4_nl',
  24: 'iq3_s',
  25: 'iq2_s',
  26: 'iq4_xs',
  27: 'iq1_m',
  28: 'bf16',
  29: 'q4_0_4_4',
  30: 'q4_0_4_8',
  31: 'q4_0_8_8',
};

// -----------------------------------------------------------------------------
// Value type sizes (for skipping)
// -----------------------------------------------------------------------------

const GGUF_MAGIC = 0x46554747; // "GGUF" in LE

enum ValueType {
  UINT8 = 0,
  INT8 = 1,
  UINT16 = 2,
  INT16 = 3,
  UINT32 = 4,
  INT32 = 5,
  FLOAT32 = 6,
  BOOL = 7,
  STRING = 8,
  ARRAY = 9,
  UINT64 = 10,
  INT64 = 11,
  FLOAT64 = 12,
}

const FIXED_TYPE_SIZE: Partial<Record<ValueType, number>> = {
  [ValueType.UINT8]: 1,
  [ValueType.INT8]: 1,
  [ValueType.UINT16]: 2,
  [ValueType.INT16]: 2,
  [ValueType.UINT32]: 4,
  [ValueType.INT32]: 4,
  [ValueType.FLOAT32]: 4,
  [ValueType.BOOL]: 1,
  [ValueType.UINT64]: 8,
  [ValueType.INT64]: 8,
  [ValueType.FLOAT64]: 8,
};

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

class GgufReader {
  private view: DataView;
  private offset = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  get pos() {
    return this.offset;
  }

  get remaining() {
    return this.view.byteLength - this.offset;
  }

  u8() {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }

  u16() {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }

  i16() {
    const v = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return v;
  }

  u32() {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  i32() {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }

  f32() {
    const v = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return v;
  }

  u64() {
    const v = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return Number(v);
  }

  i64() {
    const v = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return Number(v);
  }

  f64() {
    const v = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return v;
  }

  string() {
    const len = this.u64();
    const bytes = new Uint8Array(this.view.buffer, this.offset, len);
    this.offset += len;
    return new TextDecoder().decode(bytes);
  }

  skip(n: number) {
    this.offset += n;
  }

  /** Read a typed value. Returns the value or undefined if the type is unknown. */
  readValue(type: ValueType): string | number | boolean | undefined {
    switch (type) {
      case ValueType.UINT8:
        return this.u8();
      case ValueType.INT8:
        return this.view.getInt8(this.offset++) as number;
      case ValueType.UINT16:
        return this.u16();
      case ValueType.INT16:
        return this.i16();
      case ValueType.UINT32:
        return this.u32();
      case ValueType.INT32:
        return this.i32();
      case ValueType.FLOAT32:
        return this.f32();
      case ValueType.BOOL:
        return this.u8() !== 0;
      case ValueType.STRING:
        return this.string();
      case ValueType.UINT64:
        return this.u64();
      case ValueType.INT64:
        return this.i64();
      case ValueType.FLOAT64:
        return this.f64();
      default:
        return undefined;
    }
  }

  /** Skip a value without reading it. For arrays, skips all elements. */
  skipValue(type: ValueType): void {
    if (type === ValueType.STRING) {
      const len = this.u64();
      this.skip(len);
      return;
    }

    if (type === ValueType.ARRAY) {
      const elemType = this.u32() as ValueType;
      const count = this.u64();
      // For fixed-size element types, skip in bulk.
      const elemSize = FIXED_TYPE_SIZE[elemType as ValueType];
      if (elemSize != null) {
        this.skip(count * elemSize);
        return;
      }
      // Variable-size elements (strings, nested arrays) — skip one by one.
      for (let i = 0; i < count; i++) {
        if (this.remaining < 8) throw new RangeError('Buffer exhausted while skipping array');
        this.skipValue(elemType);
      }
      return;
    }

    const size = FIXED_TYPE_SIZE[type];
    if (size != null) {
      this.skip(size);
      return;
    }

    throw new Error(`Unknown GGUF value type: ${type}`);
  }
}

// Keys we want to extract (dot-separated).
const WANTED_KEYS = new Set([
  'general.architecture',
  'general.name',
  'general.file_type',
  'general.size_label',
  'general.quantization_version',
]);

// Architecture-specific keys we want (resolved after reading general.architecture).
const ARCH_SUFFIXES = ['.context_length', '.block_count', '.embedding_length'];

export async function readGgufMetadata(filePath: string): Promise<GgufMetadata | null> {
  try {
    const file = Bun.file(filePath);
    const fileSize = file.size;
    // Read up to 10MB for metadata. Tokenizer arrays can be ~6MB,
    // and general.file_type often comes after them.
    const readSize = Math.min(fileSize, 10 * 1024 * 1024);
    const buffer = await file.slice(0, readSize).arrayBuffer();
    const reader = new GgufReader(buffer);

    // Validate magic.
    const magic = reader.u32();
    if (magic !== GGUF_MAGIC) return null;

    // Version (must be ≥ 2).
    const version = reader.u32();
    if (version < 2) return null;

    // Tensor count (skip).
    reader.u64();

    // KV count.
    const kvCount = reader.u64();

    const kv: Record<string, string | number | boolean> = {};
    let arch: string | undefined;

    for (let i = 0; i < kvCount; i++) {
      if (reader.remaining < 12) break;

      const key = reader.string();
      const valueType = reader.u32() as ValueType;

      // Determine if we want this key.
      const isWanted =
        WANTED_KEYS.has(key) || (arch && ARCH_SUFFIXES.some((s) => key === `${arch}${s}`));

      if (isWanted) {
        const value = reader.readValue(valueType);
        if (value !== undefined) {
          kv[key] = value;
          if (key === 'general.architecture' && typeof value === 'string') {
            arch = value;
          }
        }
      } else {
        try {
          reader.skipValue(valueType);
        } catch {
          // Buffer exhausted while skipping a large value (e.g. tokenizer array).
          // We've likely already read all the keys we need.
          break;
        }
      }
    }

    const result: GgufMetadata = {};

    if (kv['general.architecture']) {
      result.architecture = String(kv['general.architecture']);
    }
    if (kv['general.name']) {
      result.name = String(kv['general.name']);
    }
    if (kv['general.size_label']) {
      result.sizeLabel = String(kv['general.size_label']);
    }

    const fileType = kv['general.file_type'];
    if (typeof fileType === 'number') {
      result.fileType = fileType;
      result.quant = FILE_TYPE_QUANT[fileType];
    }

    if (arch) {
      const ctxLen = kv[`${arch}.context_length`];
      if (typeof ctxLen === 'number') result.contextLength = ctxLen;

      const blockCount = kv[`${arch}.block_count`];
      if (typeof blockCount === 'number') result.blockCount = blockCount;

      const embLen = kv[`${arch}.embedding_length`];
      if (typeof embLen === 'number') result.embeddingLength = embLen;
    }

    return result;
  } catch {
    return null;
  }
}
