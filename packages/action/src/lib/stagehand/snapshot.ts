export interface SnapshotResult {
  domText: string;
  xpathMap: Record<string, string>;
}

function getXPath(element: Element): string {
  if (element.id !== '') {
    return `id("${element.id}")`;
  }
  if (element === document.body) {
    return element.tagName;
  }

  let ix = 0;
  const siblings = element.parentNode?.childNodes;
  if (siblings) {
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        return `${getXPath(element.parentNode as Element)}/${element.tagName}[${ix + 1}]`;
      }
      if (sibling.nodeType === 1 && (sibling as Element).tagName === element.tagName) {
        ix++;
      }
    }
  }
  return '';
}

function isInteractive(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary'];
  if (interactiveTags.includes(tagName)) return true;
  
  const role = element.getAttribute('role');
  const interactiveRoles = ['button', 'link', 'checkbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'radio', 'tab', 'treeitem'];
  if (role && interactiveRoles.includes(role)) return true;

  if (element.hasAttribute('onclick') || element.hasAttribute('tabindex')) return true;

  return false;
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.offsetWidth > 0 && element.offsetHeight > 0;
}

export function captureSnapshot(): SnapshotResult {
  let domText = '';
  const xpathMap: Record<string, string> = {};
  let idCounter = 1;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        const el = node as HTMLElement;
        if (!isVisible(el)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (isInteractive(el)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    const el = currentNode as HTMLElement;
    const id = idCounter.toString();
    const xpath = getXPath(el);
    xpathMap[id] = xpath;
    
    let text = (el.innerText || el.textContent)?.trim().substring(0, 50) || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('value') || '';
    text = text.replace(/\n/g, ' ');
    
    
    domText += `[${id}] ${el.tagName.toLowerCase()} "${text}"\n`;
    
    idCounter++;
    currentNode = walker.nextNode();
  }

  return { domText, xpathMap };
}
