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
└─ Interaction
   ├─ Listen
   ├─ Locate
   ├─ Decide
   ├─ Press
   └─ Speak
```

## 2. Modality roles

| Modality | Device | Role | Required |
|---|---|---|---|
| Auditory | Speaker | Q、案内、状態 | Core |
| Tactile | Vibration / keypad | 位置、操作、状態 | Core |
| Visual | Screen | 盤面、補助情報 | Optional |
| Voice input | Microphone | Aの入力 | Core |

視覚は**補助モダリティ**であり、RUSUDENの操作成立条件ではない。

## 3. Tactile ontology

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

## 4. Tactile semantics

| Event | Tactile signal | Meaning |
|---|---|---|
| touch `5` | strong vibration | Center / position acquired |
| press digit | short vibration | input accepted |
| `0` | long vibration | replay |
| `#` | two pulses | reply / confirm |
| `*` | three pulses | back / skip |
| invalid input | warning pulse | rejected |
| Q playback start | long pulse | listening starts |
| A recording start | long pulse | speaking starts |
| A recording end | two pulses | recording completed |

実装では振動パターンそのものを後から調整可能にし、意味と物理的パターンを分離する。

## 5. Accessibility invariant

RUSUDENの基本操作は、次の組み合わせだけで完結できることを要件とする。

```text
Speaker + Keypad + Microphone + Tactile feedback
```

つまり、**画面を見なくてもQを聴き、5を基準にキーを探し、操作し、Aを話せる**。

## 6. Experience ontology

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

- **Listen** = SpeakerからQを受け取る
- **Locate** = 触覚でCenter (`5`) を取得する
- **Decide** = 返信するか判断する
- **Press** = keypadを操作する
- **Speak** = microphoneからAを入力する

## 7. Design principle

> **Visual is optional. Auditory and tactile are first-class modalities.**

> **5 is not just a key. 5 is the spatial center of RUSUDEN.**

このオントロジにより、視覚障害者向けの「別UI」を作るのではなく、最初から**複数モダリティで同一のUXを成立させる**。
