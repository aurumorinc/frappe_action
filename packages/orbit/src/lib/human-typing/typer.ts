import {
  DEFAULT_WPM, WPM_STD, AVG_WORD_LENGTH,
  PROB_ERROR, PROB_SWAP_ERROR, PROB_NOTICE_ERROR,
  SPEED_BOOST_COMMON_WORD, SPEED_PENALTY_COMPLEX_WORD,
  SPEED_BOOST_CLOSE_KEYS, SPEED_BOOST_BIGRAM,
  TIME_KEYSTROKE_STD, TIME_BACKSPACE_MEAN, TIME_BACKSPACE_STD,
  TIME_REACTION_MEAN, TIME_REACTION_STD,
  TIME_DIRECT_ACCENT_PENALTY, TIME_COMPOSED_ACCENT_PENALTY,
  TIME_UPPERCASE_PENALTY, TIME_SPACE_PAUSE_MEAN, TIME_SPACE_PAUSE_STD,
  FATIGUE_FACTOR, FATIGUE_CAP,
  DRIFT_CORRECTION_PROB, COMPLEX_WORD_ERROR_MULT,
  COMMON_WORD_ERROR_MULT, COMPOSED_ACCENT_ERROR_MULT,
  FAR_KEY_PENALTY, FAR_KEY_THRESHOLD, CLOSE_KEY_THRESHOLD,
  MIN_KEYSTROKE_TIME, MIN_REACTION_TIME, MIN_BACKSPACE_TIME,
  MIN_SPEED_MULTIPLIER,
} from './config';
import { KeyboardLayout } from './keyboard';
import { getWordDifficulty, isCommonBigram } from './language';

// Helper for normal distribution
function randomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

export interface TypingEvent {
  time: number;
  action: string;
  text: string;
  char?: string;
  delayMs: number;
}

export class TypingState {
  currentText: string = "";
  targetText: string = "";
  totalTime: number = 0.0;
  history: TypingEvent[] = [];
  lastCharTyped: string | null = null;
  fatigueMultiplier: number = 1.0;
  mentalCursorPos: number = 0;

  constructor(targetText: string) {
    this.targetText = targetText;
  }
}

export class MarkovTyper {
  private targetText: string;
  private keyboard: KeyboardLayout;
  private state: TypingState;
  private sessionWpm: number;
  private baseKeystrokeTime: number;

  constructor(targetText: string, targetWpm: number = DEFAULT_WPM, layout: string = "qwerty") {
    if (!targetText || targetText.length === 0) {
      throw new Error("targetText must be a non-empty string");
    }
    if (targetWpm <= 0) {
      throw new Error("targetWpm must be a positive number");
    }

    this.targetText = targetText;
    this.keyboard = new KeyboardLayout(layout);
    this.state = new TypingState(targetText);

    this.sessionWpm = Math.max(10, randomNormal(targetWpm, WPM_STD));
    this.baseKeystrokeTime = 60 / (this.sessionWpm * AVG_WORD_LENGTH);

    this.state.history.push({
      time: 0.0,
      action: `INIT (WPM: ${this.sessionWpm.toFixed(1)})`,
      text: "",
      delayMs: 0
    });
  }

  private getCurrentWordContext(): string | null {
    const idx = this.state.mentalCursorPos;
    if (idx >= this.targetText.length) return null;
    
    let start = idx;
    while (start > 0 && this.targetText[start - 1] !== ' ') start--;
    
    let end = idx;
    while (end < this.targetText.length && this.targetText[end] !== ' ') end++;
    
    return this.targetText.substring(start, end);
  }

