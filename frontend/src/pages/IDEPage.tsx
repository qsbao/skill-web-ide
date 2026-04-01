import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Construction, X } from 'lucide-react';
import { IDELayout } from '../layouts/IDELayout';
import { useSkills } from '../hooks/useSkills';

export function IDEPage() {
  const { author, name } = useParams<{ author: string; name: string }>();
  const { selectSkill } = useSkills();
  const [bannerVisible, setBannerVisible] = useState(true);

  useEffect(() => {
    if (author && name) {
      const slug = `@${author}/${name}`;
      selectSkill(slug);
    }
  }, [author, name, selectSkill]);

  return (
    <div className="relative h-full">
      <IDELayout />
      {bannerVisible && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-lg backdrop-blur-lg bg-surface-base/75 border border-border-subtle shadow-lg">
          <Construction className="w-4 h-4 text-theme-accent shrink-0" />
          <span className="text-xs text-theme-secondary whitespace-nowrap">
            This page is under construction — feel free to explore.
          </span>
          <button
            onClick={() => setBannerVisible(false)}
            className="btn-ghost p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5 text-theme-muted" />
          </button>
        </div>
      )}
    </div>
  );
}
