const defaultChunkSize = 1024 * 1024; // 1MB

export async function* parse(
  url: string,
  options: {
    chunkSize?: number;
    isUrl?: boolean;
  }
) {
  const chunkSize = options.chunkSize ?? defaultChunkSize;
  const isUrl = options.isUrl ?? true;
  // See https://github.com/nodejs/node/issues/60382
  let objectURLWorkaround = false;
  if (!isUrl) {
    // transform to a URL object
    // See https://github.com/nodejs/node/issues/60382
    objectURLWorkaround = true;
    url = URL.createObjectURL(new Blob([url + " "], { type: "text/plain" }));
  }

  const decoder = new TextDecoder("utf-8");
  let rangeStart = 0;
  let fileSize = Infinity;
  while (rangeStart < fileSize) {
    const rangeEnd = rangeStart + chunkSize - 1 + (objectURLWorkaround ? 1 : 0);
    console.log(`Fetching bytes ${rangeStart}-${rangeEnd}`);
    const response = await fetch(url, {
      headers: {
        Range: `bytes=${rangeStart}-${rangeEnd}`,
      },
    });
    if (response.status === 416) {
      // Requested Range Not Satisfiable
      throw new Error(
        `Requested range not satisfiable: ${rangeStart}-${rangeEnd}`
      );
    }
    if (response.status === 200) {
      // Server ignored Range header
      throw new Error(`Server did not support range requests.`);
    }
    if (response.status !== 206) {
      throw new Error(
        `Failed to fetch chunk: ${response.status} ${response.statusText}`
      );
    }
    // Check the content-range header
    const contentRange = response.headers.get("content-range");
    const contentLength = response.headers.get("content-length");
    if (!contentRange || !contentLength) {
      throw new Error(`Missing content-range or content-length header.`);
    }
    const last = contentRange.split("/")[1];
    if (last === undefined) {
      throw new Error(`Invalid content-range header: ${contentRange}`);
    }
    fileSize = parseInt(last);

    // Decode exactly chunkSize bytes or less if it's the last chunk
    const bytes = await response.bytes();
    console.log(`Received ${bytes.length} bytes`);
    console.log(`headers: ${JSON.stringify([...response.headers])}`);
    const bytesToDecode = Math.min(chunkSize, fileSize - rangeStart);
    const chunk = decoder.decode(bytes.subarray(0, bytesToDecode));
    console.log(`Decoded ${chunk.length} characters: ${chunk}`);
    yield chunk;

    rangeStart += chunkSize;
  }
}
