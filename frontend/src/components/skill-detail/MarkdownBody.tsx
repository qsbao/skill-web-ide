import { FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownBodyProps {
  content: string;
}

export function MarkdownBody({ content }: MarkdownBodyProps) {
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <div className="w-10 h-10 rounded-lg bg-surface-overlay/50 border border-border-subtle/40 flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-slate-500" />
        </div>
        <span className="text-slate-500 text-sm italic">
          No skill.md found. Add a skill.md file to describe this skill.
        </span>
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-200 prose-p:text-slate-300 prose-a:text-accent hover:prose-a:text-accent-hover prose-strong:text-slate-200 prose-code:text-accent prose-code:bg-surface-overlay prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-surface-inset prose-pre:border prose-pre:border-border-subtle/50 prose-blockquote:border-accent/40 prose-blockquote:text-slate-400 prose-hr:border-border-subtle prose-th:text-slate-300 prose-td:text-slate-400">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
