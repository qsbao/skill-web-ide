import { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { useTestStore } from '../../stores/testStore';

function colorize(text: string): string {
  // Strip ANSI escape codes but use them for basic coloring
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export function OutputPanel() {
  const { output, running, lastStatus, clearOutput } = useTestStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {output.length === 0 ? (
          <div className="flex items-center gap-2 text-theme-muted py-2">
            <Terminal className="w-4 h-4" />
            <span>No output yet. Run a test to see results.</span>
          </div>
        ) : (
          output.map((line, i) => (
            <pre
              key={i}
              className={`whitespace-pre-wrap break-all leading-relaxed ${
                line.stream === 'stderr' ? 'text-red-400' : 'text-theme-primary'
              }`}
            >
              {colorize(line.data)}
            </pre>
          ))
        )}
      </div>
    </div>
  );
}
