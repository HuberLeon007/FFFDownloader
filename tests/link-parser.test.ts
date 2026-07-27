import { describe, expect, it } from "vitest"

import {
  buildSubGroups,
  classifySubGroup,
  cleanLabel,
  extractHost,
  isLinkAllowed,
  parsePartNumber
} from "~lib/link-parser"
import type { Link, SiteProfile } from "~types"

const profile: SiteProfile = {
  id: "p1",
  name: "Test",
  enabled: true,
  matchDomains: ["example.com"],
  contentSelectors: ["main"],
  includePatterns: ["/\\.(rar|bin)(#|$)/i"],
  excludePatterns: ["facebook.com", "/\\/tag\\//i"],
  revealSelectors: [],
  revealKeywords: [],
  groupRules: [
    {
      id: "r0",
      label: "Optional: MP & Zombies",
      pattern: "/mp[-_]?(and-)?zombies|mp_zm/i",
      isOptional: true
    },
    {
      id: "r1",
      label: "Optional: Soundtracks & Bonus",
      pattern: "/soundtrack|bonus/i",
      isOptional: true
    },
    {
      id: "r2",
      label: "Optional Language: {1}",
      pattern: "/(german|french|polish)/i",
      isOptional: true
    },
    { id: "r3", label: "Optional: {clean}", pattern: "/optional|selective/i", isOptional: true }
  ],
  labelStripPrefixes: ["optional-", "selective-"],
  defaultGroupName: "Main Files (Required)",
  defaultGroupOptional: false
}

describe("extractHost", () => {
  it("parses the hostname", () => {
    expect(extractHost("https://cdn.example.com/a/b.rar")).toBe("cdn.example.com")
  })

  it("strips the www prefix", () => {
    expect(extractHost("https://www.example.com/x")).toBe("example.com")
  })

  it("returns Unknown for invalid URLs", () => {
    expect(extractHost("not a url")).toBe("Unknown")
  })
})

describe("parsePartNumber", () => {
  it("extracts .part01", () => {
    expect(parsePartNumber("https://h.test/file.part01.rar")).toBe("Part 01")
  })

  it("extracts _part003 and -pt02", () => {
    expect(parsePartNumber("release_part003.bin")).toBe("Part 003")
    expect(parsePartNumber("release-pt02.bin")).toBe("Part 02")
  })

  it("ignores single-digit parts", () => {
    expect(parsePartNumber("file.part1.rar")).toBeUndefined()
  })

  it("does NOT match URL fragments", () => {
    expect(parsePartNumber("https://h.test/abc#name.part01.rar")).toBeUndefined()
  })
})

describe("classifySubGroup", () => {
  it("falls back to the default required group", () => {
    const out = classifySubGroup("https://h.test/x#release.part01.rar", "release", profile)
    expect(out).toEqual({ subGroup: "Main Files (Required)", isOptional: false })
  })

  it("identifies MP & Zombies", () => {
    const out = classifySubGroup("https://h.test/x#pack-mp-and-zombies.bin", "", profile)
    expect(out.subGroup).toBe("Optional: MP & Zombies")
    expect(out.isOptional).toBe(true)
  })

  it("identifies soundtracks and bonus content", () => {
    expect(classifySubGroup("https://h.test/x#bonus-soundtrack.bin", "", profile).subGroup).toBe(
      "Optional: Soundtracks & Bonus"
    )
  })

  it("identifies languages via capture groups", () => {
    expect(classifySubGroup("https://h.test/x#optional-german.bin", "", profile).subGroup).toBe(
      "Optional Language: German"
    )
  })

  it("derives a clean label for generic optional content", () => {
    expect(
      classifySubGroup("https://h.test/x#optional-useless-files.bin", "", profile).subGroup
    ).toBe("Optional: Useless files")
  })
})

describe("cleanLabel", () => {
  it("strips prefixes, parts and extensions", () => {
    expect(cleanLabel("optional-hi-res-textures.part02.bin", ["optional-"])).toBe(
      "Hi res textures"
    )
  })
})

describe("isLinkAllowed", () => {
  it("accepts links matching the include patterns", () => {
    expect(isLinkAllowed("https://h.test/a#file.rar", "", profile)).toBe(true)
  })

  it("rejects excluded hosts even when included", () => {
    expect(isLinkAllowed("https://facebook.com/a.rar", "", profile)).toBe(false)
  })

  it("rejects links matching nothing", () => {
    expect(isLinkAllowed("https://h.test/page.html", "", profile)).toBe(false)
  })

  it("allows everything when no include patterns are set", () => {
    const open = { ...profile, includePatterns: [] }
    expect(isLinkAllowed("https://h.test/page.html", "", open)).toBe(true)
  })
})

describe("buildSubGroups", () => {
  it("sorts required groups first, then alphabetically", () => {
    const make = (name: string, isOptional: boolean): Link => ({
      id: name,
      url: `https://h.test/${name}`,
      text: name,
      host: "h.test",
      category: "p1",
      subGroup: name,
      isOptional,
      isSelected: !isOptional
    })
    const groups = buildSubGroups([
      make("Zeta optional", true),
      make("Alpha optional", true),
      make("Main Files (Required)", false)
    ])
    expect(groups.map((group) => group.name)).toEqual([
      "Main Files (Required)",
      "Alpha optional",
      "Zeta optional"
    ])
  })
})
