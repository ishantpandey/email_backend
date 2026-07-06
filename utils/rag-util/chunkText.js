/**
 * Split text into paragraph-based chunks with overlap.
 *
 * Why paragraphs?
 * -----------------------------
 * Paragraphs represent complete thoughts or ideas.
 * Chunking by paragraphs preserves semantic meaning better
 * than arbitrary character splits.
 *
 * Why overlap?
 * -----------------------------
 * Example:
 *
 * Chunk 1:
 * "React is a JavaScript library developed by Facebook...
 * [Paragraph 1] [Paragraph 2]"
 *
 * Chunk 2:
 * "[Paragraph 2] [Paragraph 3] [Paragraph 4]..."
 *
 * The overlap preserves context between chunks and improves
 * semantic search accuracy.
 *
 * @param {string} text
 * @param {Object} options
 * @param {number} options.chunkSize Target characters per chunk (guide, not strict limit)
 * @param {number} options.chunkOverlap Number of paragraphs to overlap
 *
 * @returns {string[]}
 */

const chunkText = (
  text,
  {
    chunkSize = 1000,
    chunkOverlap = 1,
  } = {}
) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Validate parameters
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0");
  }
  
  if (chunkOverlap < 0) {
    throw new Error("chunkOverlap must be non-negative");
  }

  // Clean and normalize text
  const cleanedText = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!cleanedText.length) {
    return [];
  }

  /**
   * Split by paragraphs
   * - Double newlines indicate paragraph breaks
   * - Single newlines also considered for better splitting
   */
  const paragraphs = cleanedText
    .split(/\n\n+/)
    .flatMap(para => para.split('\n'))
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paraSize = paragraph.length;

    /**
     * If adding this paragraph exceeds chunk size
     * and we already have content, save the current chunk
     */
    if (currentSize + paraSize > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      
      /**
       * Start new chunk with overlap
       * Include last N paragraphs from previous chunk
       */
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
      currentChunk = currentChunk.slice(overlapStart);
      currentSize = currentChunk.reduce((sum, p) => sum + p.length + 2, 0); // +2 for \n\n
    }

    currentChunk.push(paragraph);
    currentSize += paraSize + 2; // +2 for \n\n separator
  }

  /**
   * Add remaining paragraphs as final chunk
   */
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks;
};

module.exports = {
  chunkText
};