export function parseFlagChanges(incoming: Buffer, storage: Buffer): any {
  let arr: any = {};
  for (let i = 0; i < incoming.byteLength; i++) {
    if (storage[i] === incoming[i] || incoming[i] === 0) {
      continue;
    }
    storage[i] |= incoming[i];
    arr[i] = storage[i];
  }
  return arr;
}
