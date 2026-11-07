const CHUNK_LOAD_ERROR_PATTERN =
  /dynamically imported module|importing a module script failed|unable to preload css|loading (css )?chunk/i;

export const isChunkLoadError = (error) => CHUNK_LOAD_ERROR_PATTERN.test(error?.message ?? "");
