import {
  MAX_FILE_SIZE_MB_MULTIPLE_SEND,
  MAX_FILE_SIZE_SINGLE_SEND,
  MAX_FILES_TO_SEND_TOGETHER,
} from "./constants"

export function validateImmediateFileSelection(
  files: File[],
  currentCount: number,
) {
  const errors: string[] = []
  if (currentCount >= MAX_FILES_TO_SEND_TOGETHER) {
    return {
      files: [],
      errors: [`Maximum ${MAX_FILES_TO_SEND_TOGETHER} files allowed.`],
    }
  }
  if (currentCount + files.length > MAX_FILES_TO_SEND_TOGETHER) {
    return {
      files: [],
      errors: [
        `You can only add ${MAX_FILES_TO_SEND_TOGETHER - currentCount} more file(s).`,
      ],
    }
  }

  if (currentCount + files.length === 1) {
    const file = files[0]
    if (file.size > MAX_FILE_SIZE_SINGLE_SEND * 1024 * 1024) {
      return {
        files: [],
        errors: [
          `File ${file.name} exceeds ${MAX_FILE_SIZE_SINGLE_SEND}MB limit.`,
        ],
      }
    }
    return { files, errors }
  }

  const validFiles = files.filter((file) => {
    if (file.size > MAX_FILE_SIZE_MB_MULTIPLE_SEND * 1024 * 1024) {
      errors.push(
        `File ${file.name} exceeds ${MAX_FILE_SIZE_MB_MULTIPLE_SEND}MB limit and was skipped.`,
      )
      return false
    }
    return true
  })
  return { files: validFiles, errors }
}
