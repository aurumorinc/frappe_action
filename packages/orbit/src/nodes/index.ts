import { ActionNode, Engine, Result } from '../services/action';
import { browser } from 'wxt/browser';

const CONTENT_NODES = new Set([]);

const BACKGROUND_NODES = new Set([
  'nodes:get-text',
  'nodes:element-exists',
  'nodes:trigger-event',
  'nodes:javascript-code',
  'nodes:attribute-value',
  'nodes:conditions',
  'nodes:create-element',
  'nodes:element-scroll',
  'nodes:link',
  'nodes:loop-data',
  'nodes:loop-elements',
  'nodes:clipboard',
  'nodes:save-assets',
  'nodes:switch-to',
  'nodes:take-screenshot',
  'nodes:upload-file',
  'nodes:verify-selector',
  'nodes:event-click',
  'nodes:forms',
  'nodes:hover-element',
  'nodes:press-key',
  'nodes:browser-event',
  'nodes:delay',
  'nodes:switch-tab',
  'nodes:close-tab',
  'nodes:cookie',
  'nodes:while-loop',
  'nodes:export-data',
  'nodes:delete-data',
  'nodes:sort-data',
  'nodes:workflow-state',
]);

export async function executeNode(node: ActionNode, engine: Engine): Promise<Result<any>> {
  if (BACKGROUND_NODES.has(node.type)) {
    try {
      let result;
      switch (node.type) {
        case 'nodes:browser-event':
          const browserEvent = (await import('./browserEvent')).default;
          result = await browserEvent(node.data as any);
          break;
        case 'nodes:delay':
          const delay = (await import('./delay')).default;
          result = await delay(node.data as any);
          break;
        case 'nodes:switch-tab':
          const switchTab = (await import('./switchTab')).default;
          result = await switchTab(node.data as any);
          break;
        case 'nodes:close-tab':
          const closeTab = (await import('./closeTab')).default;
          result = await closeTab(node.data as any);
          break;
        case 'nodes:cookie':
          const cookie = (await import('./cookie')).default;
          result = await cookie(node.data as any);
          break;
        case 'nodes:while-loop':
          const whileLoop = (await import('./whileLoop')).default;
          result = await whileLoop(node.data as any, engine);
          break;
        case 'nodes:export-data':
          const exportData = (await import('./exportData')).default;
          result = await exportData(node.data as any, engine);
          break;
        case 'nodes:delete-data':
          const deleteData = (await import('./deleteData')).default;
          result = await deleteData(node.data as any, engine);
          break;
        case 'nodes:sort-data':
          const sortData = (await import('./sortData')).default;
          result = await sortData(node.data as any, engine);
          break;
        case 'nodes:workflow-state':
          const workflowState = (await import('./workflowState')).default;
          result = await workflowState(node.data as any, engine);
          break;
        case 'nodes:event-click':
          const eventClick = (await import('./eventClick')).default;
          result = await eventClick(node.data as any, node.id);
          break;
        case 'nodes:forms':
          const forms = (await import('./forms')).default;
          result = await forms(node.data as any, node.id);
          break;
        case 'nodes:hover-element':
          const hoverElement = (await import('./hoverElement')).default;
          result = await hoverElement(node.data as any, node.id);
          break;
        case 'nodes:press-key':
          const pressKey = (await import('./pressKey')).default;
          result = await pressKey(node.data as any, node.id);
          break;
        case 'nodes:get-text':
          const getText = (await import('./getText')).default;
          result = await getText(node.data as any, node.id);
          break;
        case 'nodes:element-exists':
          const elementExists = (await import('./elementExists')).default;
          result = await elementExists(node.data as any);
          break;
        case 'nodes:trigger-event':
          const triggerEvent = (await import('./triggerEvent')).default;
          result = await triggerEvent(node.data as any, node.id);
          break;
        case 'nodes:javascript-code':
          const javascriptCode = (await import('./javascriptCode')).default;
          result = await javascriptCode(node.data as any);
          break;
        case 'nodes:attribute-value':
          const attributeValue = (await import('./attributeValue')).default;
          result = await attributeValue(node.data as any, node.id);
          break;
        case 'nodes:conditions':
          const conditions = (await import('./conditions')).default;
          result = await conditions(node.data as any);
          break;
        case 'nodes:create-element':
          const createElement = (await import('./createElement')).default;
          result = await createElement(node.data as any, node.id);
          break;
        case 'nodes:element-scroll':
          const elementScroll = (await import('./elementScroll')).default;
          result = await elementScroll(node.data as any, node.id);
          break;
        case 'nodes:link':
          const link = (await import('./link')).default;
          result = await link(node.data as any, node.id);
          break;
        case 'nodes:loop-data':
          const loopData = (await import('./loopData')).default;
          result = await loopData(node.data as any);
          break;
        case 'nodes:loop-elements':
          const loopElements = (await import('./loopElements')).default;
          result = await loopElements(node.data as any);
          break;
        case 'nodes:clipboard':
          const clipboard = (await import('./clipboard')).default;
          result = await clipboard(node.data as any);
          break;
        case 'nodes:save-assets':
          const saveAssets = (await import('./saveAssets')).default;
          result = await saveAssets(node.data as any, node.id);
          break;
        case 'nodes:switch-to':
          const switchTo = (await import('./switchTo')).default;
          result = await switchTo(node.data as any);
          break;
        case 'nodes:take-screenshot':
          const takeScreenshot = (await import('./takeScreenshot')).default;
          result = await takeScreenshot(node.data as any, node.id);
          break;
        case 'nodes:upload-file':
          const uploadFile = (await import('./uploadFile')).default;
          result = await uploadFile(node.data as any, node.id);
          break;
        case 'nodes:verify-selector':
          const verifySelector = (await import('./verifySelector')).default;
          result = await verifySelector(node.data as any);
          break;
        default:
          return { success: false, error: new Error(`Background node ${node.type} not implemented yet`) };
      }
      return result;
    } catch (error) {
      return { success: false, error: error as Error };
    }
  } else {
    return { success: false, error: new Error(`Unknown node type: ${node.type}`) };
  }
}
