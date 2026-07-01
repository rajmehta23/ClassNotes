import { z } from 'zod';

/* ========================================================
   Note Model
   ======================================================== */
export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description is too long'),
  subject: z.string().min(2, 'Subject is required').max(50, 'Subject is too long'),
  category: z.string().min(2, 'Category is required').max(50, 'Category is too long'),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.enum(['pdf', 'image', 'text', 'docx', 'pptx', 'zip']),
  authorId: z.string(),
  authorName: z.string(),
  downloadsCount: z.number().default(0),
  ratingsAverage: z.number().default(0),
  ratingsCount: z.number().default(0),
  status: z.enum(['pending', 'approved', 'rejected']).default('approved'),
  reportsCount: z.number().default(0),
  createdAt: z.string(),
  originalFileName: z.string().optional(),
  storageFileName: z.string().optional(),
  storagePath: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  course: z.string().optional(),
  semester: z.string().optional(),
  learningResourceUrl: z.string()
    .refine((val) => {
      if (!val) return true;
      try {
        const url = new URL(val);
        return ['http:', 'https:'].includes(url.protocol);
      } catch {
        return false;
      }
    }, {
      message: 'Invalid learning resource URL. Must start with http:// or https://'
    })
    .optional()
    .or(z.literal('')),
});

export type Note = z.infer<typeof NoteSchema>;

// Note Upload validation schema (for form submissions)
export const NoteUploadSchema = NoteSchema.omit({
  id: true,
  authorId: true,
  authorName: true,
  downloadsCount: true,
  ratingsAverage: true,
  ratingsCount: true,
  status: true,
  reportsCount: true,
  createdAt: true,
});

export type NoteUploadInput = z.infer<typeof NoteUploadSchema>;

/* ========================================================
   Bookmark Model
   ======================================================== */
export const BookmarkSchema = z.object({
  id: z.string(),
  userId: z.string(),
  noteId: z.string(),
  bookmarkedAt: z.string(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;

/* ========================================================
   Download Record Model
   ======================================================== */
export const DownloadSchema = z.object({
  id: z.string(),
  userId: z.string(),
  noteId: z.string(),
  downloadedAt: z.string(),
  pointsSpent: z.number(),
});

export type Download = z.infer<typeof DownloadSchema>;

/* ========================================================
   Announcement Model
   ======================================================== */
export const AnnouncementSchema = z.object({
  id: z.string(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(1000, 'Content is too long'),
  authorId: z.string(),
  authorName: z.string(),
  priority: z.enum(['info', 'important', 'alert']),
  createdAt: z.string(),
});

export type Announcement = z.infer<typeof AnnouncementSchema>;

export const AnnouncementInputSchema = AnnouncementSchema.omit({
  id: true,
  authorId: true,
  authorName: true,
  createdAt: true,
});

export type AnnouncementInput = z.infer<typeof AnnouncementInputSchema>;

/* ========================================================
   Calendar Event Model
   ======================================================== */
export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  description: z.string().max(300, 'Description is too long').optional(),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['exam', 'assignment', 'lecture', 'holiday']),
  courseName: z.string().min(2, 'Course name is required'),
  createdAt: z.string(),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CalendarEventInputSchema = CalendarEventSchema.omit({
  id: true,
  createdAt: true,
});

export type CalendarEventInput = z.infer<typeof CalendarEventInputSchema>;

/* ========================================================
   Reward Item Model
   ======================================================== */
export const RewardItemSchema = z.object({
  id: z.string(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  pointsRequired: z.number().nonnegative('Points must be positive'),
  imageUrl: z.string().url('Invalid image URL'),
  downloadsCount: z.number().default(0),
  stock: z.number().nonnegative('Stock cannot be negative'),
  type: z.enum(['cheat_sheet', 'guide', 'summary', 'mock_exam']),
  createdAt: z.string(),
  course: z.string().optional(),
  semester: z.string().optional(),
});

export type RewardItem = z.infer<typeof RewardItemSchema>;

export const RewardItemInputSchema = RewardItemSchema.omit({
  id: true,
  downloadsCount: true,
  createdAt: true,
});

export type RewardItemInput = z.infer<typeof RewardItemInputSchema>;

/* ========================================================
   Note Request Model
   ======================================================== */
export const NoteRequestSchema = z.object({
  requestId: z.string(),
  subject: z.string().min(2, 'Subject is required'),
  topic: z.string().min(2, 'Topic is required'),
  description: z.string().optional(),
  requestedBy: z.string(),
  requestedByName: z.string(),
  course: z.string(),
  semester: z.string(),
  batch: z.string(),
  department: z.string(),
  interestedCount: z.number().default(0),
  interestedUsers: z.array(z.string()).default([]),
  status: z.enum(['pending', 'fulfilled']).default('pending'),
  createdAt: z.string(),
  fulfilledBy: z.string().optional(),
  fulfilledByName: z.string().optional(),
  fulfilledNoteId: z.string().optional(),
  fulfilledAt: z.string().optional(),
});

export type NoteRequest = z.infer<typeof NoteRequestSchema>;

