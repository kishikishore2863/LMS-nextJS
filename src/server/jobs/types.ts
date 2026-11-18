export type JobMap = {
  "notify.assignment": { courseId: string; learnerIds: string[]; dueDate: string | null; assignedBy: string };
  "certificate.generate": { userId: string; courseId: string };
  "notify.reminders": Record<string, never>;
};
export type JobName = keyof JobMap;
export const QUEUE_NAME = "lms";
