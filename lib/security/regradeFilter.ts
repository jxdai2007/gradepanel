// lib/security/regradeFilter.ts
/** Strip any quoted text from a regrade response that does NOT appear in the original submission.
 *  This prevents FERPA exfiltration of other students' work. */
export function ferpaFilter(args: { response: string; originalSubmission: string }): string {
  const { response, originalSubmission } = args
  // Find all quoted segments (anything between matching quotes >=10 chars)
  // Handles both straight quotes " and curly/typographic quotes " "
  const quotedPattern = /["“]([^"”]{10,})["”]/g
  return response.replace(quotedPattern, (match, inner) => {
    if (originalSubmission.includes(inner)) return match
    return '[redacted: cross-student content]'
  })
}
