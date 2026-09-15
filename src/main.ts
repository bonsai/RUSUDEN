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
let pressedNumber = ''
let audioContext: AudioContext | null = null

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

function playPushTone(key: string) {
  const frequencies: Record<string, [number, number]> = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
  }
  const pair = frequencies[key]
  if (!pair) return
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  audioContext ??= new AudioCtx()
  if (audioContext.state === 'suspended') void audioContext.resume()
  const now = audioContext.currentTime
  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095)
  gain.connect(audioContext.destination)
  pair.forEach(frequency => {
    const oscillator = audioContext!.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    oscillator.start(now)
    oscillator.stop(now + 0.1)
  })
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

function callControlsMarkup() {
  return `<section class="call-controls" aria-label="通話操作">
    <button type="button" class="call-button call-button--start" data-action="call" aria-label="発信">●</button>
    <button type="button" class="call-button call-button--hangup" data-action="hangup" aria-label="切る">■</button>
  </section>`
}

function keypadMarkup() {
  const keys = ['1','2','3','4','5','6','7','8','9','*','0','#']
  const serviceNumbers = ['1417', '1418']
  return `<section class="board" aria-label="電話操作盤">
    <div class="number-display" aria-live="polite" aria-label="現在押されている番号">${pressedNumber || '—'}</div>
    <div class="keypad">${keys.map(key => `<button type="button" data-key="${key}" aria-label="${key}">${key}</button>`).join('')}</div>
    <div class="service-numbers" aria-label="サービス番号">${serviceNumbers.map(number => `<button type="button" data-number="${number}" aria-label="${number}">${number}</button>`).join('')}</div>
  </section>`
}

function render(stageMarkup = '') {
  app.innerHTML = `<main class="voice-shell">${callControlsMarkup()}${keypadMarkup()}${stageMarkup}</main>${debugMarkup()}`
  bindKeypad()
}

function handleCallAction(action: string) {
  if (action === 'call') {
    debugLog('call:start')
    if (stage === 'inbox') renderInbox()
    return
  }

  if (action === 'hangup') {
    speechSynthesis?.cancel()
    voiceState = 'listen'
    debugLog('call:hangup')
    renderInbox()
  }
}

function handleNumber(number: string) {
  number.split('').forEach(playPushTone)
  pressedNumber = number
  debugLog(`number:${number}`)
  render()
  speak(`${number}番です。`)
}

function handleKey(key: string) {
  playPushTone(key)
  pressedNumber += key
  render()
  debugLog(`dtmf:${key}`)

  if (stage === 'inbox' && /^[1-3]$/.test(key)) {
    currentCall = calls[Number(key) - 1]
    pressedNumber = key
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
  document.querySelectorAll<HTMLButtonElement>('[data-number]').forEach(button => button.addEventListener('click', () => handleNumber(button.dataset.number!)))
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', () => handleCallAction(button.dataset.action!)))
  window.onkeydown = event => {
    if (/^[0-9*#]$/.test(event.key)) handleKey(event.key)
  }
}

function renderInbox() {
  stage = 'inbox'
  currentCall = null
  voiceState = 'listen'
  pressedNumber = ''
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
