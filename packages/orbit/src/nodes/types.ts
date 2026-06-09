import { BrowserService } from '../services/browser';
import { Engine } from './index';
import { Todo } from '../models/todo/index';

export interface Context {
  browser: BrowserService;
  engine: Engine;
  state: Record<string, any>;
  todo: Todo;
}

export interface NodeType<TData = any> {
  id: string;
  name: string;
  description: string;
  execute: (data: TData, context: Context) => Promise<Result<void>>;
}

export type Result<T> = { success: true; data: T; pause?: boolean } | { success: false; error: string };
export type NodeTypeName =
  | 'nodes:hitl'
  | 'nodes:trigger'
  | 'nodes:redirect'
  | 'nodes:get-text'
  | 'nodes:element-exists'
  | 'nodes:event-click'
  | 'nodes:trigger-event'
  | 'nodes:forms'
  | 'nodes:javascript-code'
  | 'nodes:attribute-value'
  | 'nodes:conditions'
  | 'nodes:create-element'
  | 'nodes:element-scroll'
  | 'nodes:hover-element'
  | 'nodes:link'
  | 'nodes:press-key'
  | 'nodes:loop-data'
  | 'nodes:loop-elements'
  | 'nodes:clipboard'
  | 'nodes:save-assets'
  | 'nodes:switch-to'
  | 'nodes:take-screenshot'
  | 'nodes:upload-file'
  | 'nodes:verify-selector'
  | 'nodes:browser-event'
  | 'nodes:delay'
  | 'nodes:switch-tab'
  | 'nodes:close-tab'
  | 'nodes:cookie'
  | 'nodes:while-loop'
  | 'nodes:export-data'
  | 'nodes:delete-data'
  | 'nodes:sort-data'
  | 'nodes:workflow-state'
  | 'nodes:act'
  | 'nodes:extract'
  | 'nodes:observe';

export interface BaseSelectorNodeData {
  selector: string;
  findBy?: 'cssSelector' | 'xpath';
  waitForSelector?: boolean;
  waitSelectorTimeout?: number;
  markEl?: boolean;
  multiple?: boolean;
}

export interface GetTextNodeData extends BaseSelectorNodeData {
  regex?: string;
  regexExp?: string[];
  prefixText?: string;
  suffixText?: string;
  includeTags?: boolean;
  useTextContent?: boolean;
}

export interface ElementExistsNodeData extends BaseSelectorNodeData {}

export interface EventClickNodeData extends BaseSelectorNodeData {}

export interface TriggerEventNodeData extends BaseSelectorNodeData {
  eventName: string;
  eventParams?: string;
}

export interface FormsNodeData extends BaseSelectorNodeData {
  type: 'text' | 'select' | 'checkbox' | 'radio';
  value: string;
  clearValue?: boolean;
  submitForm?: boolean;
}

export interface JavascriptCodeNodeData {
  code: string;
  timeout?: number;
}

export interface AttributeValueNodeData extends BaseSelectorNodeData {
  attributeName: string;
  action: 'get' | 'set';
  attributeValue?: string;
}

export interface ConditionsNodeData {
  type: 'element' | 'javascript';
  condition: string;
  value?: string;
}

export interface CreateElementNodeData extends BaseSelectorNodeData {
  html: string;
  insertType: 'append' | 'prepend' | 'before' | 'after';
}

export interface ElementScrollNodeData extends BaseSelectorNodeData {
  scrollY?: number;
  scrollX?: number;
  smooth?: boolean;
}

export interface HoverElementNodeData extends BaseSelectorNodeData {}

export interface LinkNodeData extends BaseSelectorNodeData {
  action: 'get' | 'open';
}

export interface PressKeyNodeData extends BaseSelectorNodeData {
  key: string;
  modifiers?: string[];
}

export interface LoopDataNodeData {
  dataKey: string;
  loopId: string;
}

export interface LoopElementsNodeData extends BaseSelectorNodeData {
  loopId: string;
}

export interface ClipboardNodeData {
  action: 'read' | 'write';
  text?: string;
}

export interface SaveAssetsNodeData extends BaseSelectorNodeData {
  attribute: string;
}

export interface SwitchToNodeData {
  frameSelector: string;
}

