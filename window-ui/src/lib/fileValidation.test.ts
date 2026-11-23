import { describe, expect, it } from "vitest"
import { validateImmediateFileSelection } from "./fileValidation"

const fakeFile = (name: string, size: number) => ({ name, size }) as File

describe("immediate-send file validation", () => {
  it("rejects oversized files in a batch instead of queueing them", () => {
    const accepted = fakeFile("small.txt", 1024)
    const rejected = fakeFile("large.bin", 7 * 1024 * 1024)

    const result = validateImmediateFileSelection([accepted, rejected], 0)

    expect(result.files).toEqual([accepted])
    expect(result.errors).toHaveLength(1)
  })

  it("enforces the single-file limit", () => {
    const result = validateImmediateFileSelection(
      [fakeFile("large.bin", 51 * 1024 * 1024)],
      0,
    )

    expect(result.files).toEqual([])
    expect(result.errors).toHaveLength(1)
  })

  it("rejects a selection that would exceed the batch count", () => {
    const result = validateImmediateFileSelection(
      [fakeFile("one.txt", 1), fakeFile("two.txt", 1)],
      4,
    )

    expect(result.files).toEqual([])
    expect(result.errors[0]).toContain("only add 1 more")
  })
})
