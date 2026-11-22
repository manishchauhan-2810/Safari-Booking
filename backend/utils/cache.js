// Tiny in-memory cache. Switched off in tests so every test sees its own fresh data.
const NO_CACHE = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

export const ttlCache = (loader, ttlMs) => {
  let value;
  let expires = 0;
  let pending = null;

  const get = async () => {
    if (NO_CACHE || ttlMs <= 0) return loader();
    if (Date.now() < expires) return value;
    if (pending) return pending; // many requests at once share one database read
    pending = loader()
      .then((v) => {
        value = v;
        expires = Date.now() + ttlMs;
        return v;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };

  get.clear = () => {
    expires = 0;
  };
  return get;
};