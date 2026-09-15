import './style.css'

type Call = {
  id: number
  title: string
  message: string
  voice: string
}

const calls: Call[] = [
  { id: 1, title: '今日のあなたへ', message: '今日は、少しだけ立ち止まってみない？', voice: '今日のあなたへ。今日は、少しだけ立ち止まってみない？' },
  { id: 2, title: '夜からの電話', message: '眠る前に、ひとつ聞いてほしいことがある。', voice: '夜からの電話。眠る前に、ひとつ聞いてほしいことがある。' },
  { id: 3, title: '知らない誰か', message: 'あなたに、まだ答えていない質問があります。', voice: '知らない誰か。あなたに、まだ答えていない質問があります。' },
]

let answered: Call | null = null
let transcript = ''

const app = document.querySelector<HTMLDivElement>('#app')!

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.9
  speechSynthesis.speak(utterance)
}

function renderInbox() {
  app.innerHTML = `
    <section class="shell">
      <p class="eyebrow">RUSUDEN / DIAL P2</p>
      <h1>留守電</h1>
      <p class="lead">電話が、いくつか届いています。</p>
      <div class="calls">
        ${calls.map(call => `
          <button class="call" data-call="${call.id}">
            <span class="dot"></span>
            <span><strong>${call.title}</strong><small>${call.message}</small></span>
            <span class="arrow">→</span>
          </button>
        `).join('')}
      </div>
      <p class="hint">どれかひとつ、出てみてください。</p>
    </section>
  `

  document.querySelectorAll<HTMLButtonElement>('[data-call]').forEach(button => {
    button.addEventListener('click', () => {
      answered = calls.find(call => call.id === Number(button.dataset.call)) ?? null
      if (answered) renderCall(answered)
    })
  })
}

function renderCall(call: Call) {
  transcript = ''
  app.innerHTML = `
    <section class="shell call-screen">
      <p class="eyebrow">着信 ${String(call.id).padStart(2, '0')}</p>
      <div class="receiver"><span class="pulse"></span></div>
      <h1>${call.title}</h1>
      <p class="message">${call.message}</p>
      <div class="actions">
        <button id="listen" class="primary">電話に出る</button>
        <button id="back" class="ghost">戻る</button>
      </div>
    </section>
  `

  document.querySelector('#listen')?.addEventListener('click', () => {
    speak(call.voice)
    renderConversation(call)
  })
  document.querySelector('#back')?.addEventListener('click', renderInbox)
}

function renderConversation(call: Call) {
  app.innerHTML = `
    <section class="shell conversation">
      <p class="eyebrow">通話中</p>
      <div class="receiver small"><span class="pulse"></span></div>
      <p class="message">${call.message}</p>
      <p id="transcript" class="transcript">${transcript || 'あなたの番です。'}</p>
      <div class="actions">
        <button id="talk" class="primary">話す</button>
        <button id="replay" class="ghost">もう一度聴く</button>
      </div>
      <div class="question">
        <label for="question">自分から質問する</label>
        <div class="row">
          <input id="question" placeholder="聞いてみる…" autocomplete="off" />
          <button id="ask" class="primary">送る</button>
        </div>
      </div>
      <button id="hangup" class="end">電話を切る</button>
    </section>
  `

  const question = document.querySelector<HTMLInputElement>('#question')!
  const transcriptEl = document.querySelector<HTMLParagraphElement>('#transcript')!

  document.querySelector('#replay')?.addEventListener('click', () => speak(call.voice))
  document.querySelector('#back')?.addEventListener('click', renderInbox)
  document.querySelector('#hangup')?.addEventListener('click', renderInbox)

  document.querySelector('#ask')?.addEventListener('click', () => {
    const text = question.value.trim()
    if (!text) return
    transcript = text
    transcriptEl.textContent = `「${text}」`
    const reply = `うん。${text}って聞いてくれたんだね。もう少し話してみようか。`
    setTimeout(() => {
      transcriptEl.textContent = reply
      speak(reply)
    }, 250)
    question.value = ''
  })

  document.querySelector('#talk')?.addEventListener('click', () => {
    const SpeechRecognition = (window as typeof window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
    if (!SpeechRecognition) {
      transcriptEl.textContent = 'このブラウザでは音声入力に対応していません。下の質問欄を使えます。'
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript as string
      transcriptEl.textContent = `「${text}」`
      const reply = `うん。${text}。聞いてるよ。`
      setTimeout(() => {
        transcriptEl.textContent = reply
        speak(reply)
      }, 250)
    }
    recognition.start()
  })
}

renderInbox()