  private calculateKeystrokeTime(charToType: string): number {
    let keystrokeTime = this.baseKeystrokeTime * this.state.fatigueMultiplier;

    const currentWord = this.getCurrentWordContext();
    if (currentWord) {
      const difficulty = getWordDifficulty(currentWord);
      if (difficulty === "common") {
        keystrokeTime *= SPEED_BOOST_COMMON_WORD;
      } else if (difficulty === "complex") {
        keystrokeTime *= SPEED_PENALTY_COMPLEX_WORD;
      }
    }

    if (this.state.lastCharTyped) {
      if (isCommonBigram(this.state.lastCharTyped, charToType)) {
        keystrokeTime *= SPEED_BOOST_BIGRAM;
      } else {
        const dist = this.keyboard.getDistance(this.state.lastCharTyped, charToType);
        if (dist > 0 && dist < CLOSE_KEY_THRESHOLD) {
          keystrokeTime *= SPEED_BOOST_CLOSE_KEYS;
        } else if (dist > FAR_KEY_THRESHOLD) {
          keystrokeTime *= FAR_KEY_PENALTY;
        }
      }
    }

    if (charToType === ' ') {
      keystrokeTime += randomNormal(TIME_SPACE_PAUSE_MEAN, TIME_SPACE_PAUSE_STD);
    } else if (this.keyboard.isComposedAccent(charToType)) {
      keystrokeTime += TIME_COMPOSED_ACCENT_PENALTY;
    } else if (this.keyboard.isDirectAccent(charToType)) {
      keystrokeTime += TIME_DIRECT_ACCENT_PENALTY;
    } else if (charToType === charToType.toUpperCase() && charToType.toLowerCase() !== charToType.toUpperCase()) {
      keystrokeTime += TIME_UPPERCASE_PENALTY;
    }

    keystrokeTime = Math.max(MIN_SPEED_MULTIPLIER * this.baseKeystrokeTime, keystrokeTime);

    const dt = randomNormal(keystrokeTime, TIME_KEYSTROKE_STD);
    return Math.max(MIN_KEYSTROKE_TIME, dt);
  }

