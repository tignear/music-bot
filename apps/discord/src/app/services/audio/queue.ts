export interface Queue<Track> {
  push(guild: string, tracks: Track[]): void;
  pop(guild: string): null | Track;
  get(guild: string, start: number, end?: number): Track[] | null;
  clear(guild: string): void;
  shuffle(guild: string): void;
  length(guild: string) : number;
}
export class OnMemoryQueue<Track> implements Queue<Track>{
  map: Map<string, Track[]> = new Map();
  push(guild: string, tracks_to_append: Track[]): void {
    let tracks = this.map.get(guild);
    if (!tracks) {
      tracks = [];
      this.map.set(guild, tracks);
    }
    tracks.push(...tracks_to_append);
  }
  pop(guild: string): null | Track {
    const array = this.map.get(guild);
    if (array == null) {
      return null;
    }
    const r = array.shift() ?? null;
    if (array.length === 0) {
      this.map.delete(guild);
    }
    return r;
  }
  get(guild: string, start: number, end?: number): Track[] | null {
    const array = this.map.get(guild) ?? [];
    return array.slice(start, end);
  }
  clear(guild: string): void {
    this.map.delete(guild);
  }
  shuffle(guild: string): void {
    const array = this.map.get(guild);
    if (!array) {
      return;
    }
    for (let i = array.length; 1 < i; i--) {
      const k = Math.floor(Math.random() * i);
      [array[k], array[i - 1]] = [array[i - 1], array[k]];
    }
  }
  length(guild: string) : number {
    const array = this.map.get(guild) ?? [];
    return array.length;
  }
}