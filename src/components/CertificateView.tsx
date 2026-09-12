import type { Certificate } from '../lib/types';

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildSvg(cert: Certificate) {
  const date = new Date(cert.issuedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" font-family="Georgia, 'Times New Roman', serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#05060d"/>
      <stop offset="100%" stop-color="#0d1220"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5eead4"/>
      <stop offset="55%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#fb7185"/>
    </linearGradient>
  </defs>
  <rect width="1000" height="700" fill="url(#bg)"/>
  <rect x="24" y="24" width="952" height="652" fill="none" stroke="url(#accent)" stroke-width="3"/>
  <rect x="40" y="40" width="920" height="620" fill="none" stroke="#22283f" stroke-width="1"/>
  <text x="500" y="140" text-anchor="middle" fill="#96a0c2" font-size="20" letter-spacing="6">CERTIFICATE OF COMPLETION</text>
  <text x="500" y="230" text-anchor="middle" fill="#eef1fb" font-size="42" font-weight="bold">Kaledo</text>
  <text x="500" y="300" text-anchor="middle" fill="#626b8c" font-size="18">This certifies that</text>
  <text x="500" y="360" text-anchor="middle" fill="url(#accent)" font-size="40" font-weight="bold">${escapeXml(cert.recipientName)}</text>
  <text x="500" y="410" text-anchor="middle" fill="#96a0c2" font-size="18">has successfully completed the course</text>
  <text x="500" y="460" text-anchor="middle" fill="#eef1fb" font-size="28" font-weight="bold">${escapeXml(cert.courseTitle)}</text>
  <text x="500" y="500" text-anchor="middle" fill="#626b8c" font-size="16">with an assessment score of ${cert.score}%</text>
  <line x1="330" y1="580" x2="670" y2="580" stroke="#22283f" stroke-width="1"/>
  <text x="500" y="610" text-anchor="middle" fill="#96a0c2" font-size="14">Issued ${date} · Credential ID ${cert.id}</text>
</svg>`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

export default function CertificateView({ certificate }: { certificate: Certificate }) {
  const svg = buildSvg(certificate);

  return (
    <div>
      <div
        id="certificate-preview"
        className="overflow-hidden rounded-2xl border border-line"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <button
          onClick={() => download(`${certificate.courseTitle.replace(/\s+/g, '-')}-certificate.svg`, svg, 'image/svg+xml')}
          className="btn-primary !py-2 !text-xs"
        >
          Download certificate (SVG)
        </button>
        <button onClick={() => window.print()} className="btn-ghost !py-2 !text-xs">
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