export interface TakeScreenshotNodeData extends BaseSelectorNodeData {
  fullPage?: boolean;
}

export interface UploadFileNodeData extends BaseSelectorNodeData {
  filePaths: string[];
}

export interface VerifySelectorNodeData extends BaseSelectorNodeData {}

export interface BrowserEventNodeData {
  eventName: string;
  timeout?: number;
}

export interface DelayNodeData {
  time: number;
}

export interface SwitchTabNodeData {
  matchPattern: string;
  createIfNoMatch?: boolean;
}

export interface CloseTabNodeData {
  closeType: 'tab' | 'window';
  allWindows?: boolean;
}

export interface CookieNodeData {
  action: 'get' | 'set' | 'remove';
  name: string;
  value?: string;
  domain?: string;
}

export interface WhileLoopNodeData {
  condition: string;
}

export interface ExportDataNodeData {
  format: 'csv' | 'json';
  dataKey: string;
}

export interface DeleteDataNodeData {
  deleteList: string[];
}

export interface SortDataNodeData {
  dataKey: string;
  sortBy: string;
  order: 'asc' | 'desc';
}

export interface WorkflowStateNodeData {
  variables: Record<string, any>;
}

export interface HitlNodeData {
  message?: string;
  todo_type?: 'captcha' | 'login' | 'form_fill' | 'approval' | 'custom';
  data_key?: string;
}

export interface ActNodeData {
  instruction: string;
  variables?: Record<string, string>;
}

export interface ExtractNodeData {
  instruction: string;
  schema?: string;
  variables?: Record<string, string>;
}

export interface ObserveNodeData {
  instruction: string;
  variables?: Record<string, string>;
}

export type NodeData<T extends NodeTypeName> =
  T extends 'hitl' ? HitlNodeData :
  T extends 'nodes:get-text' ? GetTextNodeData :
  T extends 'nodes:element-exists' ? ElementExistsNodeData :
  T extends 'nodes:event-click' ? EventClickNodeData :
  T extends 'nodes:trigger-event' ? TriggerEventNodeData :
  T extends 'nodes:forms' ? FormsNodeData :
  T extends 'nodes:javascript-code' ? JavascriptCodeNodeData :
  T extends 'nodes:attribute-value' ? AttributeValueNodeData :
  T extends 'nodes:conditions' ? ConditionsNodeData :
  T extends 'nodes:create-element' ? CreateElementNodeData :
  T extends 'nodes:element-scroll' ? ElementScrollNodeData :
  T extends 'nodes:hover-element' ? HoverElementNodeData :
  T extends 'nodes:link' ? LinkNodeData :
  T extends 'nodes:press-key' ? PressKeyNodeData :
  T extends 'nodes:loop-data' ? LoopDataNodeData :
  T extends 'nodes:loop-elements' ? LoopElementsNodeData :
  T extends 'nodes:clipboard' ? ClipboardNodeData :
  T extends 'nodes:save-assets' ? SaveAssetsNodeData :
  T extends 'nodes:switch-to' ? SwitchToNodeData :
  T extends 'nodes:take-screenshot' ? TakeScreenshotNodeData :
  T extends 'nodes:upload-file' ? UploadFileNodeData :
  T extends 'nodes:verify-selector' ? VerifySelectorNodeData :
  T extends 'nodes:browser-event' ? BrowserEventNodeData :
  T extends 'nodes:delay' ? DelayNodeData :
  T extends 'nodes:switch-tab' ? SwitchTabNodeData :
  T extends 'nodes:close-tab' ? CloseTabNodeData :
  T extends 'nodes:cookie' ? CookieNodeData :
  T extends 'nodes:while-loop' ? WhileLoopNodeData :
  T extends 'nodes:export-data' ? ExportDataNodeData :
  T extends 'nodes:delete-data' ? DeleteDataNodeData :
  T extends 'nodes:sort-data' ? SortDataNodeData :
  T extends 'nodes:workflow-state' ? WorkflowStateNodeData :
  T extends 'nodes:act' ? ActNodeData :
  T extends 'nodes:extract' ? ExtractNodeData :
  T extends 'nodes:observe' ? ObserveNodeData :
  Record<string, any>;
