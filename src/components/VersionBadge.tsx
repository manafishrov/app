import type { Component, JSXElement } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';

import { formatVersionForDisplay, isPrereleaseVersion } from '@/lib/version';

const stableClass = 'bg-primary/10 text-primary';
const prereleaseClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
const unknownClass = 'bg-muted text-muted-foreground';

const exactVersionTitle = (version: string): string | undefined => {
  const trimmed = version.trim();
  if (!trimmed.includes('+')) {
    return;
  }
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
};

const versionClass = (version: string): string => {
  const prerelease = isPrereleaseVersion(version);
  if (prerelease === null) {
    return unknownClass;
  }
  return prerelease ? prereleaseClass : stableClass;
};

export const VersionBadge: Component<{
  version: string;
  class?: string;
  children?: JSXElement;
}> = (props) => (
  <Badge
    class={`${versionClass(props.version)} px-3 py-1 text-sm font-medium ${props.class ?? ''}`}
    title={exactVersionTitle(props.version)}
  >
    {props.children ?? formatVersionForDisplay(props.version)}
  </Badge>
);
