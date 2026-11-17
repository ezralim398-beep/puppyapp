// Cloudflare Worker：保管 API Key 的聊天代理
// 部署：Workers → 新建 → 粘贴本文件；Settings → Variables 里添加 Secret：ANTHROPIC_API_KEY
// 可选变量：ALLOWED_ORIGIN（你的网站地址，如 https://you.github.io）、MODEL
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    let body;
    try { body = await req.json(); } catch { return new Response('{"error":"bad json"}', { status: 400, headers: cors }); }
    const messages = (body.messages || []).slice(-12).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 500)
    }));
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.MODEL || 'claude-haiku-5-5', max_tokens: 300, system: String(body.system || '').slice(0, 2500), messages })
    });
    const d = await r.json();
    const reply = (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return new Response(JSON.stringify({ reply }), { status: r.ok ? 200 : 502, headers: { ...cors, 'content-type': 'application/json' } });
  }
};
