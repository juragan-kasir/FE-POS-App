// ponytail: satu sumber query key. Setiap parameter yang mengubah respons
// masuk ke key, jadi dua komponen dengan parameter sama otomatis berbagi satu
// request + cache, dan parameter berbeda tidak pernah saling menimpa cache.
// `all()` = root untuk invalidasi seluruh varian sekaligus.
export const qk = {
  locations: {
    all: () => ["location-options"],
    // "active" = default BE (status selain "all" → hanya toko aktif)
    list: (status = "active") => ["location-options", status === "all" ? "all" : "active"],
    // sign-up form: every active outlet, no session (kept apart from the
    // signed-in list so the two never share a cache entry)
    public: () => ["location-options-public"]
  },
  reportData: {
    // invalidated when /report/settings saves, so tables pick up new columns
    all: () => ["report-data"],
    detail: (key, params = {}) => ["report-data", key, params]
  }
};
