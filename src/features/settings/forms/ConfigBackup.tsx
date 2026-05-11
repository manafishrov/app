import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@manafishrov/ui/card';
import { toast } from '@manafishrov/ui/toaster';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { unwrap } from 'solid-js/store';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { importRovConfig } from '@/tauri';

const JSON_INDENT = 2;
const FILE_NAME_FALLBACK = 'rov-config';
const JSON_EXTENSION = 'json';

const passThroughReplacer = (_key: string, value: unknown): unknown => value;

const skip = (): Promise<void> =>
  new Promise<void>((resolve) => {
    resolve();
  });

const buildExportFileName = (rovName: string): string => {
  const slug = rovName
    .trim()
    .replaceAll(/[^a-zA-Z0-9_-]+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');
  const base = slug === '' ? FILE_NAME_FALLBACK : slug;
  return `${base}-config.${JSON_EXTENSION}`;
};

type ParseOutcome = { ok: true; value: unknown } | { ok: false };

const tryParseJson = (text: string): ParseOutcome => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    logError('Invalid JSON in ROV config file:', error);
    return { ok: false };
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const writeConfigFile = (filePath: string, json: string): Promise<void> =>
  writeTextFile(filePath, json).then(() => {
    toast.create({ title: m.toasts_rov_config_exported(), type: 'success' });
  });

const handleInvalidJson = (): Promise<void> => {
  toast.create({ title: m.toasts_rov_config_import_invalid_json(), type: 'error' });
  return skip();
};

const handleNotAnObject = (): Promise<void> => {
  toast.create({ title: m.toasts_rov_config_import_not_object(), type: 'error' });
  return skip();
};

const sendImport = (payload: Record<string, unknown>): Promise<void> => importRovConfig(payload);

const processImportedContents = (contents: string): Promise<void> => {
  const parsed = tryParseJson(contents);
  if (!parsed.ok) {
    return handleInvalidJson();
  }
  if (!isPlainObject(parsed.value)) {
    return handleNotAnObject();
  }
  return sendImport(parsed.value);
};

const runExport = (json: string, defaultPath: string): Promise<void> =>
  save({
    title: m.general_rov_settings_config_backup_export_dialog_title(),
    defaultPath,
    filters: [{ name: 'JSON', extensions: [JSON_EXTENSION] }],
  }).then((filePath) => (typeof filePath === 'string' ? writeConfigFile(filePath, json) : skip()));

const handleExport = (): void => {
  const snapshot = structuredClone(unwrap(rovConfigStore));
  const json = JSON.stringify(snapshot, passThroughReplacer, JSON_INDENT);
  const defaultPath = buildExportFileName(snapshot.rovName);

  runExport(json, defaultPath).catch((error: unknown) => {
    logError('Failed to export ROV config:', error);
    toast.create({ title: m.toasts_rov_config_export_failed(), type: 'error' });
  });
};

const runImport = (): Promise<void> =>
  open({
    title: m.general_rov_settings_config_backup_import_dialog_title(),
    multiple: false,
    directory: false,
    filters: [{ name: 'JSON', extensions: [JSON_EXTENSION] }],
  }).then((selected) =>
    typeof selected === 'string' ? readTextFile(selected).then(processImportedContents) : skip(),
  );

const handleImport = (): void => {
  runImport().catch((error: unknown) => {
    logError('Failed to import ROV config:', error);
    toast.create({ title: m.toasts_rov_config_import_failed(), type: 'error' });
  });
};

export const ConfigBackup: Component = () => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_rov_settings_config_backup_title()}</CardTitle>
      <CardDescription>{m.general_rov_settings_config_backup_description()}</CardDescription>
      <CardAction class='flex flex-wrap gap-2'>
        <Button variant='outline' onClick={handleExport}>
          {m.general_rov_settings_config_backup_export()}
        </Button>
        <Button variant='outline' onClick={handleImport}>
          {m.general_rov_settings_config_backup_import()}
        </Button>
      </CardAction>
    </CardHeader>
  </Card>
);
