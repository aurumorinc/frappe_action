export type NodeType = 
  | 'trigger' 
  | 'element-exists' 
  | 'get-text' 
  | 'loop-elements' 
  | 'loop-breakpoint' 
  | 'network-request' 
  | 'guide-user' 
  | 'sub-task' 
  | 'manual-step';

export interface ActionNode {
  id: string;
  type: NodeType;
  data: {
    target_selector?: string;
    extract_target?: string;
    data_key?: string;
  };
}

export interface ActionEdge {
  id: string;
  source: string;
  target: string;
  data?: {
    condition?: string;
  };
}

export interface ActionGraph {
  nodes: ActionNode[];
  edges: ActionEdge[];
}

export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

export class Engine {
  private graph: ActionGraph;
  public currentNodeId: string | null = null;
  public scrapedData: Record<string, unknown> = {};

  constructor(graph: ActionGraph) {
    this.graph = graph;
    this.currentNodeId = this.findStartNode();
  }

  private findStartNode(): string | null {
    const targetNodes = new Set(this.graph.edges.map(e => e.target));
    const startNode = this.graph.nodes.find(n => !targetNodes.has(n.id));
    return startNode ? startNode.id : null;
  }

  public getCurrentNode(): ActionNode | null {
    if (!this.currentNodeId) return null;
    return this.graph.nodes.find(n => n.id === this.currentNodeId) || null;
  }

  public advance(data?: Record<string, unknown>): Result<ActionNode | null> {
    if (data) {
      this.scrapedData = { ...this.scrapedData, ...data };
    }

    if (!this.currentNodeId) {
      return { success: false, error: new Error("Engine has no current node") };
    }

    const outgoingEdges = this.graph.edges.filter(e => e.source === this.currentNodeId);
    
    if (outgoingEdges.length === 0) {
      this.currentNodeId = null;
      return { success: true, value: null }; // End of graph
    }

    // Simple condition evaluation (mocked for now, would need a real evaluator)
    let nextEdge = outgoingEdges[0];
    if (outgoingEdges.length > 1) {
      nextEdge = outgoingEdges.find(e => {
        if (!e.data?.condition) return false;
        // Very basic mock evaluation for tests
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
    return { success: true, value: this.getCurrentNode() };
  }
}
