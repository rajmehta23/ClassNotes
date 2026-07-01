import { useEffect } from 'react';

/**
 * A hook to dynamically update document title and description meta tag for SEO.
 * @param title The title of the page
 * @param description The SEO meta description of the page
 */
export const useDocumentMetadata = (title: string, description: string) => {
  useEffect(() => {
    document.title = `${title} | ClassNotes`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
  }, [title, description]);
};

export default useDocumentMetadata;
