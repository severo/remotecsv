import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchChunk, fetchRange } from '../src/fetch.js'

const fetchMock = vi.spyOn(globalThis, 'fetch')

describe('fetchRange', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches a byte range successfully', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-9/100',
        'content-length': '10',
      }),
      bytes: async () => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    const result = await fetchRange({
      url: 'http://example.com/file',
      firstByte: 0,
      lastByte: 9,
      requestInit: {},
    })

    expect(result.fileSize).toBe(100)
    expect(result.bytes).toEqual(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/file',
      expect.objectContaining({
        headers: expect.objectContaining({
          Range: 'bytes=0-9',
        }),
      }),
    )
  })

  // This test means that empty files are not supported, since a range request on an empty file
  // returns 416 Requested Range Not Satisfiable (or some servers like Apache return 200 OK).
  // see https://github.com/golang/go/issues/47021#issuecomment-874513977 and
  // https://github.com/pallets/werkzeug/issues/1937 for examples.
  // TODO(SL): support empty files?
  it.for([200, 416, 500])('throws an error for non-206 response: %s', async (status) => {
    const mockResponse = {
      status,
      headers: new Headers({
        'content-range': 'bytes 0-9/100',
        'content-length': '10',
      }),
      bytes: async () => new Uint8Array([]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    await expect(
      fetchRange({
        url: 'http://example.com/file',
        firstByte: 0,
        lastByte: 9,
        requestInit: {},
      }),
    ).rejects.toThrow()
  })

  it('throws an error for missing Content-Length header', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers(
        { 'content-range': 'bytes 0-9/100' },
      ),
      bytes: async () => new Uint8Array([]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    await expect(
      fetchRange({
        url: 'http://example.com/file',
        firstByte: 0,
        lastByte: 9,
        requestInit: {},
      }),
    ).rejects.toThrow()
  })

  it('throws an error for missing Content-Range header', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers(
        { 'content-length': '10' },
      ),
      bytes: async () => new Uint8Array([]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    await expect(
      fetchRange({
        url: 'http://example.com/file',
        firstByte: 0,
        lastByte: 9,
        requestInit: {},
      }),
    ).rejects.toThrow()
  })

  it.for(['invalid-format', '0-10/*'])('throws an error for invalid Content-Range format', async (contentRange) => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-length': '10',
        'content-range': contentRange,
      }),
      bytes: async () => new Uint8Array([]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    await expect(
      fetchRange({
        url: 'http://example.com/file',
        firstByte: 0,
        lastByte: 9,
        requestInit: {},
      }),
    ).rejects.toThrow()
  })

  it('throws an error for negative file size', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-length': '10',
        'content-range': `bytes 0-9/-1`,
      }),
      bytes: async () => new Uint8Array([]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    await expect(
      fetchRange({
        url: 'http://example.com/file',
        firstByte: 0,
        lastByte: 9,
        requestInit: {},
      }),
    ).rejects.toThrow()
  })

  it('throws an error for file size over 9PB', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-length': '10',
        'content-range': `bytes 0-9/${String(Number.MAX_SAFE_INTEGER + 1)}`,
      }),
      bytes: async () => new Uint8Array([]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    await expect(
      fetchRange({
        url: 'http://example.com/file',
        firstByte: 0,
        lastByte: 9,
        requestInit: {},
      }),
    ).rejects.toThrow()
  })

  it.for([1, 5])('fetches a shorter chunk if reaching the file end', async (fileSize) => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': `bytes 0-${fileSize - 1}/${fileSize}`,
        'content-length': fileSize.toString(),
      }),
      bytes: async () => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, fileSize)),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    const result = await fetchRange({
      url: 'http://example.com/file',
      firstByte: 0,
      lastByte: 9,
      requestInit: {},
    })

    expect(result.fileSize).toBe(fileSize)
    expect(result.bytes).toEqual(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, fileSize)))
    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/file',
      expect.objectContaining({
        headers: expect.objectContaining({
          Range: 'bytes=0-9',
        }),
      }),
    )
  })

  it('uses provided requestInit headers', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-9/100',
        'content-length': '10',
      }),
      bytes: async () => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    } as unknown as Response
    fetchMock.mockImplementationOnce(async (_, requestInit) => {
      expect(requestInit?.headers).toMatchObject({
        Authorization: 'Bearer token',
        Range: 'bytes=0-9',
      })
      expect(requestInit?.credentials).toBe('include')
      return mockResponse
    })

    await fetchRange({
      url: 'http://example.com/file',
      firstByte: 0,
      lastByte: 9,
      requestInit: {
        headers: {
          Authorization: 'Bearer token',
        },
        credentials: 'include',
      },
    })
  })

  it('can be cancelled with AbortSignal', async () => {
    const abortController = new AbortController()
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-9/100',
        'content-length': '10',
      }),
      bytes: async () => new Promise<Uint8Array>((resolve) => {
        setTimeout(() => resolve(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])), 100)
      }),
    } as unknown as Response
    fetchMock.mockImplementationOnce(async (_, options) => {
      if (options?.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError')
      }
      return mockResponse
    })

    const getFetchPromise = () => fetchRange({
      url: 'http://example.com/file',
      firstByte: 0,
      lastByte: 9,
      requestInit: {
        signal: abortController.signal,
      },
    })

    await expect(getFetchPromise()).resolves.not.toThrow()

    abortController.abort()

    await expect(getFetchPromise()).rejects.toThrow(/aborted/i)
  })
})

