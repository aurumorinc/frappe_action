import { GhostCursor } from '../../lib/ghost-cursor/spoof';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class MouseRepository {
  private cursor: GhostCursor;

  constructor(private tabId: number) {
    this.cursor = new GhostCursor(tabId);
  }

  async click(box: BoundingBox): Promise<void> {
    await this.cursor.click(box);
  }

  async move(box: BoundingBox): Promise<void> {
    await this.cursor.move(box);
  }
}
