import type { Component } from 'solid-js';

import * as m from '@/paraglide/messages';

import type { AnalysisStatus } from './pythonLanguageServer';

const messages: Record<AnalysisStatus, () => string> = {
  starting: m.extensions_analysis_starting,
  missingSdk: m.extensions_analysis_missing_sdk,
  cachedSdk: m.extensions_analysis_cached_sdk,
  failed: m.extensions_analysis_failed,
  ready: (): string => '',
};
export const PythonAnalysisStatus: Component<{ status: AnalysisStatus }> = (props) => (
  <Show when={props.status !== 'ready'}>
    <span class='text-xs text-muted-foreground' role='status'>
      {messages[props.status]()}
    </span>
  </Show>
);
