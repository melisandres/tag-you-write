/**
 * DiffManager
 * 
 * Handles rendering of text diffs in HTML format.
 * Converts diff_json (array of diff blocks) into HTML with appropriate styling.
 */
export class DiffManager {
    /**
     * Render diff blocks as HTML
     * 
     * @param {string|array} diffJson - JSON string or parsed array of diff blocks
     * @param {string} originalText - The original text (fallback if diff not available)
     * @returns {string} HTML string with diff rendering
     */
    static renderDiff(diffJson, originalText = '') {
        // If no diff data, return original text
        if (!diffJson) {
            console.log('DiffManager: No diffJson provided');
            return originalText || '';
        }

        // Parse JSON if it's a string
        let diffBlocks;
        try {
            diffBlocks = typeof diffJson === 'string' ? JSON.parse(diffJson) : diffJson;
        } catch (e) {
            console.error('DiffManager: Failed to parse diff_json', e, 'diffJson:', diffJson);
            return originalText || '';
        }

        // If not an array or empty, return original text
        if (!Array.isArray(diffBlocks) || diffBlocks.length === 0) {
            console.log('DiffManager: diffBlocks is not an array or is empty', diffBlocks);
            return originalText || '';
        }
        
        console.log('DiffManager: Rendering', diffBlocks.length, 'diff blocks');

        // Render each diff block
        let html = '';
        diffBlocks.forEach((block, index) => {
            if (!block || !block.type || !block.text) {
                return;
            }

            // Replace &nbsp; with regular space
            let text = block.text.replace(/&nbsp;/g, ' ');
            
            // Escape HTML (but preserve spaces)
            text = this.escapeHtml(text);
            
            // For insert/delete blocks, ensure proper spacing with surrounding text
            // Check previous block to see if we need space before
            let needsSpaceBefore = false;
            if (index > 0 && (block.type === 'insert' || block.type === 'delete')) {
                const prevBlock = diffBlocks[index - 1];
                if (prevBlock && prevBlock.text) {
                    // If previous block doesn't end with space and current doesn't start with space, add one
                    const prevText = prevBlock.text.replace(/&nbsp;/g, ' ');
                    if (!prevText.endsWith(' ') && !text.startsWith(' ')) {
                        needsSpaceBefore = true;
                    }
                }
            }
            
            // Check next block to see if we need space after
            let needsSpaceAfter = false;
            if (index < diffBlocks.length - 1 && (block.type === 'insert' || block.type === 'delete')) {
                const nextBlock = diffBlocks[index + 1];
                if (nextBlock && nextBlock.text) {
                    // If current block doesn't end with space and next doesn't start with space, add one
                    const nextText = nextBlock.text.replace(/&nbsp;/g, ' ');
                    if (!text.endsWith(' ') && !nextText.startsWith(' ')) {
                        needsSpaceAfter = true;
                    }
                }
            }
            
            let wrappedText = text;
            if (needsSpaceBefore) {
                wrappedText = ' ' + wrappedText;
            }
            if (needsSpaceAfter) {
                wrappedText = wrappedText + ' ';
            }
            
            switch (block.type) {
                case 'equal':
                    // Equal text - no special styling
                    html += `<span class="diff-equal">${wrappedText}</span>`;
                    break;
                case 'delete':
                    // Deleted text - strikethrough style
                    html += `<span class="diff-delete">${wrappedText}</span>`;
                    break;
                case 'insert':
                    // Inserted text - highlighted style
                    html += `<span class="diff-insert">${wrappedText}</span>`;
                    break;
                default:
                    // Unknown type - just show the text
                    html += wrappedText;
            }
        });

        return html || originalText || '';
    }

    /**
     * Escape HTML to prevent XSS
     * 
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Check if a node has diff data
     * 
     * @param {object} node - Node data object
     * @returns {boolean} True if diff data exists
     */
    static hasDiff(node) {
        return !!(node && node.diff_json);
    }

    /**
     * Get diff count for a node
     * 
     * @param {object} node - Node data object
     * @returns {number} Diff count or 0
     */
    static getDiffCount(node) {
        return (node && node.diff_count) ? parseInt(node.diff_count) : 0;
    }
}

