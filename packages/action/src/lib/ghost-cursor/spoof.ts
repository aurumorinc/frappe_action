import {
  type Vector,
  type TimedVector,
  bezierCurve,
  bezierCurveSpeed,
  direction,
  magnitude,
  origin,
  overshoot,
  add,
  clamp,
  scale,
  extrapolate
} from './math';
import { CDPService } from '../../repositories/browser/cdp';
import baseLogger from '../../utils/logging';

const log = baseLogger.child({ context: 'ghost-cursor' });

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoxOptions {
  paddingPercentage?: number;
  destination?: Vector;
}

export interface ScrollOptions {
  scrollSpeed?: number;
  scrollDelay?: number;
}

export interface ScrollIntoViewOptions extends ScrollOptions {
  scrollSpeed?: number;
  scrollDelay?: number;
  inViewportMargin?: number;
}

export interface MoveOptions extends BoxOptions, ScrollIntoViewOptions, Pick<PathOptions, 'moveSpeed'> {
  moveDelay?: number;
  randomizeMoveDelay?: boolean;
  maxTries?: number;
  overshootThreshold?: number;
}

export interface ClickOptions extends MoveOptions {
  hesitate?: number;
  waitForClick?: number;
  moveDelay?: number;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

export interface PathOptions {
  spreadOverride?: number;
  moveSpeed?: number;
  useTimestamps?: boolean;
}

export interface RandomMoveOptions extends Pick<MoveOptions, 'moveDelay' | 'randomizeMoveDelay' | 'moveSpeed'> {
  moveDelay?: number;
}

export interface MoveToOptions extends PathOptions, Pick<MoveOptions, 'moveDelay' | 'randomizeMoveDelay'> {
  moveDelay?: number;
}

export type ScrollToDestination = Partial<Vector> | 'top' | 'bottom' | 'left' | 'right';

export type MouseButtonOptions = Pick<ClickOptions, 'button' | 'clickCount'>;

export interface DefaultOptions {
  randomMove?: RandomMoveOptions;
  move?: MoveOptions;
  moveTo?: MoveToOptions;
  click?: ClickOptions;
  scroll?: ScrollOptions & ScrollIntoViewOptions;
}

const delay = async (ms: number): Promise<void> => {
  if (ms < 1) return;
  return await new Promise((resolve) => setTimeout(resolve, ms));
};

const fitts = (distance: number, width: number): number => {
  const a = 0;
  const b = 2;
  const id = Math.log2(distance / width + 1);
  return a + b * id;
};

const getRandomBoxPoint = (
  { x, y, width, height }: BoundingBox,
  options?: Pick<BoxOptions, 'paddingPercentage'>
): Vector => {
  let paddingWidth = 0;
  let paddingHeight = 0;

  if (
    options?.paddingPercentage !== undefined &&
    options?.paddingPercentage > 0 &&
    options?.paddingPercentage <= 100
  ) {
    paddingWidth = (width * options.paddingPercentage) / 100;
    paddingHeight = (height * options.paddingPercentage) / 100;
  }

  return {
    x: x + paddingWidth / 2 + Math.random() * (width - paddingWidth),
    y: y + paddingHeight / 2 + Math.random() * (height - paddingHeight)
  };
};

export function path(
  start: Vector,
  end: Vector | BoundingBox,
  options?: number | PathOptions
): Vector[] | TimedVector[] {
  const optionsResolved: PathOptions = typeof options === 'number'
    ? { spreadOverride: options }
    : { ...options };

  const DEFAULT_WIDTH = 100;
  const MIN_STEPS = 25;
  const width = 'width' in end && end.width !== 0 ? end.width : DEFAULT_WIDTH;
  const curve = bezierCurve(start, end, optionsResolved.spreadOverride);
  const length = curve.length() * 0.8;

  const speed = optionsResolved.moveSpeed !== undefined && optionsResolved.moveSpeed > 0
    ? (25 / optionsResolved.moveSpeed)
    : Math.random();
  const baseTime = speed * MIN_STEPS;
  const steps = Math.ceil((Math.log2(fitts(length, width) + 1) + baseTime) * 3);
  const re = curve.getLUT(steps);
  return clampPositive(re, optionsResolved);
}

const clampPositive = (vectors: Vector[], options?: PathOptions): Vector[] | TimedVector[] => {
  const clampedVectors = vectors.map((vector) => ({
    x: Math.max(0, vector.x),
    y: Math.max(0, vector.y)
  }));

  return options?.useTimestamps === true ? generateTimestamps(clampedVectors, options) : clampedVectors;
};

const generateTimestamps = (vectors: Vector[], options?: PathOptions): TimedVector[] => {
  const speed = options?.moveSpeed ?? (Math.random() * 0.5 + 0.5);
  const timeToMove = (P0: Vector, P1: Vector, P2: Vector, P3: Vector, samples: number): number => {
    let total = 0;
    const dt = 1 / samples;

    for (let t = 0; t < 1; t += dt) {
      const v1 = bezierCurveSpeed(t * dt, P0, P1, P2, P3);
      const v2 = bezierCurveSpeed(t, P0, P1, P2, P3);
      total += (v1 + v2) * dt / 2;
    }

    return Math.round(total / speed);
  };

  const timedVectors: TimedVector[] = [];

  for (let i = 0; i < vectors.length; i++) {
    if (i === 0) {
      timedVectors.push({ ...vectors[i], timestamp: Date.now() });
    } else {
      const P0 = vectors[i - 1];
      const P1 = vectors[i];
      const P2 = i + 1 < vectors.length ? vectors[i + 1] : extrapolate(P0, P1);
      const P3 = i + 2 < vectors.length ? vectors[i + 2] : extrapolate(P1, P2);
      const time = timeToMove(P0, P1, P2, P3, vectors.length);

      timedVectors.push({
        ...vectors[i],
        timestamp: timedVectors[i - 1].timestamp + time
      });
    }
  }

  return timedVectors;
};

const shouldOvershoot = (a: Vector, b: Vector, threshold: number): boolean =>
  magnitude(direction(a, b)) > threshold;

const intersectsElement = (vec: Vector, box: BoundingBox): boolean => {
  return (
    vec.x > box.x &&
    vec.x <= box.x + box.width &&
    vec.y > box.y &&
    vec.y <= box.y + box.height
  );
};

export class GhostCursor {
  public readonly tabId: number;
  public defaultOptions: DefaultOptions;

