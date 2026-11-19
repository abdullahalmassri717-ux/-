import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { reportError } from '../../lib/errorLog';

// If one screen crashes, show a short message in its place (the menus keep
// working) instead of a blank page, and send the error to the admin's log.
export class ScreenErrorBoundary extends React.Component<{ resetKey: string; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    reportError(error, info.componentStack ?? undefined);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3" role="alert">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
        <strong className="block text-sm text-amber-900">حدث خطأ في هذه الصفحة</strong>
        <p className="text-xs text-amber-900">وصلنا تنبيه بالخطأ تلقائياً. أعد تحميل الصفحة، أو انتقل لصفحة أخرى من القائمة.</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3A5F] text-white text-xs font-bold cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> إعادة التحميل
        </button>
      </div>
    );
  }
}
