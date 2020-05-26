export function trimBuffer(buffer: Buffer) {
  var pos = 0;
  for (var i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i] !== 0x00) {
      pos = i;
      break;
    }
  }
  pos++;
  while (pos % 0x10 !== 0) {
    pos++;
  }
  return buffer.slice(0, pos);
}
