import { describe, expect, it, vi } from "vitest"

import { delay, hostMatchesDomains, sanitizeFilename, toMatcher, validateUrl } from "~lib/utils"

describe("sanitizeFilename", () => {
  it("removes illegal characters", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("abcdefghij")
  })

  it("normalizes whitespace", () => {
    expect(sanitizeFilename("  my   file  name  ")).toBe("my file name")
  })

  it("truncates to 240 characters", () => {
    expect(sanitizeFilename("x".repeat(400))).toHaveLength(240)
  })
})

describe("validateUrl", () => {
  it("accepts valid HTTP and HTTPS URLs", () => {
    expect(validateUrl("http://example.com/a")).toBe(true)
    expect(validateUrl("https://example.com/a")).toBe(true)
  })

  it("accepts magnet links with a btih hash", () => {
    expect(validateUrl("magnet:?xt=urn:btih:abcdef0123456789")).toBe(true)
  })

  it("rejects magnet links without a hash", () => {
    expect(validateUrl("magnet:?dn=whatever")).toBe(false)
  })

  it("rejects empty strings", () => {
    expect(validateUrl("")).toBe(false)
    expect(validateUrl("   ")).toBe(false)
  })

  it("rejects non-HTTP protocols", () => {
    expect(validateUrl("javascript:alert(1)")).toBe(false)
    expect(validateUrl("file:///etc/passwd")).toBe(false)
  })
})

describe("delay", () => {
  it("resolves after the specified time", async () => {
    vi.useFakeTimers()
    let done = false
    const promise = delay(500).then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(499)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(done).toBe(true)
    vi.useRealTimers()
  })
})

describe("toMatcher", () => {
  it("treats plain strings as case-insensitive substrings", () => {
    expect(toMatcher("Optional")("an optional file")).toBe(true)
  })

  it("compiles /regex/ syntax", () => {
    expect(toMatcher("/\\.rar$/i")("archive.RAR")).toBe(true)
    expect(toMatcher("/\\.rar$/i")("archive.zip")).toBe(false)
  })

  it("degrades gracefully on invalid regex", () => {
    expect(toMatcher("/[unclosed/")("x")).toBe(false)
  })
})

describe("hostMatchesDomains", () => {
  it("matches exact hosts and subdomains", () => {
    expect(hostMatchesDomains("files.example.com", ["example.com"])).toBe(true)
    expect(hostMatchesDomains("example.com", ["example.com"])).toBe(true)
  })

  it("does not match lookalike domains", () => {
    expect(hostMatchesDomains("notexample.com", ["example.com"])).toBe(false)
  })
})
