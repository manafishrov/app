import { useConfigStore } from '@/stores/configStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { SettingsIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toaster';

const formSchema = z.object({
  ipAddress: z.string(),
  cameraStreamPort: z.number(),
  deviceControlsPort: z.number(),
});

function SettingsDialog() {
  const config = useConfigStore((state) => state.config);
  const updateServerSettings = useConfigStore(
    (state) => state.updateServerSettings,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ipAddress: config?.ipAddress,
      cameraStreamPort: config?.cameraStreamPort,
      deviceControlsPort: config?.deviceControlsPort,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        ipAddress: config.ipAddress,
        cameraStreamPort: config.cameraStreamPort,
        deviceControlsPort: config.deviceControlsPort,
      });
    }
  }, [config, form]);

  if (!config) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateServerSettings(
        values.ipAddress,
        values.cameraStreamPort,
        values.deviceControlsPort,
      );
      toast.success('Settings updated');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon'>
          <SettingsIcon className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>Show keyboard layout</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Configure your Cyberfish Raspberry Pi connection settings.
        </DialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
            <FormField
              control={form.control}
              name='ipAddress'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IP address</FormLabel>
                  <FormControl>
                    <Input placeholder='10.10.10.10' {...field} />
                  </FormControl>
                  <FormDescription>
                    The IP address of your Cyberfish Raspberry Pi.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='cameraStreamPort'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Camera stream port</FormLabel>
                  <FormControl>
                    <Input
                      type='text'
                      pattern='[0-9]*'
                      inputMode='numeric'
                      placeholder='8889'
                      {...field}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        field.onChange(value ? Number(value) : null);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    The port number for the camera stream.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='deviceControlsPort'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device controls port</FormLabel>
                  <FormControl>
                    <Input
                      type='text'
                      pattern='[0-9]*'
                      inputMode='numeric'
                      placeholder='5000'
                      {...field}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        field.onChange(value ? Number(value) : null);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    The port number for controlling the ROV and obtaining
                    statuses.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit'>Save</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { SettingsDialog };
