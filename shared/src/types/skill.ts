export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  entrypoint: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  children?: SkillFile[];
}
