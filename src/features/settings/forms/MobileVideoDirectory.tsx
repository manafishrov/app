import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@manafishrov/ui/field';
import { TextInputControl, TextInputInput } from '@manafishrov/ui/text-input';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore, setConfig } from '@/stores/config';
import { describeVideoDirectory, pickVideoDirectory } from '@/tauri/videoDirectory';

const DEFAULT_DIRECTORY = '';

const saveVideoDirectory = (directory: string): void => {
  setConfig({ videoDirectory: directory }).catch(logError);
};

const handleSelect = (): void => {
  pickVideoDirectory()
    .then((picked) => {
      if (picked) {
        saveVideoDirectory(picked.directory);
      }
    })
    .catch(logError);
};

const describe = (directory: string): Promise<string> =>
  describeVideoDirectory(directory)
    .then((name) =>
      directory === DEFAULT_DIRECTORY
        ? m.general_settings_video_directory_default({ location: name })
        : name,
    )
    .catch(() => m.general_settings_video_directory_unavailable());

/*
 * Mobile folders are only reachable through the system picker, so the config
 * stores the picker's access token and this shows the folder's name instead.
 * An empty token is the platform default (Movies/Manafish on Android, the
 * app's folder in the Files app on iOS).
 */
export const MobileVideoDirectory: Component = () => {
  const [name] = createResource(() => configStore.videoDirectory, describe);

  return (
    <Field readOnly>
      <FieldLabel>{m.general_settings_video_directory_title()}</FieldLabel>
      <FieldContent>
        <div class='flex flex-wrap items-center gap-2'>
          <TextInputControl class='min-w-48 flex-1'>
            <TextInputInput value={name() ?? ''} readOnly />
          </TextInputControl>
          <Button
            onClick={handleSelect}
            aria-label={m.aria_labels_select_video_directory()}
            variant='outline'
          >
            {m.general_settings_video_directory_select_directory()}
          </Button>
          <Show when={configStore.videoDirectory !== DEFAULT_DIRECTORY}>
            <Button
              variant='outline'
              onClick={() => {
                saveVideoDirectory(DEFAULT_DIRECTORY);
              }}
            >
              {m.general_settings_video_directory_use_default()}
            </Button>
          </Show>
        </div>
        <FieldDescription>{m.general_settings_video_directory_description()}</FieldDescription>
      </FieldContent>
    </Field>
  );
};
