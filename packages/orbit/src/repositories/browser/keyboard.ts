import { CDPService } from './cdp';
import { MarkovTyper } from '../../lib/human-typing/typer';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class KeyboardRepository {
  constructor(private tabId: number) {}

  async type(text: string): Promise<void> {
    const typer = new MarkovTyper(text);
    const { history } = typer.run();

    for (const event of history) {
      await delay(event.delayMs);
      
      if (event.action === 'BACKSPACE') {
        await CDPService.sendCommand(this.tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace' });
        await CDPService.sendCommand(this.tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace' });
      } else if (event.char) {
        await CDPService.sendCommand(this.tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', text: event.char });
        await CDPService.sendCommand(this.tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', text: event.char });
      }
    }
  }
}
