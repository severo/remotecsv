import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchChunk } from '../src/fetch.js'

const fetchMock = vi.spyOn(globalThis, 'fetch')

describe('fetchChunk', () => {
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

    const result = await fetchChunk({
      url: 'http://example.com/file',
      rangeStart: 0,
      rangeEnd: 9,
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
      fetchChunk({
        url: 'http://example.com/file',
        rangeStart: 0,
        rangeEnd: 9,
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
      fetchChunk({
        url: 'http://example.com/file',
        rangeStart: 0,
        rangeEnd: 9,
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
      fetchChunk({
        url: 'http://example.com/file',
        rangeStart: 0,
        rangeEnd: 9,
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
      fetchChunk({
        url: 'http://example.com/file',
        rangeStart: 0,
        rangeEnd: 9,
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
      fetchChunk({
        url: 'http://example.com/file',
        rangeStart: 0,
        rangeEnd: 9,
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
      fetchChunk({
        url: 'http://example.com/file',
        rangeStart: 0,
        rangeEnd: 9,
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

    const result = await fetchChunk({
      url: 'http://example.com/file',
      rangeStart: 0,
      rangeEnd: 9,
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

    await fetchChunk({
      url: 'http://example.com/file',
      rangeStart: 0,
      rangeEnd: 9,
      requestInit: {
        headers: {
          Authorization: 'Bearer token',
        },
        credentials: 'include',
      },
    })
  })
})
