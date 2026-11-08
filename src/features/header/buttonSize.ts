import { isMobile } from '@/lib/platform';

/*
 * The desktop title bar is compact; on touch screens the same buttons need a
 * finger-sized target.
 */
export const headerButtonSize = isMobile ? 'icon-lg' : 'icon-xs';