  private location: Vector;
  private moving: boolean = false;

  private static readonly OVERSHOOT_SPREAD = 10;
  private static readonly OVERSHOOT_RADIUS = 120;

  constructor(
    tabId: number,
    {
      start = origin,
      performRandomMoves = false,
      defaultOptions = {}
    }: {
      start?: Vector;
      performRandomMoves?: boolean;
      defaultOptions?: DefaultOptions;
    } = {}
  ) {
    this.tabId = tabId;
    this.location = start;
    this.defaultOptions = defaultOptions;

    if (performRandomMoves) {
      this.randomMove().then(
        (_) => { },
        (_) => { }
      );
    }
  }

  private async moveMouse(
    newLocation: BoundingBox | Vector,
    options?: PathOptions,
    abortOnMove: boolean = false
  ): Promise<void> {
    const vectors = path(this.location, newLocation, options);

    for (const v of vectors) {
      try {
        if (abortOnMove && this.moving) {
          return;
        }

        const dispatchParams: any = {
          type: 'mouseMoved',
          x: v.x,
          y: v.y
        };

        if ('timestamp' in v) dispatchParams.timestamp = v.timestamp;

        await CDPService.sendCommand(this.tabId, 'Input.dispatchMouseEvent', dispatchParams);

        this.location = v;
      } catch (error) {
        log.warn({ err: error }, 'Warning: could not move mouse');
      }
    }
  }

  private async randomMove(options?: RandomMoveOptions): Promise<void> {
    const optionsResolved = {
      moveDelay: 2000,
      randomizeMoveDelay: true,
      ...this.defaultOptions?.randomMove,
      ...options
    } satisfies RandomMoveOptions;

    try {
      if (!this.moving) {
        // Just move to a random point in a typical viewport
        const rand = getRandomBoxPoint({ x: 0, y: 0, width: 1280, height: 800 });
        await this.moveMouse(rand, optionsResolved, true);
      }
      await delay(optionsResolved.moveDelay * (optionsResolved.randomizeMoveDelay ? Math.random() : 1));
      this.randomMove(options).then(
        (_) => { },
        (_) => { }
      );
    } catch (_) {
      log.warn('Warning: stopping random mouse movements');
    }
  }

