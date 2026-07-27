/**
 * Cover-letter HTML conversion — pure string helpers shared by the
 * generation pipeline (GenerationService) and the edit-mode cover-letter
 * upsert (ApplicationsService). Extracted from `ApplicationsService` during
 * the GenerationService split so neither service owns the other's copy.
 */

/**
 * Strip a wrapping Markdown code fence from LLM output. Models occasionally
 * return the whole cover letter inside a ```` ```markdown … ``` ```` block
 * despite the prompt asking for raw Markdown; without this the fence markers
 * leak into the rendered `<p>` text (the AI assistant in the Anschreiben tab
 * was wrapping the whole letter in a code fence).
 */
function stripMarkdownCodeFences(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('```')) {
    return content;
  }
  return trimmed
    .replace(/^```[\w-]*[ \t]*\r?\n?/, '')
    .replace(/\r?\n?[ \t]*```[ \t]*$/, '')
    .trim();
}

/**
 * Convert Markdown cover letter to HTML
 * The LLM generates Markdown but the PDF template expects HTML with <p> tags
 */
export function convertCoverLetterToHtml(content: string | null): string | null {
  if (!content || content.trim() === '') {
    return content;
  }

  // LLMs sometimes wrap the whole answer in a ```markdown … ``` fence even
  // though the prompt asks for raw Markdown — strip it first so the fence
  // markers never reach the rendered <p> output.
  const unfenced = stripMarkdownCodeFences(content);

  // If content already has <p> tags, it's already HTML (was edited and saved)
  if (/<p[^>]*>/i.test(unfenced)) {
    return unfenced;
  }

  // Simple Markdown to HTML conversion for paragraphs
  // Split by double newlines (paragraph breaks) and wrap each in <p> tags
  const paragraphs = unfenced
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return '<p></p>';
  }

  // Convert each paragraph, preserving single newlines as <br> within paragraphs
  return paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n');
}
