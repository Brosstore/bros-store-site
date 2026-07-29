import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: '#080808', color: '#FFFFFF', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', right: '-80px', top: '-190px', width: '620px', height: '620px', borderRadius: '999px', background: '#F5C518', opacity: 0.12 }} />
      <div style={{ position: 'absolute', left: '-180px', bottom: '-280px', width: '620px', height: '620px', borderRadius: '999px', border: '50px solid #F5C518', opacity: 0.13 }} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', padding: '72px 84px', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, fontWeight: 800, letterSpacing: 4 }}>
          BROS <span style={{ marginLeft: 10, color: '#F5C518' }}>STORE</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 82, lineHeight: 0.95, fontWeight: 800, letterSpacing: -4 }}>VISTA SUA</div>
          <div style={{ display: 'flex', marginTop: 12, fontSize: 96, lineHeight: 0.95, fontWeight: 800, letterSpacing: -5, color: '#F5C518' }}>ATITUDE.</div>
          <div style={{ display: 'flex', marginTop: 34, fontSize: 28, color: '#A1A1AA' }}>Roupas, calçados e acessórios</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 18, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#F5C518' }}>
          <span style={{ width: 44, height: 2, background: '#F5C518' }} /> Streetwear brasileiro
        </div>
      </div>
    </div>,
    size,
  );
}
