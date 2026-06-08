import Sizzle from 'sizzle';
import {
  querySelectorAllDeep,
  querySelectorDeep,
} from '@/lib/query-selector-shadow-dom';

// Add a custom "Sizzle" pseudo-class selector
// ":contains": element content will be selected as long as it contains text
// ":equal" : element content must be exactly the same as text to be selected
// Example: p.description:equal("cat")
Sizzle.selectors.pseudos.equal = Sizzle.selectors.createPseudo(function (text: string) {
  return function (elem: Element) {
    const elemText = elem.textContent || (elem as HTMLElement).innerText || '';
    return elemText.trim() === text;
  };
});

const specialSelectors = [':contains', ':header', ':parent', ':equal'];
const specialSelectorsRegex = new RegExp(specialSelectors.join('|'));

export interface FindElementData {
  selector: string;
  multiple?: boolean;
  markEl?: boolean;
  blockIdAttr?: string;
}

class FindElement {
  static cssSelector(data: FindElementData, documentCtx: Document | Element = document): Element | Element[] | null {
    const selector = data.markEl && data.blockIdAttr
      ? `${data.selector.trim()}:not([${data.blockIdAttr}])`
      : data.selector;

    if (specialSelectorsRegex.test(selector)) {
      // Fix Sizzle incorrect context in iframe, passed as context of iframe
      const elements = Sizzle(selector, documentCtx as Document | Element | DocumentFragment);
      if (!elements || elements.length === 0) return null;

      return data.multiple ? elements : elements[0];
    }

    if (selector.includes('>>')) {
      const newSelector = selector.replaceAll('>>', '');

      return data.multiple
        ? querySelectorAllDeep(newSelector, documentCtx)
        : querySelectorDeep(newSelector, documentCtx);
    }

    if (data.multiple) {
      const elements = documentCtx.querySelectorAll(selector);

      if (elements.length === 0) return null;

      return Array.from(elements);
    }

    return documentCtx.querySelector(selector);
  }

  static xpath(data: FindElementData, documentCtx: Document = document): Node | Node[] | null {
    const resultType = data.multiple
      ? XPathResult.ORDERED_NODE_ITERATOR_TYPE
      : XPathResult.FIRST_ORDERED_NODE_TYPE;

    let result: Node | Node[] | null = null;
    const elements = documentCtx.evaluate(
      data.selector,
      documentCtx,
      null,
      resultType,
      null
    );

    if (data.multiple) {
      result = [];
      let element = elements.iterateNext();

      while (element) {
        result.push(element);
        element = elements.iterateNext();
      }
      
      if (result.length === 0) return null;
    } else {
      result = elements.singleNodeValue;
    }

    return result;
  }
}

export default FindElement;
