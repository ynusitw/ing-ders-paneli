export type Role = "TEACHER" | "STUDENT";
export type SlotStatus = "OPEN" | "REQUESTED" | "BOOKED";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LessonStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type AssignmentStatus = "ASSIGNED" | "SUBMITTED" | "GRADED";

export type NotificationType =
  | "REQUEST_CREATED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_SUBMITTED"
  | "ASSIGNMENT_GRADED"
  | "LEVEL_UP"
  | "LESSON_CANCELLED"
  | "LESSON_COMPLETED";
