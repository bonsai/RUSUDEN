import './style.css'

type Call = { id: number; title: string; message: string; voice: string }
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
let lastEvent = 'ready'

const app = document.querySelector<HTMLDivElement>('#app')!

function debugMarkup() {
  if (mode !== 'debug') return ''
  return `<aside class="debug-panel"><strong>DEBUG</strong><span>mode: ${mode}</span><span>state: ${voiceState}</span><span>call: ${currentCall?.title ?? '-'}</span><span>event: ${lastEvent}</span></aside>`
}

function debugLog(event: string) {
  lastEvent = event
  const panel = document.querySelector('.debug-panel')
  if (panel) panel.outerHTML = debugMarkup()
}

function speak(text: string) {
  voiceState = 'speak'
  debugLog('tts:start')
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.9
  utterance.onend = () => { voiceState = 'listen'; debugLog('tts:end') }
  speechSynthesis.speak(utterance)
}

function keypadMarkup() {
  return `<section class="board" aria-label="電話操作盤"><div class="keypad">${['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => `<button type="button" data-key="${key}" aria-label="${key}">${key}</button>`).join('')}</div></section>`
}

function handleKey(key: string) {
  debugLog(`dtmf:${key}`)
  if (!currentCall && /^[1-3]$/.test(key)) {
    currentCall = calls[Number(key) - 1]
    renderCall(currentCall)
    return
  }
  if (currentCall && key === '#') {
    renderConversation(currentCall)
    return
  }
  if (currentCall && key === '0') speak(currentCall.voice)
  if (currentCall && key === '*') renderInbox()
}

function bindKeypad() {
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button => button.addEventListener('click', () => handleKey(button.dataset.key!)))
  window.onkeydown = event => {
    if (/^[0-9*#]$/.test(event.key)) handleKey(event.key)
  }
}

function renderInbox() {
  currentCall = null
  voiceState = 'listen'
  app.innerHTML = `<main class="voice-shell">${mode === 'debug' ? keypadMarkup() : '<div class="presence"><span class="dot"></span></div>'}${debugMarkup()}</main>`
  bindKeypad()
  debugLog('inbox:ready')
  setTimeout(() => speak('新しい録音が3件あります。1、2、3のどれかを押してください。'), 150)
}

function renderCall(call: Call) {
  voiceState = 'listen'
  app.innerHTML = `<main class="voice-shell">${mode === 'debug' ? keypadMarkup() : '<div class="presence"><span class="pulse"></span></div>'}${debugMarkup()}</main>`
  bindKeypad()
  debugLog('call:incoming')
  speak(call.voice)
}

function renderConversation(call: Call) {
  voiceState = 'listen'
  app.innerHTML = `<main class="voice-shell">${mode === 'debug' ? keypadMarkup() : '<div class="presence"><span class="pulse"></span></div>'}${debugMarkup()}</main>`
  bindKeypad()
  debugLog('call:connected')
  speak('……まだいるよ。話して。')
  startVoiceInput()
}

function startVoiceInput() {
  const SpeechRecognition = (window as typeof window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
  if (!SpeechRecognition) { debugLog('asr:unsupported'); return }
  const recognition = new SpeechRecognition()
  recognition.lang = 'ja-JP'
  recognition.interimResults = false
  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript as string
    debugLog(`asr:result:${text}`)
    setTimeout(() => speak(`うん。${text}。聞いてるよ。`), 250)
  }
  recognition.onerror = () => debugLog('asr:error')
  recognition.start()
  debugLog('asr:start')
}

renderInbox()
