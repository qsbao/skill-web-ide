import { FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useThemeStore } from '../../stores/themeStore';

interface MarkdownBodyProps {
  content: string;
}

export function MarkdownBody({ content }: MarkdownBodyProps) {
  const theme = useThemeStore((s) => s.theme);

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <div className="w-10 h-10 rounded-lg bg-surface-overlay/50 border border-border-subtle/40 flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-theme-muted" />
        </div>
        <span className="text-theme-muted text-sm italic">
          No skill.md found. Add a skill.md file to describe this skill.
        </span>
      </div>
    );
  }

  return (
    <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
