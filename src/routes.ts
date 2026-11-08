import { ScreenId, UserRole } from './types';

// Every screen has a real web address, so links can be shared, bookmarked and
// opened from WhatsApp (for example the student submission link /s/<code>).

export const SCREEN_PATHS: Record<ScreenId, string> = {
  // Visitors and students
  A1: '/',
  A2: '/pricing',
  A3: '/register',
  A4: '/login',
  A5: '/s/demo',

  // Teacher
  B1: '/app',
  B2: '/app/groups',
  B3: '/app/student',
  B4: '/app/assignments',
  B5: '/app/assignments/new',
  B6: '/app/answer-sheets',
  B7: '/app/upload',
  B8: '/app/review',
  B9: '/app/results',
  B10: '/app/reports',
  B11: '/app/billing',
  B12: '/app/corrected-paper',
  B14: '/app/progress',
  B15: '/app/diagnostics',
  SUPPORT: '/app/support',

  // Teacher AI tools
  C_HUB: '/app/ai-tools',
  C1: '/app/ai-tools/generate-exam',
  C2: '/app/ai-tools/remedial',
  C3: '/app/ai-tools/question-bank',
  C4: '/app/ai-tools/assistant',
  C5: '/app/ai-tools/convert-exam',
  C6: '/app/ai-tools/group-answers',
  C7: '/app/ai-tools/study-plan',
  C8: '/app/ai-tools/at-risk',
  C9: '/app/ai-tools/parent-replies',
  C_FILES: '/app/ai-tools/my-files',

  // School management
  D1: '/school',
  D2: '/school/teachers',
  D3: '/school/report',
  D4: '/school/compare',

  // Platform admin
  E1: '/admin',
  E2: '/admin/billing',
  E3: '/admin/quality',
  E4: '/admin/curricula',
  E5: '/admin/support',
  E6: '/admin/landing',
};

const PATH_TO_SCREEN = new Map<string, ScreenId>(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen as ScreenId])
);

const normalize = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

export function pathForScreen(screen: ScreenId): string {
  return SCREEN_PATHS[screen] ?? '/';
}

export function screenForPath(pathname: string): ScreenId {
  const path = normalize(pathname);
  // Student submission links look like /s/<link-code>
  if (path.startsWith('/s/')) return 'A5';
  return PATH_TO_SCREEN.get(path) ?? 'A1';
}

// The area of the address decides which role's screens are shown. With real
// sign-in, App.tsx also checks the signed-in account may open that area.
export function roleForPath(pathname: string): UserRole {
  const path = normalize(pathname);
  if (path.startsWith('/s/')) return 'student';
  if (path === '/app' || path.startsWith('/app/')) return 'teacher';
  if (path === '/school' || path.startsWith('/school/')) return 'school_principal';
  if (path === '/admin' || path.startsWith('/admin/')) return 'platform_admin';
  return 'visitor';
}
