import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { Fragment } from 'react';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { formatValueToPrecision } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Colors and fonts
// -----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const radixColors = require('@radix-ui/colors');

const GRAY_1 = radixColors.grayDark.gray1;
const GRAY_6 = radixColors.grayDark.gray6;
const GRAY_11 = radixColors.grayDark.gray11;
const GRAY_12 = radixColors.grayDark.gray12;

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get('title') ?? 'Title';
  const description = searchParams.get('description') ?? 'Description';
  const logoUrl = searchParams.get('logoUrl');
  const models = Number(searchParams.get('models') ?? 0);
  const quants = Number(searchParams.get('quants') ?? 0);
  const devices = Number(searchParams.get('devices') ?? 0);
  const tokens = Number(searchParams.get('tokens') ?? 0);

  const [interRegularFont, interSemiBoldFont] = await Promise.all([
    readFile(join(process.cwd(), 'public/static/fonts/Inter-Regular-Subset.otf')),
    readFile(join(process.cwd(), 'public/static/fonts/Inter-SemiBold-Subset.otf')),
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
            padding: 48,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              {logoUrl ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 64,
                    height: 64,
                    marginTop: 0.1 * 64,
                    borderRadius: '100%',
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: GRAY_6,
                    marginRight: 20,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} width={64} height={64} alt="Logo" />
                </div>
              ) : null}
              <div
                style={{
                  display: 'block',
                  fontSize: 64,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  letterSpacing: '-0.025em',
                  color: GRAY_12,
                  lineClamp: 1,
                }}
              >
                {title}
              </div>
            </div>
            <div
              style={{
                display: 'block',
                marginTop: 32,
                fontSize: 40,
                fontWeight: 400,
                lineHeight: 1.5,
                color: GRAY_11,
                lineClamp: 3,
              }}
            >
              {description}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex' }}>
              {models > 0 ? (
                <Fragment>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 40 40"
                      fill="none"
                    >
                      <g
                        transform={`scale(${40 / 24})`}
                        stroke={GRAY_11}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
                        <path d="m7 16.5-4.74-2.85" />
                        <path d="m7 16.5 5-3" />
                        <path d="M7 16.5v5.17" />
                        <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
                        <path d="m17 16.5-5-3" />
                        <path d="m17 16.5 4.74-2.85" />
                        <path d="M17 16.5v5.17" />
                        <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
                        <path d="M12 8 7.26 5.15" />
                        <path d="m12 8 4.74-2.85" />
                        <path d="M12 13.5V8" />
                      </g>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 40,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        letterSpacing: '-0.05em',
                        color: GRAY_12,
                      }}
                    >
                      {models.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 400,
                        lineHeight: 1.2,
                        color: GRAY_11,
                        marginTop: 8,
                      }}
                    >
                      Models
                    </div>
                  </div>
                </Fragment>
              ) : null}
              {quants > 0 ? (
                <Fragment>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginLeft: models > 0 ? 40 : 0,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 40 40"
                      fill="none"
                    >
                      <g
                        transform={`scale(${40 / 24})`}
                        stroke={GRAY_11}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
                        <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
                        <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
                      </g>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 40,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        letterSpacing: '-0.05em',
                        color: GRAY_12,
                      }}
                    >
                      {quants.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 400,
                        lineHeight: 1.2,
                        color: GRAY_11,
                        marginTop: 8,
                      }}
                    >
                      Quants
                    </div>
                  </div>
                </Fragment>
              ) : null}
              <div
                style={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 40,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                >
                  <g
                    transform={`scale(${40 / 24})`}
                    stroke={GRAY_11}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="14" height="8" x="5" y="2" rx="2" />
                    <rect width="20" height="8" x="2" y="14" rx="2" />
                    <path d="M6 18h2" />
                    <path d="M12 18h6" />
                  </g>
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 40,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    letterSpacing: '-0.05em',
                    color: GRAY_12,
                  }}
                >
                  {devices.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 400,
                    lineHeight: '1.2',
                    color: GRAY_11,
                    marginTop: 8,
                  }}
                >
                  Devices
                </div>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 40,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                >
                  <g
                    transform={`scale(${40 / 24})`}
                    stroke={GRAY_11}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="7" cy="12" r="3" />
                    <path d="M10 9v6" />
                    <circle cx="17" cy="12" r="3" />
                    <path d="M14 7v8" />
                    <path d="M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1" />
                  </g>
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 40,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    letterSpacing: '-0.05em',
                    color: GRAY_12,
                  }}
                >
                  {formatValueToPrecision(tokens, 1, true)}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 400,
                    lineHeight: '1.2',
                    color: GRAY_11,
                    marginTop: 8,
                  }}
                >
                  Tokens
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                width: 64,
                height: 64,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 20.8,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 36 36"
                fill="none"
              >
                <rect x=".5" y=".5" width="35" height="35" rx="5.5" fill={GRAY_1} stroke={GRAY_6} />
                <path
                  d="M22.349 6.672c-1.256.025-2.143 1.05-2.142 2.11.001 1.147.95 2.15 2.123 2.131 1.21-.019 2.163-1.055 2.146-2.101-.019-1.125-.921-2.165-2.127-2.14"
                  fill={GRAY_11}
                />
                <path
                  d="M27.878 10.53c-.416-.471-1.05-.33-1.342.157l-2.258 2.686c-1.289-.904-3.338-2.514-4.566-3.22-.49-.294-.62-.276-1.092-.403a49 49 0 0 0-3.275-.762c-.431-.09-.794-.024-1.107.235l-3.554 2.653a.81.81 0 0 0 .252 1.397c.354.124.587.045.85-.132l3.375-2.174 2.243.849-2.632 5.812c-.516 1.313.188 2.691 1.518 2.965.551.115.92.132 1.505.142l3.284.032-1.913 4.2c-.327.662-.006 1.277.578 1.503a1.044 1.044 0 0 0 1.365-.527l3.07-5.542c.555-.928-.022-2.034-1.027-2.198l-3.705-.537 2.024-3.473 2.413 1.342c.865.48 1.349.143 1.882-.712l2.145-3.234c.284-.388.274-.749-.033-1.06"
                  fill={GRAY_11}
                />
                <path
                  d="m14.209 19.469-1.586 3.877-4.419 4.043c-.571.518-.464 1.374.255 1.755.459.236 1.029.098 1.233-.184l4.76-3.78c.371-.303.563-.57.773-.945l1.939-3.021c-1.334-.021-2.352-.272-2.955-1.745"
                  fill={GRAY_11}
                />
              </svg>
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
          data: interRegularFont,
          style: 'normal',
          weight: 400,
        },
        {
          name: 'Inter',
          data: interSemiBoldFont,
          style: 'normal',
          weight: 600,
        },
      ],
    },
  );
}