  public step(): TypingEvent | null {
    if (this.state.currentText === this.targetText) {
      return null;
    }

    // --- MONITORING & CORRECTION PHASE ---
    let firstErrorPos = this.targetText.length;
    const minLen = Math.min(this.state.currentText.length, this.targetText.length);
    for (let i = 0; i < minLen; i++) {
      if (this.state.currentText[i] !== this.targetText[i]) {
        firstErrorPos = i;
        break;
      }
    }

    if (this.state.currentText.length > this.targetText.length && firstErrorPos === this.targetText.length) {
      firstErrorPos = this.targetText.length;
    }

    if (firstErrorPos < this.state.currentText.length) {
      let shouldCorrect = false;
      const lastAction = this.state.history.length > 0 ? this.state.history[this.state.history.length - 1].action : "";

      if (lastAction.includes("BACKSPACE")) {
        shouldCorrect = true;
      } else if (this.state.mentalCursorPos >= this.targetText.length) {
        shouldCorrect = true;
      } else if (this.state.currentText.length > 0) {
        const lastChar = this.state.currentText[this.state.currentText.length - 1];
        const distance = this.state.currentText.length - firstErrorPos;

        if (' \n\t.,;!?:()[]{}<>"\''.includes(lastChar)) {
          shouldCorrect = true;
        } else if (distance >= 2) {
          if (Math.random() < DRIFT_CORRECTION_PROB) {
            shouldCorrect = true;
          }
        } else if (distance === 1) {
          if (Math.random() < PROB_NOTICE_ERROR) {
            shouldCorrect = true;
          }
        }
      }

      if (shouldCorrect) {
        let delay = 0;
        if (!lastAction.includes("BACKSPACE")) {
          const dt = randomNormal(TIME_REACTION_MEAN, TIME_REACTION_STD);
          delay += Math.max(MIN_REACTION_TIME, dt);
        }

        const dt = Math.max(MIN_BACKSPACE_TIME, randomNormal(TIME_BACKSPACE_MEAN, TIME_BACKSPACE_STD));
        delay += dt;
        
        this.state.totalTime += delay;
        this.state.currentText = this.state.currentText.slice(0, -1);

        const event: TypingEvent = {
          time: this.state.totalTime,
          action: "BACKSPACE",
          text: this.state.currentText,
          delayMs: delay * 1000
        };
        this.state.history.push(event);
        this.state.mentalCursorPos = this.state.currentText.length;
        return event;
      }
    }

    // --- TYPING PHASE ---
    if (this.state.mentalCursorPos > this.state.currentText.length) {
      this.state.mentalCursorPos = this.state.currentText.length;
    }

    if (this.state.mentalCursorPos >= this.targetText.length) {
      return null;
    }

    const charIntended = this.targetText[this.state.mentalCursorPos];

    if (!this.keyboard.hasKey(charIntended) && charIntended !== ' ') {
      this.state.fatigueMultiplier = Math.min(FATIGUE_CAP, this.state.fatigueMultiplier * FATIGUE_FACTOR);
      let dt = this.baseKeystrokeTime * this.state.fatigueMultiplier;
      dt = Math.max(MIN_KEYSTROKE_TIME, randomNormal(dt, TIME_KEYSTROKE_STD));
      this.state.totalTime += dt;
      this.state.currentText += charIntended;
      this.state.lastCharTyped = charIntended;
      
      const event: TypingEvent = {
        time: this.state.totalTime,
        action: `TYPED '${charIntended}'`,
        text: this.state.currentText,
        char: charIntended,
        delayMs: dt * 1000
      };
      this.state.history.push(event);
      this.state.mentalCursorPos += 1;
      return event;
    }

    this.state.fatigueMultiplier = Math.min(FATIGUE_CAP, this.state.fatigueMultiplier * FATIGUE_FACTOR);

    if (this.targetText.length > this.state.mentalCursorPos + 1) {
      const charAfter = this.targetText[this.state.mentalCursorPos + 1];
      if (charAfter !== ' ' && charAfter !== charIntended) {
        if (Math.random() < PROB_SWAP_ERROR) {
          const dt1 = this.calculateKeystrokeTime(charAfter);
          this.state.totalTime += dt1;
          this.state.currentText += charAfter;

          const event1: TypingEvent = {
            time: this.state.totalTime,
            action: `TYPED_SWAP '${charAfter}'`,
            text: this.state.currentText,
            char: charAfter,
            delayMs: dt1 * 1000
          };
          this.state.history.push(event1);
          this.state.mentalCursorPos += 1;
          return event1;
        }
      }
    }

    let currentProbError = PROB_ERROR;
    const wordDiff = getWordDifficulty(this.getCurrentWordContext() || "");
    if (wordDiff === "complex") {
      currentProbError *= COMPLEX_WORD_ERROR_MULT;
    } else if (wordDiff === "common") {
      currentProbError *= COMMON_WORD_ERROR_MULT;
    }
    if (this.keyboard.isComposedAccent(charIntended)) {
      currentProbError *= COMPOSED_ACCENT_ERROR_MULT;
    }

    if (Math.random() < currentProbError) {
      const wrongChar = this.keyboard.getRandomNeighbor(charIntended);
      const dt = this.calculateKeystrokeTime(wrongChar);
      this.state.totalTime += dt;
      this.state.currentText += wrongChar;
      this.state.lastCharTyped = wrongChar;
      
      const event: TypingEvent = {
        time: this.state.totalTime,
        action: `TYPED_ERROR '${wrongChar}'`,
        text: this.state.currentText,
        char: wrongChar,
        delayMs: dt * 1000
      };
      this.state.history.push(event);
      this.state.mentalCursorPos += 1;
      return event;
    } else {
      const dt = this.calculateKeystrokeTime(charIntended);
      this.state.totalTime += dt;
      this.state.currentText += charIntended;
      this.state.lastCharTyped = charIntended;
      
      const event: TypingEvent = {
        time: this.state.totalTime,
        action: `TYPED '${charIntended}'`,
        text: this.state.currentText,
        char: charIntended,
        delayMs: dt * 1000
      };
      this.state.history.push(event);
      this.state.mentalCursorPos += 1;
      return event;
    }
  }

  public run(): { totalTime: number; history: TypingEvent[] } {
    let steps = 0;
    const maxSteps = this.targetText.length * 10;
    while (this.step() !== null) {
      steps++;
      if (steps > maxSteps) break;
    }
    return { totalTime: this.state.totalTime, history: this.state.history };
  }
}
