export function notify(type, message) {
  if (!message) return;
  if (type === 'error') {
    alert(message);
    return;
  }
  if (type === 'warn') {
    console.warn(message);
    return;
  }
  console.info(message);
}
