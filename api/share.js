// Vercel serverless function — serves dynamic OG tags for WhatsApp/social previews.
// URL: /share/{token}?ci={coverImageUrl}&en={eventName}&ed={date}&vn={venue}
// Bots read OG tags; browsers are immediately redirected to /rsvp/{token}.

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function handler(req, res) {
  const token = req.query.token || '';
  const ci    = req.query.ci   || '';   // cover image URL
  const en    = req.query.en   || '';   // event name
  const ed    = req.query.ed   || '';   // event date (YYYY-MM-DD)
  const vn    = req.query.vn   || '';   // venue name

  const host  = req.headers.host || 'lumaguests.vercel.app';
  const origin = `https://${host}`;

  const coverImage = ci || null;   // no fallback — show no image if user hasn't uploaded one
  const title      = en || 'הזמנה לאירוע';

  let desc = 'לאישור הגעה — לחץ כאן';
  if (ed) {
    try {
      const d = new Date(ed);
      desc = d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {}
  }
  if (vn) desc += ` · 📍 ${vn}`;

  // Build target RSVP URL (passes event params for the SPA)
  const p = new URLSearchParams();
  if (en) p.set('en', en);
  if (ed) p.set('ed', ed);
  if (vn) p.set('vn', vn);
  const qs     = p.toString();
  const rsvpUrl = `${origin}/rsvp/${token}${qs ? '?' + qs : ''}`;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta property="og:type"         content="website" />
  <meta property="og:site_name"    content="Luma Guests" />
  <meta property="og:title"        content="${esc(title)}" />
  <meta property="og:description"  content="${esc(desc)}" />
  ${coverImage ? `<meta property="og:image"        content="${esc(coverImage)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />` : ''}
  <meta property="og:url"          content="${esc(origin + '/share/' + token)}" />
  <meta name="twitter:card"        content="${coverImage ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  ${coverImage ? `<meta name="twitter:image" content="${esc(coverImage)}" />` : ''}
  <script>window.location.replace(${JSON.stringify(rsvpUrl)});</script>
  <noscript><meta http-equiv="refresh" content="0;url=${esc(rsvpUrl)}"></noscript>
  <style>
    body { margin:0; background:#F5F3EF; display:flex; align-items:center;
           justify-content:center; height:100vh; font-family:sans-serif;
           color:#6E6862; direction:rtl; font-size:15px; }
  </style>
</head>
<body>מעביר לדף RSVP...</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.send(html);
}
