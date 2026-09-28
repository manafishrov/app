import type { CapabilityCatalog } from '@/stores/capabilityTypes';

import sdkGuide from './sdkGuide.txt?raw';
import waterSensor from './templates/waterSensor.py?raw';

export const guide = `${sdkGuide}\n\n### Complete water sensor example\n\n\`\`\`python\n${waterSensor}\`\`\`\n`;

const JSON_INDENT = 2;

/** Copy declarations only: live values and installed source aren't needed by an agent. */
export const buildAgentInstructions = (catalog: CapabilityCatalog): string =>
  [
    guide,
    '# Available readings and actions on this ROV',
    JSON.stringify(
      { sdkVersion: 1, readings: catalog.readings, actions: catalog.actions },
      null,
      JSON_INDENT,
    ),
  ].join('\n\n');