  private async mouseButtonAction(
    action: 'mousePressed' | 'mouseReleased',
    options?: MouseButtonOptions
  ): Promise<void> {
    const optionsResolved = {
      button: 'left',
      clickCount: 1,
      ...this.defaultOptions?.click,
      ...options
    } satisfies MouseButtonOptions;

    await CDPService.sendCommand(this.tabId, 'Input.dispatchMouseEvent', {
      x: this.location.x,
      y: this.location.y,
      button: optionsResolved.button,
      clickCount: optionsResolved.clickCount,
      type: action
    });
  }

  public async mouseDown(options?: MouseButtonOptions): Promise<void> {
    await this.mouseButtonAction('mousePressed', options);
  }

  public async mouseUp(options?: MouseButtonOptions): Promise<void> {
    await this.mouseButtonAction('mouseReleased', options);
  }

  public toggleRandomMove(random: boolean): void {
    this.moving = !random;
  }

  public getLocation(): Vector {
    return this.location;
  }

  public async click(
    selectorOrBox?: string | BoundingBox,
    options?: ClickOptions
  ): Promise<void> {
    const optionsResolved = {
      moveDelay: 2000,
      hesitate: 0,
      waitForClick: 0,
      randomizeMoveDelay: true,
      button: 'left',
      clickCount: 1,
      ...this.defaultOptions?.click,
      ...options
    } satisfies ClickOptions;

    const wasRandom = !this.moving;
    this.toggleRandomMove(false);

    if (selectorOrBox !== undefined) {
      await this.move(selectorOrBox, {
        ...optionsResolved,
        moveDelay: 0
      });
    }

    try {
      await delay(optionsResolved.hesitate);

      await this.mouseDown();
      await delay(optionsResolved.waitForClick);
      await this.mouseUp();
    } catch (error) {
      log.warn({ err: error }, 'Warning: could not click mouse');
    }

    await delay(optionsResolved.moveDelay * (optionsResolved.randomizeMoveDelay ? Math.random() : 1));

    this.toggleRandomMove(wasRandom);
  }

  public async move(
    selectorOrBox: string | BoundingBox,
    options?: MoveOptions
  ): Promise<void> {
    const optionsResolved = {
      moveDelay: 0,
      maxTries: 10,
      overshootThreshold: 500,
      randomizeMoveDelay: true,
      ...this.defaultOptions?.move,
      ...options
    } satisfies MoveOptions;

    const wasRandom = !this.moving;
    this.toggleRandomMove(false);

    const go = async (iteration: number): Promise<void> => {
      if (iteration > (optionsResolved.maxTries)) {
        throw Error('Could not mouse-over element within enough tries');
      }

      let box: BoundingBox;
      if (typeof selectorOrBox === 'string') {
        const resolvedBox = await CDPService.getBoundingBox(this.tabId, selectorOrBox);
        if (!resolvedBox) {
          throw new Error(`Could not find bounding box for selector: ${selectorOrBox}`);
        }
        box = resolvedBox;
      } else {
        box = selectorOrBox;
      }

      const destination = (optionsResolved.destination !== undefined)
        ? add(box, optionsResolved.destination)
        : getRandomBoxPoint(box, optionsResolved);
        
      if (shouldOvershoot(
        this.location,
        destination,
        optionsResolved.overshootThreshold
      )) {
        await this.moveMouse(overshoot(destination, GhostCursor.OVERSHOOT_RADIUS), optionsResolved);
        await this.moveMouse({ ...box, ...destination }, {
          ...optionsResolved,
          spreadOverride: GhostCursor.OVERSHOOT_SPREAD
        });
      } else {
        await this.moveMouse(destination, optionsResolved);
      }

      // We skip the re-check of bounding box here for simplicity in the extension context,
      // as it requires another round-trip to the content script.
    };
    
    await go(0);

    this.toggleRandomMove(wasRandom);

    await delay(optionsResolved.moveDelay * (optionsResolved.randomizeMoveDelay ? Math.random() : 1));
  }

  public async moveTo(
    destination: Vector,
    options?: MoveToOptions
  ): Promise<void> {
    const optionsResolved = {
      moveDelay: 0,
      randomizeMoveDelay: true,
      ...this.defaultOptions?.moveTo,
      ...options
    } satisfies MoveToOptions;

    const wasRandom = !this.moving;
    this.toggleRandomMove(false);
    await this.moveMouse(destination, optionsResolved);
    this.toggleRandomMove(wasRandom);

    await delay(optionsResolved.moveDelay * (optionsResolved.randomizeMoveDelay ? Math.random() : 1));
  }
}