describe('fetchChunk', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches a chunk and returns the maxLastByte based on file size', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-9/15',
        'content-length': '10',
      }),
      bytes: async () => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    const result = await fetchChunk({
      url: 'http://example.com/file',
      chunkSize: 10,
      firstByte: 0,
      requestInit: {},
    })

    expect(result.bytes).toEqual(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
    expect(result.maxLastByte).toBe(14)
  })

  it('trims the chunk if it exceeds the file size', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-4/5',
        'content-length': '5',
      }),
      bytes: async () => new Uint8Array([0, 1, 2, 3, 4]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    const result = await fetchChunk({
      url: 'http://example.com/file',
      chunkSize: 10,
      firstByte: 0,
      requestInit: {},
    })

    expect(result.bytes).toEqual(new Uint8Array([0, 1, 2, 3, 4]))
    expect(result.maxLastByte).toBe(4)
  })

  it('trims the chunk if it exceeds the provided maxLastByte', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-9/20',
        'content-length': '10',
      }),
      bytes: async () => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    const result = await fetchChunk({
      url: 'http://example.com/file',
      chunkSize: 10,
      firstByte: 0,
      maxLastByte: 4,
      requestInit: {},
    })

    expect(result.bytes).toEqual(new Uint8Array([0, 1, 2, 3, 4]))
    expect(result.maxLastByte).toBe(4) // remains the same as provided
  })

  it('updates the maxLastByte based on file size if it is lower than the provided one', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-1/5',
        'content-length': '2',
      }),
      bytes: async () => new Uint8Array([0, 1]),
    } as unknown as Response
    fetchMock.mockResolvedValueOnce(mockResponse)

    const result = await fetchChunk({
      url: 'http://example.com/file',
      chunkSize: 2,
      firstByte: 0,
      maxLastByte: 15,
      requestInit: {},
    })
    expect(result.bytes).toEqual(new Uint8Array([0, 1]))
    expect(result.maxLastByte).toBe(4) // updated based on file size
  })

  it('uses provided requestInit headers', async () => {
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-9/100',
        'content-length': '10',
      }),
      bytes: async () => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    } as unknown as Response
    fetchMock.mockImplementationOnce(async (_, requestInit) => {
      expect(requestInit?.headers).toMatchObject({
        Authorization: 'Bearer token',
        Range: 'bytes=0-12', // 12 = chunkSize (12) + extraByte (1) - 1
      })
      expect(requestInit?.credentials).toBe('include')
      return mockResponse
    })

    await fetchChunk({
      url: 'http://example.com/file',
      chunkSize: 12,
      firstByte: 0,
      requestInit: {
        headers: {
          Authorization: 'Bearer token',
        },
        credentials: 'include',
      },
    })
  })

  it('can be cancelled with AbortSignal', async () => {
    const abortController = new AbortController()
    const mockResponse = {
      status: 206,
      headers: new Headers({
        'content-range': 'bytes 0-9/100',
        'content-length': '10',
      }),
      bytes: async () => new Promise<Uint8Array>((resolve) => {
        setTimeout(() => resolve(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])), 100)
      }),
    } as unknown as Response
    fetchMock.mockImplementationOnce(async (_, options) => {
      if (options?.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError')
      }
      return mockResponse
    })

    const getFetchPromise = () => fetchChunk({
      url: 'http://example.com/file',
      chunkSize: 10,
      firstByte: 0,
      requestInit: {
        signal: abortController.signal,
      },
    })

    await expect(getFetchPromise()).resolves.not.toThrow()

    abortController.abort()

    await expect(getFetchPromise()).rejects.toThrow(/aborted/i)
  })
})
