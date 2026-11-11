import type { ExamToGrade } from './types.ts';

// The instructions are the same for every paper, so they are cached by the
// API after the first call. The exam (questions + rubric) is the same for
// every student in the exam, so it is cached too. Only the photo changes.

export const GRADING_INSTRUCTIONS = `You grade handwritten student exam papers for a teacher in Gaza, Palestine. Papers are usually in Arabic (right to left), sometimes in English. Math may use Arabic letters for variables (س، ص) and Arabic-Indic digits.

You will receive the exam (questions, model answers, and the teacher's rubric) and photos of one student's paper.

For each question in the exam:
1. Find the student's answer on the paper and transcribe it faithfully, including mistakes. Do not correct the student's work in the transcription.
2. Check each rubric criterion and decide whether it is met. Award the criterion's points only when it is clearly met. Partial points inside one criterion are allowed only if the criterion text says so.
3. The score is the sum of the awarded points and never exceeds the question's maximum.
4. Accept correct methods that differ from the model answer, and give method marks when the rubric rewards steps even if the final answer is wrong.
5. Write a short reason for the teacher explaining the score.
6. Write a short, kind, specific note for the student, in the requested feedback language, like a teacher's red-pen comment.
7. Rate your confidence:
   - high: the handwriting is clear and the rubric decision is unambiguous.
   - medium: small doubts about reading a symbol or applying a criterion.
   - low: you could not read important parts, the answer is missing or in an unexpected place, or the rubric decision is a judgement call the teacher should make.
   Be honest. A wrong "high" is worse than an honest "low", because the teacher only reviews unsure answers.
8. If the answer area is blank, give 0, say so, and use high confidence. If it is unreadable, set unreadable to true and confidence to low.

Also report the student code written on the paper (usually 4 digits near the top), or null if there is none.
If a class list is given, also read the student's name written on the paper (it may be handwritten by a young child, often near the top) and report the one name from the class list that it matches, copied exactly as it appears in the list. Report null if no name is written, or if you are not sure which single student it is (for example, two students in the list share the written first name).

Follow the teacher's rubric exactly. Never invent criteria. Never award more than the rubric allows.`;

export function renderExam(exam: ExamToGrade): string {
  const lines: string[] = [];
  lines.push(`Exam: ${exam.title}`);
  lines.push(`Subject: ${exam.subject}`);
  lines.push(`Feedback language for the student: ${exam.feedbackLanguage ?? 'ar'}`);
  lines.push('');
  for (const q of exam.questions) {
    lines.push(`<question number="${q.questionNumber}" type="${q.type}" max_score="${q.maxScore}">`);
    lines.push(`Question: ${q.text}`);
    if (q.lesson) lines.push(`Lesson: ${q.lesson}`);
    lines.push(`Model answer: ${q.modelAnswer}`);
    lines.push('Rubric:');
    q.criteria.forEach((c, i) => lines.push(`  ${i + 1}. (${c.points} points) ${c.description}`));
    lines.push('</question>');
    lines.push('');
  }
  if (exam.classRoster?.length) {
    lines.push('<class_list>');
    for (const name of exam.classRoster) lines.push(name);
    lines.push('</class_list>');
  }
  return lines.join('\n');
}

/** Lower effort for papers that are only multiple choice: cheaper, same accuracy. */
export function effortForExam(exam: ExamToGrade): 'low' | 'medium' {
  return exam.questions.every((q) => q.type === 'multiple_choice') ? 'low' : 'medium';
}
