import { BrowserService } from '../services/browser';
import { executeNode, registerNode } from './registry';
import { Context, Result } from './types';
import { Todo } from '../models/todo/index';

import { verifySelectorNode } from './verifySelector';
import { extractNode } from './extract';
import { closeTabNode } from './closeTab';
import { linkNode } from './link';
import { eventClickNode } from './eventClick';
import { switchTabNode } from './switchTab';
import { getTextNode } from './getText';
import { triggerNode } from './trigger';
import { javascriptCodeNode } from './javascriptCode';
import { loopElementsNode } from './loopElements';
import { triggerEventNode } from './triggerEvent';
import { delayNode } from './delay';
import { formsNode } from './forms';
import { clipboardNode } from './clipboard';
import { attributeValueNode } from './attributeValue';
import { hitlNode } from './hitl';
import { switchToNode } from './switchTo';
import { actNode } from './act';
import { cookieNode } from './cookie';
import { takeScreenshotNode } from './takeScreenshot';
import { workflowStateNode } from './workflowState';
import { hoverElementNode } from './hoverElement';
import { saveAssetsNode } from './saveAssets';
import { redirectNode } from './redirect';
import { createElementNode } from './createElement';
import { deleteDataNode } from './deleteData';
import { uploadFileNode } from './uploadFile';
import { pressKeyNode } from './pressKey';
import { browserEventNode } from './browserEvent';
import { sortDataNode } from './sortData';
import { elementScrollNode } from './elementScroll';
import { conditionsNode } from './conditions';
import { loopDataNode } from './loopData';
import { exportDataNode } from './exportData';
import { observeNode } from './observe';
import { elementExistsNode } from './elementExists';
import { whileLoopNode } from './whileLoop';

export function registerAllNodes() {
  registerNode(verifySelectorNode);
  registerNode(extractNode);
  registerNode(closeTabNode);
  registerNode(linkNode);
  registerNode(eventClickNode);
  registerNode(switchTabNode);
  registerNode(getTextNode);
  registerNode(triggerNode);
  registerNode(javascriptCodeNode);
  registerNode(loopElementsNode);
  registerNode(triggerEventNode);
  registerNode(delayNode);
  registerNode(formsNode);
  registerNode(clipboardNode);
  registerNode(attributeValueNode);
  registerNode(hitlNode);
  registerNode(switchToNode);
  registerNode(actNode);
  registerNode(cookieNode);
  registerNode(takeScreenshotNode);
  registerNode(workflowStateNode);
  registerNode(hoverElementNode);
  registerNode(saveAssetsNode);
  registerNode(redirectNode);
  registerNode(createElementNode);
  registerNode(deleteDataNode);
  registerNode(uploadFileNode);
  registerNode(pressKeyNode);
  registerNode(browserEventNode);
  registerNode(sortDataNode);
  registerNode(elementScrollNode);
  registerNode(conditionsNode);
  registerNode(loopDataNode);
  registerNode(exportDataNode);
  registerNode(observeNode);
  registerNode(elementExistsNode);
  registerNode(whileLoopNode);
}

export interface Node {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  data?: {
    condition?: string;
  };
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export class Engine {
  private graph: Graph;
  public currentNodeId: string | null = null;
  public scrapedData: Record<string, unknown> = {};
  public isPaused: boolean = false;
  private browserService: BrowserService;
  private todo: Todo;

  constructor(graph: Graph, tabId: number, todo: Todo) {
    this.graph = graph;
    this.currentNodeId = this.findStartNode();
    this.browserService = new BrowserService(tabId);
    this.todo = todo;
  }

  private findStartNode(): string | null {
    const targetNodes = new Set(this.graph.edges.map(e => e.target));
    const startNode = this.graph.nodes.find(n => !targetNodes.has(n.id));
    return startNode ? startNode.id : null;
  }

  public getCurrentNode(): Node | null {
    if (!this.currentNodeId) return null;
    return this.graph.nodes.find(n => n.id === this.currentNodeId) || null;
  }

  public interpolateString(template: string): string {
    return template.replace(/\{\{([^\}]+)\}\}/g, (match, key) => {
      const value = this.scrapedData[key.trim()];
      return value !== undefined ? String(value) : match;
    });
  }

  public async advance(data?: Record<string, unknown>): Promise<Result<Node | null>> {
    if (data) {
      this.scrapedData = { ...this.scrapedData, ...data };
    }

    if (!this.currentNodeId) {
      return { success: false, error: "Engine has no current node" };
    }

    if (this.isPaused) {
      this.isPaused = false; // Resume
    }

    const currentNode = this.getCurrentNode();
    if (currentNode) {
      const context: Context = {
        browser: this.browserService,
        engine: this,
        state: this.scrapedData,
        todo: this.todo
      };
      
      const result = await executeNode(currentNode, context);
      if (!result.success) {
        return result;
      }
      
      // result.data is void, so we don't merge it into scrapedData here.
      // Nodes that need to update scrapedData should do so via context.engine.scrapedData
    }

    const outgoingEdges = this.graph.edges.filter(e => e.source === this.currentNodeId);
    
    if (outgoingEdges.length === 0) {
      this.currentNodeId = null;
      return { success: true, data: null }; // End of graph
    }

    // Simple condition evaluation
    let nextEdge = outgoingEdges[0];
    if (outgoingEdges.length > 1) {
      nextEdge = outgoingEdges.find(e => {
        if (!e.data?.condition) return false;
        try {
          // eslint-disable-next-line no-new-func
          const func = new Function(...Object.keys(this.scrapedData), `return ${e.data.condition}`);
          return func(...Object.values(this.scrapedData));
        } catch (err) {
          return false;
        }
      }) || outgoingEdges[0];
    }

    this.currentNodeId = nextEdge.target;
    return { success: true, data: this.getCurrentNode() };
  }
}
