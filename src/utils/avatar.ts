import type { UserProfile } from '@/types/auth';

/**
 * Resolves the avatar source URL for a user based on the priority chain:
 * 1. Cloudinary uploaded custom photoURL (from database/Firestore)
 *    Note: If photoURL is explicitly set to 'none', it indicates the user
 *    has removed their picture and wishes to use the default profile icon.
 * 2. Google Authentication photoURL (attached to the user profile in-memory/cache)
 * 3. Fallback (returns null, which displays the default avatar profile icon)
 */
export const getUserAvatarUrl = (user: UserProfile | null | undefined): string | null => {
  if (!user) return null;
  if (user.photoURL) {
    if (user.photoURL === 'none') return null;
    return user.photoURL;
  }
  if ((user as any).googlePhotoURL) {
    return (user as any).googlePhotoURL;
  }
  return null;
};
