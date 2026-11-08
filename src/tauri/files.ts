import { invokeCommand } from '@/tauri/core';

/*
 * Text files go through Rust so every platform gets its own picker: desktop
 * save/open dialogs, or the system export/import sheet on mobile.
 */
export const saveTextFile = (contents: string, fileName: string, title: string): Promise<boolean> =>
  invokeCommand<boolean>('save_text_file', { contents, fileName, title });

export const openTextFile = (extension: string, title: string): Promise<string | null> =>
  invokeCommand<string | null>('open_text_file', { extension, title });
