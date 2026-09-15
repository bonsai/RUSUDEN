import './style.css'

type Call = {
  id: number
  title: string
  message: string
  voice: string
}

type Mode = 'normal' | 'debug'
type VoiceState = 'listen' | 'speak'

const calls: Call[] = [
  { id: 1, title: '今日のあなたへ', message: '今日は、少しだけ立ち止まってみない？', voice: '今日のあなたへ。今日は、少しだけ立ち止まってみない？' },
  { id: 2, title: '夜からの電話', message: '眠る前に、ひとつ聞いてほしいことがある。', voice: '夜からの電話。眠る前に、ひとつ聞いてほしいことがある。' },
  { id: 3, title: '知らない誰か', message: 'あなたに、まだ答えていない質問があります。', voice: '知らない誰か。あなたに、まだ答えていない質問があります。' },
]

const mode: Mode = new URLSearchParams(location.search).get('debug') === '1' ? 'debug' : 'normal'
let voiceState: VoiceState = 'listen'
let currentCall: Call | null = null
let transcript = ''
let lastEvent = 'ready'

const app = document.querySelector<HTMLDivElement>('#app')!

function debugLog(event: string) {
  lastEvent = event
  const panel = document.querySelector<HTMLElement>('#debug-panel')
  if (panel) panel.innerHTML = debugMarkup()
}

function debugMarkup() {
  return `<aside id="debug-panel" class="debug-panel"><strong>DEBUG</strong><span>mode: ${mode}</span><span>state: ${voiceState}</span><span>call: ${currentCall?.title ?? '-'}</span><span>event: ${lastEvent}</span></aside>`
}

function speak(text: string) {
  voiceState = 'speak'
  debugLog('tts:start')
  if (!('speechSynthesis' in window)) {
    voiceState = 'listen'
    debugLog('tts:unsupported')
    return
  }
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.9
  utterance.onend = () => {
    voiceState = 'listen'
    debugLog('tts:end')
  }
  speechSynthesis.speak(utterance)
}

function renderDebug() {
  if (mode !== 'debug') return ''
  return debugMarkup()
}

function renderInbox() {
  currentCall = null
  voiceState = 'listen'
  app.innerHTML = `
    <main class="voice-shell">
      <div class="presence" aria-hidden="true"><span class="dot"></span></div>
      ${renderDebug()}
    </main>
  `
  debugLog('inbox:ready')
  // Normal mode is intentionally voice-only. The POC still exposes the inbox
  // through debug mode so the flow remains testable.
  if (mode === 'debug') renderDebugInbox()
  else {
    speak('……もしもし。電話がいくつか届いています。どれに出ますか？')
    // Voice selection is intentionally deferred to the next voice-input step.
    // For the POC, a debug URL remains available for deterministic call selection.
  }
}

function renderDebugInbox() {
  app.innerHTML = `
    <section class="debug-ui">
      <p class="eyebrow">RUSUDEN / DEBUG</p>
      <h1>着信一覧</h1>
      <div class="calls">
        ${calls.map(call => `
          <button class="call" data-call="${call.id}">
            <span class="dot"></span>
            <span><strong>${call.title}</strong><small>${call.message}</small></span>
            <span class="arrow">→</span>
          </button>
        `).join('')}
      </div>
      ${renderDebug()}
    </section>
  `
  document.querySelectorAll<HTMLButtonElement>('[data-call]').forEach(button => {
    button.addEventListener('click', () => {
      currentCall = calls.find(call => call.id === Number(button.dataset.call)) ?? null
      if (currentCall) renderCall(currentCall)
    })
  })
  debugLog('inbox:debug')
}

function renderCall(call: Call) {
  voiceState = 'listen'
  app.innerHTML = `
    <main class="voice-shell">
      <div class="presence" aria-hidden="true"><span class="pulse"></span></div>
      ${mode === 'debug' ? `<section class="debug-ui"><p class="eyebrow">着信 ${String(call.id).padStart(2, '0')}</p><h1>${call.title}</h1><p class="message">${call.message}</p><div class="actions"><button id="listen" class="primary">電話に出る</button><button id="back" class="ghost">戻る</button></div></section>` : ''}
      ${renderDebug()}
    </main>
  `
  debugLog('call:incoming')
  speak(call.voice)
  document.querySelector('#listen')?.addEventListener('click', () => renderConversation(call))
  document.querySelector('#back')?.addEventListener('click', renderInbox)

  if (mode === 'normal') {
    setTimeout(() => renderConversation(call), 2500)
  }
}

function renderConversation(call: Call) {
  voiceState = 'listen'
  app.innerHTML = `
    <main class="voice-shell">
      <div class="presence" aria-hidden="true"><span class="pulse"></span></div>
      ${mode === 'debug' ? `<section class="debug-ui conversation"><p class="eyebrow">通話中</p><p class="message">${call.message}</p><p id="transcript" class="transcript">${transcript || 'あなたの番です。'}</p><div class="actions"><button id="talk" class="primary">話す</button><button id="replay" class="ghost">もう一度聴く</button></div><div class="question"><label for="question">自分から質問する</label><div class="row"><input id="question" placeholder="聞いてみる…" autocomplete="off" /><button id="ask" class="primary">送る</button></div></div><button id="hangup" class="end">電話を切る</button></section>` : ''}
      ${renderDebug()}
    </main>
  `
  debugLog('call:connected')

  if (mode === 'normal') {
    speak('……まだいるよ。話して。')
    startVoiceInput(call)
    return
  }

  const question = document.querySelector<HTMLInputElement>('#question')!
  const transcriptEl = document.querySelector<HTMLParagraphElement>('#transcript')!
  document.querySelector('#replay')?.addEventListener('click', () => speak(call.voice))
  document.querySelector('#hangup')?.addEventListener('click', renderInbox)
  document.querySelector('#ask')?.addEventListener('click', () => ask(call, question.value, transcriptEl, question))
  document.querySelector('#talk')?.addEventListener('click', () => startVoiceInput(call, transcriptEl))
}

function ask(call: Call, text: string, transcriptEl?: HTMLElement | null, input?: HTMLInputElement) {
  const value = text.trim()
  if (!value) return
  transcript = value
  if (transcriptEl) transcriptEl.textContent = `「${value}」`
  debugLog('input:question')
  const reply = `うん。${value}って聞いてくれたんだね。もう少し話してみようか。`
  setTimeout(() => {
    if (transcriptEl) transcriptEl.textContent = reply
    speak(reply)
  }, 250)
  if (input) input.value = ''
}

function startVoiceInput(call: Call, transcriptEl?: HTMLElement | null) {
  const SpeechRecognition = (window as typeof window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
  if (!SpeechRecognition) {
    debugLog('asr:unsupported')
    if (transcriptEl) transcriptEl.textContent = '音声入力に対応していません。'
    return
  }
  voiceState = 'listen'
  debugLog('asr:start')
  const recognition = new SpeechRecognition()
  recognition.lang = 'ja-JP'
  recognition.interimResults = false
  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript as string
    debugLog('asr:result')
    if (transcriptEl) transcriptEl.textContent = `「${text}」`
    const reply = `うん。${text}。聞いてるよ。`
    setTimeout(() => {
      if (transcriptEl) transcriptEl.textContent = reply
      speak(reply)
    }, 250)
  }
  recognition.onerror = () => debugLog('asr:error')
  recognition.start()
}

renderInbox()
