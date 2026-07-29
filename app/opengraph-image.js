import { ImageResponse } from 'next/og';
import { siteConfig } from '../lib/siteConfig';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080808',
          color: '#f7f7f5',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -4, display: 'flex' }}>
          VISTA SUA <span style={{ color: '#F5C518', marginLeft: 20 }}>ATITUDE.</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: '#a1a1aa', display: 'flex' }}>
          {siteConfig.name} — Moda, streetwear e acessórios
        </div>
      </div>
    ),
    { ...size }
  );
}
