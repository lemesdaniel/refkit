// src-script/index.ts
// Este arquivo é compilado para public/refkit.js via esbuild
(function () {
  const script = document.currentScript as HTMLScriptElement | null
  if (!script) return

  const programId = script.getAttribute('data-program') ?? ''
  const baseUrl = script.src.replace(/\/refkit\.js.*$/, '')

  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? decodeURIComponent(match[2]) : null
  }

  function setCookie(name: string, value: string, days: number): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
  }

  function generateId(): string {
    return 'rk_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  }

  // 1. Visitor token — cria se não existir
  let visitorToken = getCookie('rk_visitor')
  if (!visitorToken) {
    visitorToken = generateId()
    setCookie('rk_visitor', visitorToken, 30)
  }

  // 2. Detecta ?ref= e registra clique silenciosamente
  const ref = new URLSearchParams(location.search).get('ref')
  if (ref) {
    setCookie('rk_ref', ref, 30)
    fetch(baseUrl + '/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program_id: programId,
        slug: ref,
        visitor_token: visitorToken,
        referrer: document.referrer || null,
      }),
      keepalive: true,
    }).catch(() => {}) // nunca bloqueia o browser
  }

  // 3. Expõe visitorToken para o tenant ler e enviar ao próprio backend
  ;(window as any).Refkit = { visitorToken }
})()
