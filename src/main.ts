import './style.css'

type Call = { id: number; title: string; question: string; voice: string }
type Mode = 'normal' | 'debug'
type VoiceState = 'listen' | 'speak'
type Stage = 'inbox' | 'q' | 'reply' | 'answer'

const calls: Call[] = [
  { id: 1, title: '今日のあなたへ', question: '今日は、少しだけ立ち止まってみない？', voice: '今日のあなたへ。今日は、少しだけ立ち止まってみない？' },
  { id: 2, title: '夜からの電話', question: '眠る前に、ひとつ聞いてほしいことはありますか？', voice: '夜からの電話。眠る前に、ひとつ聞いてほしいことはありますか？' },
  { id: 3, title: '知らない誰か', question: 'あなたなら、この問いにどう答えますか？', voice: '知らない誰か。あなたなら、この問いにどう答えますか？' },
]

const mode: Mode = new URLSearchParams(location.search).get('debug') === '1' ? 'debug' : 'normal'
let voiceState: VoiceState = 'listen'
let stage: Stage = 'inbox'
let currentCall: Call | null = null
let lastEvent = 'ready'

const app = document.querySelector<HTMLDivElement>('#app')!

function debugMarkup() {
  if (mode !== 'debug') return ''
  return `<aside class="debug-panel"><strong>DEBUG</strong><span>mode: ${mode}</span><span>stage: ${stage}</span><span>state: ${voiceState}</span><span>call: ${currentCall?.title ?? '-'}</span><span>event: ${lastEvent}</span></aside>`
}

function debugLog(event: string) {
  lastEvent = event
  const panel = document.querySelector('.debug-panel')
  if (panel) panel.outerHTML = debugMarkup()
}

function speak(text: string, onEnd?: () => void) {
  voiceState = 'speak'
  debugLog('tts:start')
  if (!('speechSynthesis' in window)) {
    voiceState = 'listen'
    onEnd?.()
    return
  }
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.9
  utterance.onend = () => { voiceState = 'listen'; debugLog('tts:end'); onEnd?.() }
  speechSynthesis.speak(utterance)
}

function keypadMarkup() {
  return `<section class="board" aria-label="電話操作盤"><div class="keypad">${['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => `<button type="button" data-key="${key}" aria-label="${key}">${key}</button>`).join('')}</div></section>`
}

function render(stageMarkup = '') {
  const presence = mode === 'debug' ? keypadMarkup() : '<div class="presence"><span class="dot"></span></div>'
  app.innerHTML = `<main class="voice-shell">${presence}${stageMarkup}</main>${debugMarkup()}`
  bindKeypad()
}

function handleKey(key: string) {
  debugLog(`dtmf:${key}`)

  if (stage === 'inbox' && /^[1-3]$/.test(key)) {
    currentCall = calls[Number(key) - 1]
    renderQuestion(currentCall)
    return
  }

  if (stage === 'q' && key === '0' && currentCall) {
    speak(currentCall.voice)
    return
  }

  if (stage === 'q' && key === '#') {
    renderReplyPrompt()
    return
  }

  if (stage === 'reply' && key === '#') {
    renderAnswer()
    return
  }

  if ((stage === 'q' || stage === 'reply') && key === '*') {
    renderInbox()
    return
  }

  if (stage === 'reply' && key === '0' && currentCall) {
    renderQuestion(currentCall)
    return
  }

  if (stage === 'answer' && key === '*') renderInbox()
}

function bindKeypad() {
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button => button.addEventListener('click', () => handleKey(button.dataset.key!)))
  window.onkeydown = event => {
    if (/^[0-9*#]$/.test(event.key)) handleKey(event.key)
  }
}

function renderInbox() {
  stage = 'inbox'
  currentCall = null
  voiceState = 'listen'
  render()
  debugLog('inbox:ready')
  setTimeout(() => speak('新しい録音が3件あります。1、2、3のどれかを押してください。'), 150)
}

function renderQuestion(call: Call) {
  stage = 'q'
  voiceState = 'listen'
  render()
  debugLog('q:play')
  speak(call.voice, renderReplyPrompt)
}

function renderReplyPrompt() {
  stage = 'reply'
  voiceState = 'listen'
  render()
  debugLog('q:reply-prompt')
  speak('この録音に返信しますか？')
}

function renderAnswer() {
  stage = 'answer'
  voiceState = 'listen'
  render()
  debugLog('a:listen')
  speak('どうぞ。答えだけ吹き込んでください。')
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
    debugLog(`a:recorded:${text}`)
    speak('ありがとうございました。', renderInbox)
  }
  recognition.onerror = () => debugLog('asr:error')
  recognition.onend = () => debugLog('asr:end')
  recognition.start()
  debugLog('asr:start')
}

renderInbox()
