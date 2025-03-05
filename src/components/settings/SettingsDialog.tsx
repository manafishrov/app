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
  ip: z.string(),
  streamPort: z.number(),
  controlPort: z.number(),
});

function SettingsDialog() {
  const config = useConfigStore((state) => state.config);
  const updateServerSettings = useConfigStore(
    (state) => state.updateServerSettings,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ip: config?.ip,
      streamPort: config?.streamPort,
      controlPort: config?.controlPort,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        ip: config.ip,
        streamPort: config.streamPort,
        controlPort: config.controlPort,
      });
    }
  }, [config, form]);

  if (!config) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateServerSettings(
        values.ip,
        values.streamPort,
        values.controlPort,
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
              name='ip'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IP Address</FormLabel>
                  <FormControl>
                    <Input placeholder='10.10.10.10' {...field} />
                  </FormControl>
                  <FormDescription>
                    The IP Address of your Cyberfish Raspberry Pi.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='streamPort'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream Port</FormLabel>
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
                    The port number for video streaming.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='controlPort'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Control Port</FormLabel>
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
                    The port number for control commands.
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
