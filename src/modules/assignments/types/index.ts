export type SupportedFileType = 'text' | 'pdf' | 'docx' | 'image' | 'zip' | 'other';

export interface FileAttachment {
  name: string;
  url: string;
  type: SupportedFileType;
  size?: number;
  mimeType?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  course: string;
  semester: string;
  teacherId: string;
  teacherName: string;
  dueDate: string;
  createdAt: string;
  attachments?: FileAttachment[];
  status: 'active' | 'closed';
  maxPoints?: number;
  // AI Essay Rubric (Phase 5 placeholder ready)
  rubric?: {
    grammarWeight: number;
    vocabularyWeight: number;
    structureWeight: number;
    contentWeight: number;
    creativityWeight: number;
  };
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submissionText: string;
  attachments: FileAttachment[];
  submittedAt: string;
  status: 'submitted' | 'graded' | 'late';
  grade?: number;
  feedback?: string;
  // Evaluation reference for Phase 5
  aiEvaluationId?: string;
}

export interface CreateAssignmentInput {
  title: string;
  description: string;
  subject: string;
  course: string;
  semester: string;
  dueDate: string;
  attachments?: FileAttachment[];
  maxPoints?: number;
}

export interface SubmitAssignmentInput {
  assignmentId: string;
  submissionText: string;
  attachments: FileAttachment[];
}
