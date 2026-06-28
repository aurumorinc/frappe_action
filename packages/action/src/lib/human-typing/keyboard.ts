export class KeyboardLayout {
  private layout: string;
  private keyCoords: Record<string, [number, number]> = {};

  constructor(layout: string = 'qwerty') {
    this.layout = layout;
    this._initCoords();
  }

  private _initCoords() {
    const qwerty = [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\''],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
    ];

    const offsets = [0, 0.5, 0.75, 1.25];

    for (let r = 0; r < qwerty.length; r++) {
      for (let c = 0; c < qwerty[r].length; c++) {
        const char = qwerty[r][c];
        this.keyCoords[char] = [c + offsets[r], r];
        this.keyCoords[char.toUpperCase()] = [c + offsets[r], r];
      }
    }
  }

  public hasKey(char: string): boolean {
    return char in this.keyCoords;
  }

  public getDistance(char1: string, char2: string): number {
    const c1 = char1.toLowerCase();
    const c2 = char2.toLowerCase();

    if (!this.hasKey(c1) || !this.hasKey(c2)) {
      return 10.0; // Arbitrary large distance
    }

    const [x1, y1] = this.keyCoords[c1];
    const [x2, y2] = this.keyCoords[c2];

    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }

  public getRandomNeighbor(char: string): string {
    const c = char.toLowerCase();
    if (!this.hasKey(c)) return char;

    const neighbors: { char: string; dist: number }[] = [];
    for (const k of Object.keys(this.keyCoords)) {
      if (k !== c && k.length === 1 && k === k.toLowerCase()) {
        const dist = this.getDistance(c, k);
        if (dist < 2.0) {
          neighbors.push({ char: k, dist });
        }
      }
    }

    if (neighbors.length === 0) return char;

    // Simple random choice among neighbors
    const idx = Math.floor(Math.random() * neighbors.length);
    const neighbor = neighbors[idx].char;

    return char === char.toUpperCase() ? neighbor.toUpperCase() : neighbor;
  }

  public isComposedAccent(char: string): boolean {
    // Simplified for English/basic Latin
    return false;
  }

  public isDirectAccent(char: string): boolean {
    // Simplified
    return false;
  }
}
