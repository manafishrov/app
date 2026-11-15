import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@manafishrov/ui/field';
import { TextInputControl, TextInputInput } from '@manafishrov/ui/text-input';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore, setConfig } from '@/stores/config';
import { describePhotoDirectory } from '@/tauri/photoDirectory';
import { pickVideoDirectory } from '@/tauri/videoDirectory';

const DEFAULT_DIRECTORY = '';

const savePhotoDirectory = (directory: string): void => {
  setConfig({ photoDirectory: directory }).catch(logError);
};

const handleSelect = (): void => {
  // The system folder picker is the same for videos and photos.
  pickVideoDirectory()
    .then((picked) => {
      if (picked) {
        savePhotoDirectory(picked.directory);
      }
    })
    .catch(logError);
};

const describe = (directory: string): Promise<string> =>
  describePhotoDirectory(directory)
    .then((name) =>
      directory === DEFAULT_DIRECTORY
        ? m.general_settings_photo_directory_default({ location: name })
        : name,
    )
    .catch(() => m.general_settings_photo_directory_unavailable());

/*
 * Mobile folders are only reachable through the system picker, so the config
 * stores the picker's access token and this shows the folder's name instead.
 * An empty token is the platform default (Pictures/Manafish on Android, the
 * app's folder in the Files app on iOS).
 */
export const MobilePhotoDirectory: Component = () => {
  const [name] = createResource(() => configStore.photoDirectory, describe);

  return (
    <Field readOnly>
      <FieldLabel>{m.general_settings_photo_directory_title()}</FieldLabel>
      <FieldContent>
        <div class='flex flex-wrap items-center gap-2'>
          <TextInputControl class='min-w-48 flex-1'>
            <TextInputInput value={name() ?? ''} readOnly />
          </TextInputControl>
          <Button
            onClick={handleSelect}
            aria-label={m.aria_labels_select_photo_directory()}
            variant='outline'
          >
            {m.general_settings_photo_directory_select_directory()}
          </Button>
          <Show when={configStore.photoDirectory !== DEFAULT_DIRECTORY}>
            <Button
              variant='outline'
              onClick={() => {
                savePhotoDirectory(DEFAULT_DIRECTORY);
              }}
            >
              {m.general_settings_photo_directory_use_default()}
            </Button>
          </Show>
        </div>
        <FieldDescription>{m.general_settings_photo_directory_description()}</FieldDescription>
      </FieldContent>
    </Field>
  );
};
