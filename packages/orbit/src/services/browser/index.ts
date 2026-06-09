import { CDPService } from '../../repositories/browser/cdp';
import { MouseRepository, BoundingBox } from '../../repositories/browser/mouse';
import { KeyboardRepository } from '../../repositories/browser/keyboard';

export class BrowserService {
  private mouse: MouseRepository;
  private keyboard: KeyboardRepository;

  constructor(private tabId: number) {
    this.mouse = new MouseRepository(tabId);
    this.keyboard = new KeyboardRepository(tabId);
  }

  getTabId(): number {
    return this.tabId;
  }

  async clickElement(selector: string): Promise<void> {
    const box = await CDPService.getBoundingBox(this.tabId, selector);
    if (!box) throw new Error(`Element not found: ${selector}`);
    
    await this.mouse.click(box);
  }

  async clickBoundingBox(box: BoundingBox): Promise<void> {
    await this.mouse.click(box);
  }

  async hoverBoundingBox(box: BoundingBox): Promise<void> {
    await this.mouse.move(box);
  }

  async typeText(selector: string, text: string): Promise<void> {
    await this.clickElement(selector);
    await this.keyboard.type(text);
  }

  async type(text: string): Promise<void> {
    await this.keyboard.type(text);
  }

  async evaluate(expression: string): Promise<any> {
    return CDPService.evaluate(this.tabId, expression);
  }

  async sendCommand(method: string, params?: any): Promise<any> {
    return CDPService.sendCommand(this.tabId, method, params);
  }

  async getBoundingBox(selector: string): Promise<BoundingBox | null> {
    return CDPService.getBoundingBox(this.tabId, selector);
  }
}
