import { useRef, useEffect } from 'react';
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
    <div className="h-full flex flex-col bg-gray-900">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {output.length === 0 ? (
          <span className="text-gray-600">No output yet. Run a test to see results.</span>
        ) : (
          output.map((line, i) => (
            <pre
              key={i}
              className={`whitespace-pre-wrap break-all ${
                line.stream === 'stderr' ? 'text-red-400' : 'text-gray-300'
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
