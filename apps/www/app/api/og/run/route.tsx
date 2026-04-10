import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { formatValueToPrecision } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Colors and fonts
// -----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const radixColors = require('@radix-ui/colors');

const GRAY_1 = radixColors.grayDark.gray1;
const GRAY_2 = radixColors.grayDark.gray2;
const GRAY_6 = radixColors.grayDark.gray6;
const GRAY_11 = radixColors.grayDark.gray11;
const GRAY_12 = radixColors.grayDark.gray12;

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const model = searchParams.get('model') ?? 'Model';
  const modelLabLogoUrl = searchParams.get('modelLabLogoUrl');
  const modelQuant = searchParams.get('modelQuant');
  const decode = Number(searchParams.get('decode') ?? 0);
  const prefill = Number(searchParams.get('prefill') ?? 0);
  const device = searchParams.get('device') ?? 'Device';
  const deviceManufacturerLogoUrl = searchParams.get('deviceManufacturerLogoUrl');

  const [interMediumFont, interSemiBoldFont, serpentineFont] = await Promise.all([
    readFile(join(process.cwd(), 'public/static/fonts/Inter-Medium-Subset.otf')),
    readFile(join(process.cwd(), 'public/static/fonts/Inter-SemiBold-Subset.otf')),
    readFile(join(process.cwd(), 'public/static/fonts/Serpentine-Subset.otf')),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          width: '100%',
          height: 40,
          display: 'flex',
          borderBottom: '2px solid',
          borderColor: GRAY_6,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRight: '2px solid',
            borderColor: GRAY_6,
          }}
        />
        <div style={{ height: 40, flex: 1 }} />
        <div
          style={{
            width: 40,
            height: 40,
            borderLeft: '2px solid',
            borderColor: GRAY_6,
          }}
        />
      </div>
      <div
        style={{
          width: '100%',
          flex: 1,
          display: 'flex',
        }}
      >
        <div
          style={{
            width: 40,
            height: '100%',
            borderRight: '2px solid',
            borderColor: GRAY_6,
          }}
        />
        <div
          style={{
            height: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: GRAY_1,
            padding: 0,
          }}
        >
          <div
            style={{
              height: 128,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              background: GRAY_1,
              paddingLeft: 32,
              paddingRight: 32,
            }}
          >
            {modelLabLogoUrl ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: '100%',
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: GRAY_6,
                  marginRight: 20,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={modelLabLogoUrl} width={64} height={64} alt="Model lab's logo" />
              </div>
            ) : null}
            <div
              style={{
                display: 'block',
                fontSize: 56,
                fontWeight: 600,
                lineHeight: '100%',
                letterSpacing: '-0.025em',
                color: GRAY_12,
                lineClamp: 1,
              }}
            >
              {model}
            </div>
            {modelQuant ? (
              <span
                style={{
                  display: 'block',
                  fontSize: 56,
                  fontWeight: 500,
                  lineHeight: '100%',
                  letterSpacing: '-0.025em',
                  whiteSpace: 'pre',
                  color: GRAY_11,
                  lineClamp: 1,
                }}
              >
                {` / ${modelQuant}`}
              </span>
            ) : null}
          </div>
          <div
            style={{
              height: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              background: GRAY_2,
              borderTop: '2px solid',
              borderBottom: '2px solid',
              borderColor: GRAY_6,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 500,
                  lineHeight: '120%',
                  color: GRAY_11,
                }}
              >
                Token generation
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  marginTop: 12,
                  fontSize: 108,
                  fontWeight: 600,
                  lineHeight: '100%',
                  letterSpacing: '-0.025em',
                  color: GRAY_12,
                }}
              >
                {formatValueToPrecision(decode, 1, true)}
                <div
                  style={{
                    fontSize: 72,
                    fontWeight: 500,
                    lineHeight: '115%',
                    color: GRAY_11,
                    whiteSpace: 'pre',
                  }}
                >
                  {' tok/s'}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginLeft: 64,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 500,
                  lineHeight: '120%',
                  color: GRAY_11,
                }}
              >
                Prompt processing
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  marginTop: 12,
                  fontSize: 108,
                  fontWeight: 600,
                  lineHeight: '100%',
                  letterSpacing: '-0.025em',
                  color: GRAY_12,
                }}
              >
                {formatValueToPrecision(prefill, 1, true)}
                <div
                  style={{
                    fontSize: 72,
                    fontWeight: 500,
                    lineHeight: '115%',
                    color: GRAY_11,
                    whiteSpace: 'pre',
                  }}
                >
                  {' tok/s'}
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              height: 104,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: GRAY_1,
              padding: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {deviceManufacturerLogoUrl ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: GRAY_6,
                    marginRight: 16,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={deviceManufacturerLogoUrl}
                    width={40}
                    height={40}
                    alt="Device manufacturer's logo"
                  />
                </div>
              ) : null}
              <div
                style={{
                  display: 'block',
                  fontSize: 40,
                  fontWeight: 600,
                  lineHeight: '100%',
                  letterSpacing: '-0.025em',
                  color: GRAY_12,
                  lineClamp: 1,
                }}
              >
                {device}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 40,
                lineHeight: 40,
                fontFamily: 'Serpentine',
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: 24,
                color: GRAY_12,
              }}
            >
              whatcani.run
            </div>
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: '100%',
            borderLeft: '2px solid',
            borderColor: GRAY_6,
          }}
        />
      </div>
      <div
        style={{
          width: '100%',
          height: '40px',
          display: 'flex',
          borderTop: '2px solid',
          borderColor: GRAY_6,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRight: '2px solid',
            borderColor: GRAY_6,
          }}
        />
        <div style={{ height: 40, flex: 1 }} />
        <div
          style={{
            width: 40,
            height: 40,
            borderLeft: '2px solid',
            borderColor: GRAY_6,
          }}
        />
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: interMediumFont,
          style: 'normal',
          weight: 500,
        },
        {
          name: 'Inter',
          data: interSemiBoldFont,
          style: 'normal',
          weight: 600,
        },
        {
          name: 'Serpentine',
          data: serpentineFont,
          style: 'italic',
          weight: 600,
        },
      ],
    },
  );
}
