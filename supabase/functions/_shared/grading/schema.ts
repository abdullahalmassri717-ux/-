import { z } from 'zod';

// The exact shape the model must answer in. The API enforces it, so we never
// have to guess-parse free text.

export const GradingOutputSchema = z.object({
  student_code_on_paper: z.string().nullable(),
  questions: z.array(
    z.object({
      question_number: z.number().int(),
      transcription: z.string(),
      criteria: z.array(
        z.object({
          criterion: z.string(),
          met: z.boolean(),
          points_awarded: z.number(),
        }),
      ),
      score: z.number(),
      reason: z.string(),
      feedback_for_student: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      unreadable: z.boolean(),
    }),
  ),
});

export type GradingOutput = z.infer<typeof GradingOutputSchema>;
