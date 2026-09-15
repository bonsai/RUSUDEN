# RUSUDEN Modal Ontology

RUSUDENは、UIを画面ではなく**感覚モダリティ（modality）と状態の関係**として定義する。

## 1. Core ontology

```text
RUSUDEN
├─ Experience
│  ├─ Q  問い
│  └─ A  答え
│
├─ Modality
│  ├─ Auditory   聴覚
│  │  ├─ Speaker
│  │  ├─ Q playback
│  │  └─ guidance / feedback
│  │
│  ├─ Tactile    触覚
│  │  ├─ Key
│  │  ├─ Position
│  │  ├─ Center
│  │  └─ State feedback
│  │
│  └─ Visual     視覚
│     └─ Keypad / auxiliary display
│
├─ Call Control
│  ├─ Outgoing / 発信
│  │  └─ Green button
│  └─ Hangup / 切る
│     └─ Red button
│
└─ Interaction
   ├─ Listen
   ├─ Locate
   ├─ Decide
   ├─ Press
   ├─ Call
   ├─ Hangup
   └─ Speak
```

## 2. Modality roles

| Modality | Device | Role | Required |
|---|---|---|---|
| Auditory | Speaker | Q、案内、状態 | Core |
| Tactile | Vibration / keypad | 位置、操作、状態 | Core |
| Visual | Screen | 盤面、補助情報 | Optional |
| Voice input | Microphone | Aの入力 | Core |
| Call control | Green / red buttons | 発信 / 切る | Core |

視覚は**補助モダリティ**であり、RUSUDENの操作成立条件ではない。

## 3. Call-control ontology

```text
Call
├─ Outgoing
│  ├─ Button: Green
│  └─ Action: Call
│
└─ Termination
   ├─ Button: Red
   └─ Action: Hangup
```

- **緑ボタン = 発信**
- **赤ボタン = 切る**
- どちらも電話操作の基本ボタンとして常時アクセス可能にする。
- 視覚的な色だけに依存せず、位置・形状・音声・触覚フィードバックでも意味を識別できるようにする。

## 4. Tactile ontology

電話盤の物理配置を空間オントロジとして扱う。

```text
1 ─ 2 ─ 3
│   │   │
4 ─ 5 ─ 6
│   │   │
7 ─ 8 ─ 9
    │
    0
```

### Center

`5` は**Center**である。

```text
5
└─ Center
   ├─ spatial reference
   ├─ tactile anchor
   └─ orientation recovery
```

`5` に触れたことを検出した場合、他のキーより**強い振動**を返す。

これは単なる操作フィードバックではなく、視覚を使わないユーザーが盤面上の自己位置を再取得するための**空間アンカー**である。

## 5. Tactile semantics

| Event | Tactile signal | Meaning |
|---|---|---|
| touch `5` | strong vibration | Center / position acquired |
| press digit | short vibration | input accepted |
| `0` | long vibration | replay |
| `#` | two pulses | reply / confirm |
| `*` | three pulses | back / skip |
| green | long pulse | outgoing / call |
| red | two pulses | hangup / termination |
| invalid input | warning pulse | rejected |
| Q playback start | long pulse | listening starts |
| A recording start | long pulse | speaking starts |
| A recording end | two pulses | recording completed |

実装では振動パターンそのものを後から調整可能にし、意味と物理的パターンを分離する。

## 6. Accessibility invariant

RUSUDENの基本操作は、次の組み合わせだけで完結できることを要件とする。

```text
Speaker + Keypad + Microphone + Tactile feedback
              + Call / Hangup controls
```

つまり、**画面を見なくてもQを聴き、5を基準にキーを探し、発信・切断し、操作し、Aを話せる**。

## 7. Experience ontology

```text
Listen
  ↓
Locate
  ↓
Decide
  ↓
Press
  ↓
Speak
```

通話制御を含む場合：

```text
Call
  ↓
Listen
  ↓
Locate
  ↓
Decide
  ↓
Press
  ↓
Speak
  ↓
Hangup
```

- **Listen** = SpeakerからQを受け取る
- **Locate** = 触覚でCenter (`5`) を取得する
- **Decide** = 返信するか判断する
- **Press** = keypadまたはCall/Hangup buttonを操作する
- **Speak** = microphoneからAを入力する
- **Call** = 緑ボタンで発信する
- **Hangup** = 赤ボタンで切る

## 8. Design principle

> **Visual is optional. Auditory and tactile are first-class modalities.**

> **5 is not just a key. 5 is the spatial center of RUSUDEN.**

> **Green means Call. Red means Hangup.**

色だけに意味を依存せず、位置・形状・音声・触覚を組み合わせて同じ操作意味を伝える。

このオントロジにより、視覚障害者向けの「別UI」を作るのではなく、最初から**複数モダリティで同一のUXを成立させる**。
