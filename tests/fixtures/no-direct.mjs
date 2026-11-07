// 離線守門：沒有帶 dispatcher（代理）的 fetch 一律拒絕，測試不會真的連到 Google。
const realFetch = globalThis.fetch;
globalThis.fetch = (url, init) => {
  if (!init?.dispatcher) return Promise.reject(new Error(`direct connection attempted: ${url}`));
  return realFetch(url, init);
};
