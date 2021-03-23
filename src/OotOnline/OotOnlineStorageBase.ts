import { SavedLogEntry } from './data/keys/KeyLogEntry';

export class OotOnlineStorageBase {
  constructor() {}

  playerModelCache: any = {};
  changelog: Array<SavedLogEntry> = new Array<SavedLogEntry>();
}
