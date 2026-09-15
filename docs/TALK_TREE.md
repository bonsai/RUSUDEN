# RUSUDEN Talk Tree

RUSUDEN is a **Q → A** voice experience. The app does not continue a conversation after A; it receives a Q and gives the user the opportunity to record an answer.

## Main flow

```text
START
  ↓
「新しい録音が3件あります」
  ↓
1 / 2 / 3 でQを選ぶ
  ↓
Qを再生
  ↓
「この録音に返信しますか？」
  ├─ # → YES / Aを録音
  │        ↓
  │      Aを吹き込む
  │        ↓
  │      Aを保存
  │        ↓
  │      次のQ
  │
  ├─ * → NO / 次のQ
  │
  └─ 0 → Qをもう一度再生
```

## Q

Q is a received recording that ends in a question form.

Examples:

- 「日本で一番高い山は？」
- 「最近、ちょっと悩んでいることがあります。あなたならどうしますか？」
- 「明日の自分に、ひとことありますか？」

The Q Quality Agent checks whether the recording should enter circulation.

```text
recording
  ↓
Q Quality Agent
  ├─ allow  → circulation
  ├─ review → hold
  └─ reject → do not circulate
```

## A

A is **answer only**.

After the user records A:

```text
A recorded
  ↓
save
  ↓
「ありがとうございました」
  ↓
next Q / inbox
```

The app does not generate a conversational reply to A.

## Telephone board

The GUI is only the telephone control board:

```text
┌─────────┐
│ 1 2 3   │
│ 4 5 6   │
│ 7 8 9   │
│ * 0 #   │
└─────────┘
```

- `1–3`: select Q
- `#`: reply / record A
- `*`: skip / return
- `0`: replay Q

Normal mode hides the board visually; debug mode exposes the board for testing.

## State machine

```text
INBOX
  │ 1–3
  ▼
Q_PLAYING
  │ Q ends
  ▼
REPLY_PROMPT
  ├─ 0 ───────────────→ Q_PLAYING
  ├─ * ───────────────→ INBOX
  └─ #
       ▼
    A_LISTENING
       │ speech
       ▼
    A_RECORDED
       │ save
       ▼
    INBOX
```
