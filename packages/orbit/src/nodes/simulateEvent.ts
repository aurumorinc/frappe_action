export const eventList = [
  { id: 'click', name: 'Click', type: 'mouse-event' },
  { id: 'dblclick', name: 'Double Click', type: 'mouse-event' },
  { id: 'mouseup', name: 'Mouseup', type: 'mouse-event' },
  { id: 'mousedown', name: 'Mousedown', type: 'mouse-event' },
  { id: 'mouseenter', name: 'Mouseenter', type: 'mouse-event' },
  { id: 'mouseleave', name: 'Mouseleave', type: 'mouse-event' },
  { id: 'mouseover', name: 'Mouseover', type: 'mouse-event' },
  { id: 'mouseout', name: 'Mouseout', type: 'mouse-event' },
  { id: 'mousemove', name: 'Mousemove', type: 'mouse-event' },
  { id: 'focus', name: 'Focus', type: 'focus-event' },
  { id: 'blur', name: 'Blur', type: 'focus-event' },
  { id: 'input', name: 'Input', type: 'input-event' },
  { id: 'change', name: 'Change', type: 'event' },
  { id: 'touchstart', name: 'Touch start', type: 'touch-event' },
  { id: 'touchend', name: 'Touch end', type: 'touch-event' },
  { id: 'touchmove', name: 'Touch move', type: 'touch-event' },
  { id: 'touchcancel', name: 'Touch cancel', type: 'touch-event' },
  { id: 'keydown', name: 'Keydown', type: 'keyboard-event' },
  { id: 'keyup', name: 'Keyup', type: 'keyboard-event' },
  { id: 'submit', name: 'Submit', type: 'submit-event' },
];

export function getEventObj(name: string, params: Record<string, any> = {}): Event {
  const eventType = eventList.find(({ id }) => id === name)?.type ?? '';
  let event: Event;

  switch (eventType) {
    case 'mouse-event':
      event = new MouseEvent(name, { ...params });
      break;
    case 'focus-event':
      event = new FocusEvent(name, params);
      break;
    case 'touch-event':
      event = new TouchEvent(name, params);
      break;
    case 'keyboard-event':
      event = new KeyboardEvent(name, params);
      break;
    case 'wheel-event':
      event = new WheelEvent(name, params);
      break;
    case 'input-event':
      event = new InputEvent(name, params);
      break;
    default:
      event = new Event(name, params);
  }

  return event;
}

export default function simulateEvent(element: HTMLElement, name: string, params: Record<string, any> = {}) {
  const event = getEventObj(name, params);
  const useNativeMethods = ['focus', 'submit', 'blur'];

  if (useNativeMethods.includes(name) && typeof (element as any)[name] === 'function') {
    (element as any)[name]();
  } else {
    element.dispatchEvent(event);
  }
}
