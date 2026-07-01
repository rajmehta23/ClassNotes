export type UserRole = 'admin' | 'student' | 'guest';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  points: number;
  status?: 'active' | 'suspended';
  course?: string;
  semester?: string;
  googlePhotoURL?: string;
  photoURL?: string;
  batch?: string;
  department?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
