import type { Component, JSXElement } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';

import { isPrereleaseVersion } from '@/lib/version';

const stableClass = 'bg-primary/10 text-primary';
const prereleaseClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';

const displayVersion = (version: string): string => {
  const trimmed = version.trim();
  if (trimmed === '' || trimmed.toUpperCase() === 'N/A' || trimmed.startsWith('v')) {
    return trimmed;
  }
  return `v${trimmed}`;
};

export const VersionBadge: Component<{
  version: string;
  class?: string;
  children?: JSXElement;
}> = (props) => (
  <Badge
    class={`${isPrereleaseVersion(props.version) ? prereleaseClass : stableClass} px-3 py-1 text-sm font-medium ${props.class ?? ''}`}
  >
    {props.children ?? displayVersion(props.version)}
  </Badge>
);
