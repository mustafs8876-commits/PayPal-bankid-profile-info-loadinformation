const { next } = require('@vercel/functions');
import { createHmac, timingSafeEqual } from 'node:crypto';

function validSession(token, secret) {
  if (!token || !secret) return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const expiresAt = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^\d{13}$/.test(expiresAt) || Number(expiresAt) <= Date.now()) return false;
  const expected = createHmac('sha256', secret).update(expiresAt).digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function loginPage() {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f5f7fa"><title>Private demo access</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:22px;background:linear-gradient(135deg,#f5f7fa,#eaf1fb);color:#172b4d;font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{width:min(100%,390px);padding:32px;border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 18px 60px rgba(25,48,82,.12)}
  input,button{width:100%;padding:14px;border-radius:10px;font-size:15px}
  input{border:1px solid #dce3ec;margin-bottom:12px;color:#172b4d}
  button{border:0;background:#0870e8;color:#fff;font-weight:700;cursor:pointer}
  button:disabled{opacity:.6}
  #error{min-height:20px;color:#c53050;font-size:13px;margin:0 0 10px}
</style></head><body><main>
  <form id="form">
    <input id="key" type="password" autocomplete="current-password" required placeholder="Access key">
    <div id="error"></div>
    <button id="submit">Continue</button>
  </form>
</main>
<script>
  const form=document.getElementById('form'),key=document.getElementById('key'),error=document.getElementById('error'),button=document.getElementById('submit');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    button.disabled=true;
    error.textContent='';
    try{
      const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key.value})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data.ok){
        error.textContent=data.error==='rate_limited'?'Too many attempts. Try later.':data.error==='auth_not_configured'?'Access is not configured yet.':'Invalid key.';
        key.value='';
      } else {
        location.replace('/');
      }
    } catch {
      error.textContent='Could not verify access. Try again.';
    } finally {
      button.disabled=false;
    }
  });
</script></body></html>`;
}

export default function proxy(request) {
  const url = new URL(request.url);
  if (url.pathname === '/api/auth') {
    return next();
  }

  const secret = process.env.SITE_SESSION_SECRET;
  const accessKey = process.env.SITE_ACCESS_KEY;
  if (!secret || !accessKey) {
    return new Response('Access is not configured. Add SITE_ACCESS_KEY and SITE_SESSION_SECRET in Vercel Environment Variables.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)site_access=([^;]+)/);
  if (match && validSession(match, secret)) {
    return next();
  }

  return new Response(loginPage(), {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export const config = { runtime: 'nodejs' };
