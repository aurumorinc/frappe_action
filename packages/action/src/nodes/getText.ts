import { GetTextNodeData, NodeType, Result } from './types';

export const getTextNode: NodeType<GetTextNodeData> = {
  id: 'nodes:get-text',
  name: 'getText',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return null;

        return elements.map(element => {
          let text = '';
          if (${data.includeTags}) {
            text = element.outerHTML;
          } else if (${data.useTextContent}) {
            text = element.textContent || '';
          } else {
            text = element.innerText || '';
          }
          return text;
        });
      })();
    `;

    const rawTexts = await context.browser.evaluate( expression);

    if (!rawTexts) {
      return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
    }

    let regex: RegExp | undefined;
    if (data.regex) {
      regex = new RegExp(data.regex, [...new Set(data.regexExp || [])].join(''));
    }

    const processedTexts = rawTexts.map((text: string) => {
      if (regex) {
        const match = text.match(regex);
        text = match ? match.join(' ') : text;
      }
      return (data.prefixText || '') + text + (data.suffixText || '');
    });

    // Store result in context if needed
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
