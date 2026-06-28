import FindElement, { FindElementData } from './FindElement';
import { visibleInViewport, isXPath } from './helper';

export interface HandleSelectorOptions {
  onSelected?: (el: Element) => void | Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  withDocument?: boolean;
}

export interface HandleSelectorData extends FindElementData {
  findBy?: 'cssSelector' | 'xpath';
  waitForSelector?: boolean;
  waitSelectorTimeout?: number;
}

export function markElement(el: Element, { id, data }: { id: string; data: HandleSelectorData }) {
  if (data.markEl) {
    el.setAttribute(`block--${id}`, '');
  }
}

export function getDocumentCtx(frameSelector?: string): Document | Element | null {
  if (!frameSelector) return document;

  let documentCtx: Document | Element | null = document;

  const iframeSelectors = frameSelector.split('|>');
  const type = isXPath(frameSelector) ? 'xpath' : 'cssSelector';
  
  iframeSelectors.forEach((selector) => {
    if (!documentCtx) return;

    const element = FindElement[type]({ selector }, documentCtx as Document) as HTMLIFrameElement;
    documentCtx = element?.contentDocument || null;
  });

  return documentCtx;
}

export function queryElements(data: HandleSelectorData, documentCtx: Document | Element = document): Promise<Element | Element[] | Node | Node[] | null> {
  return new Promise((resolve) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let isTimeout = false;

    const findSelector = () => {
      if (isTimeout) return;

      const selectorType = data.findBy || 'cssSelector';
      const elements = FindElement[selectorType](data, documentCtx as Document);
      const isElNotFound = !elements || (Array.isArray(elements) && elements.length === 0);

      if (isElNotFound && data.waitForSelector) {
        setTimeout(findSelector, 200);
      } else {
        if (timeout) clearTimeout(timeout);
        resolve(elements);
      }
    };

    findSelector();

    if (data.waitForSelector) {
      timeout = setTimeout(() => {
        isTimeout = true;
        resolve(null);
      }, data.waitSelectorTimeout || 5000);
    }
  });
}

export default async function handleSelector(
  { data, id, frameSelector, debugMode }: { data: HandleSelectorData; id: string; frameSelector?: string; debugMode?: boolean },
  { onSelected, onError, onSuccess, withDocument }: HandleSelectorOptions = {}
): Promise<any> {
  if (!data || !data.selector) {
    if (onError) onError(new Error('selector-empty'));
    return null;
  }

  const documentCtx = getDocumentCtx(frameSelector);

  if (!documentCtx) {
    if (onError) onError(new Error('iframe-not-found'));
    return null;
  }

  try {
    data.blockIdAttr = `block--${id}`;

    const elements = await queryElements(data, documentCtx);

    if (!elements || (Array.isArray(elements) && elements.length === 0)) {
      if (onError) onError(new Error('element-not-found'));
      return null;
    }

    const elementsArr = data.multiple ? (Array.isArray(elements) ? elements : [elements]) : [elements];

    await Promise.allSettled(
      (elementsArr as Element[]).map(async (el) => {
        markElement(el, { id, data });

        if (debugMode) {
          const isInViewport = visibleInViewport(el);
          if (!isInViewport) el.scrollIntoView();
        }

        if (onSelected) await onSelected(el);
      })
    );

    if (onSuccess) onSuccess();
    if (withDocument) {
      return {
        elements,
        document: documentCtx,
      };
    }

    return elements;
  } catch (error) {
    if (onError) onError(error as Error);
    throw error;
  }
}
