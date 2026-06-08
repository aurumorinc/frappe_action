import { describe, it, expect, vi } from 'vitest';
import simulateEvent, { getEventObj } from '../../../src/nodes/simulateEvent';

describe('simulateEvent', () => {
  it('getEventObj should return correct event type', () => {
    const clickEvent = getEventObj('click', {});
    expect(clickEvent).toBeInstanceOf(MouseEvent);

    const focusEvent = getEventObj('focus', {});
    expect(focusEvent).toBeInstanceOf(FocusEvent);
  });

  it('simulateEvent should dispatch event on element', () => {
    const el = document.createElement('button');
    const spy = vi.fn();
    el.addEventListener('click', spy);

    simulateEvent(el, 'click', {});
    expect(spy).toHaveBeenCalled();
  });

  it('simulateEvent should call native method if available', () => {
    const el = document.createElement('input');
    const spy = vi.spyOn(el, 'focus');

    simulateEvent(el, 'focus', {});
    expect(spy).toHaveBeenCalled();
  });
});
