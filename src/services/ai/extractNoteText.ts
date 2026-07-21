import type { Note } from '@/types/database';

/**
 * Safely extracts raw text from a Note object for AI processing.
 * Combines note title, subject, category, description, and any inline/base64 text data.
 */
export async function extractNoteText(note: Note | null): Promise<string> {
  if (!note) {
    return '';
  }

  const parts: string[] = [];

  // Header metadata
  parts.push(`Title: ${note.title}`);
  parts.push(`Subject: ${note.subject}`);
  parts.push(`Category: ${note.category}`);
  
  if (note.description && note.description.trim()) {
    parts.push(`Description:\n${note.description.trim()}`);
  }

  // Base64 text content if note is a text file uploaded as data URI
  if (note.fileUrl && note.fileUrl.startsWith('data:')) {
    try {
      if (note.fileUrl.includes('text/plain') || note.fileUrl.includes('text/') || note.fileType === 'text') {
        const base64Part = note.fileUrl.split(',')[1];
        if (base64Part) {
          const decodedText = atob(base64Part);
          if (decodedText && decodedText.trim()) {
            parts.push(`\nNote Content:\n${decodedText.trim()}`);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to decode note text base64 data:', e);
    }
  } else if (note.fileType === 'text' && note.fileUrl && note.fileUrl.startsWith('http')) {
    try {
      const response = await fetch(note.fileUrl);
      if (response.ok) {
        const textContent = await response.text();
        if (textContent && textContent.trim()) {
          parts.push(`\nNote Content:\n${textContent.trim()}`);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch remote text note content:', e);
    }
  }

  return parts.join('\n\n');
}
