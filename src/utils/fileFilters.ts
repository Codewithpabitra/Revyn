const IGNORED_PATTERNS: RegExp[] = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.min\.(js|css)$/,
  /^dist\//,
  /^build\//,
  /^node_modules\//,
  /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
  /\.(lock|log)$/,
];

const MAX_PATCH_SIZE_CHARS = 8000; // roughly ~2000 tokens, keeps prompts small and cheap

export function shouldReviewFile(filename: string, patch: string | undefined): boolean {
  if (!patch) return false; // binary or too large for GitHub to even include a patch
  if (IGNORED_PATTERNS.some((pattern) => pattern.test(filename))) return false;
  if (patch.length > MAX_PATCH_SIZE_CHARS) return false; // skip huge diffs rather than truncate silently
  return true;
}