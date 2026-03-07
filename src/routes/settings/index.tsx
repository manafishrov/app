import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

function General() {
  // Const config = useStore(configStore, (state) =>
  //   State
  //     ? {
  //         VideoDirectory: state.videoDirectory,
  //         AutoUpdate: state.autoUpdate,
  //         AttitudeIndicator: state.attitudeIndicator,
  //         WorkIndicator: state.workIndicator,
  //         ThrusterRpmOverlay: state.thrusterRpmOverlay,
  //       }
  //     : null,
  // );
  // Const appVersion = Route.useLoaderData();
  // Const { theme, setTheme } = useTheme();
  //
  // Const [radioSelectedTheme, setRadioSelectedTheme] = useState<Theme>(theme);
  //
  // UseEffect(() => {
  //   If (theme !== radioSelectedTheme) {
  //     // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
  //     SetRadioSelectedTheme(theme);
  //   }
  //   //eslint-disable-next-line react-compiler/react-compiler
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [theme]);
  //
  // Const styleId = 'theme-transition-styles';
  //
  // Const updateStyles = useCallback((css: string) => {
  //   If (typeof window === 'undefined') return;
  //   Let styleElement = document.getElementById(styleId) as HTMLStyleElement;
  //   If (!styleElement) {
  //     StyleElement = document.createElement('style');
  //     StyleElement.id = styleId;
  //     Document.head.appendChild(styleElement);
  //   }
  //
  //   StyleElement.textContent = css;
  // }, []);
  //
  // Const setThemeWithAnimation = useCallback(
  //   (theme: Theme) => {
  //     Const animation = createAnimation();
  //
  //     UpdateStyles(animation);
  //
  //     If (typeof window === 'undefined') return;
  //
  //     Const switchTheme = () => {
  //       SetTheme(theme);
  //     };
  //
  //     If (!document.startViewTransition) {
  //       SwitchTheme();
  //       Return;
  //     }
  //
  //     Document.startViewTransition(switchTheme);
  //   },
  //   [setTheme, updateStyles],
  // );
  //
  // If (!config) return;
  //
  // Async function selectVideoDirectory() {
  //   Try {
  //     Const result = await open({
  //       Directory: true,
  //       Multiple: false,
  //       Title: 'Select Video Directory',
  //       DefaultPath: config?.videoDirectory,
  //     });
  //     If (typeof result === 'string') {
  //       Await setConfig({ videoDirectory: result });
  //     }
  //   } catch (error) {
  //     LogError('Error opening file picker dialog:', error);
  //     Toast.error('Failed to open file picker dialog');
  //   }
  // }

  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>General</H1>
        <P>Generic settings for the Manafish application.</P>
      </div>
      {/* <div className='space-y-6'> */}
      {/*   {appVersion && ( */}
      {/*     <div> */}
      {/*       <h4 className='text-lg font-medium'>App Version</h4> */}
      {/*       <p className='text-muted-foreground text-sm'> */}
      {/*         Current version of the Manafish application. */}
      {/*       </p> */}
      {/*       <Badge className='bg-primary/10 text-primary mt-2 rounded-full px-3 py-1 text-sm font-medium'> */}
      {/*         V{appVersion} */}
      {/*       </Badge> */}
      {/*     </div> */}
      {/*   )} */}
      {/*   <div> */}
      {/*     <h4 className='text-lg font-medium'>Automatic Updates</h4> */}
      {/*     <p className='text-muted-foreground text-sm'> */}
      {/*       Enable or disable automatic updates on startup. */}
      {/*     </p> */}
      {/*     <div className='mt-2 flex items-center gap-3'> */}
      {/*       <Switch */}
      {/*         Id='autoUpdate' */}
      {/*         Checked={config.autoUpdate ?? false} */}
      {/*         OnCheckedChange={() => */}
      {/*           SetConfig({ autoUpdate: !config.autoUpdate }) */}
      {/*         } */}
      {/*       /> */}
      {/*       <Label htmlFor='autoUpdate'>Enable automatic app updates</Label> */}
      {/*     </div> */}
      {/*   </div> */}
      {/*   <div> */}
      {/*     <h4 className='text-lg font-medium'>Video Directory</h4> */}
      {/*     <p className='text-muted-foreground text-sm'> */}
      {/*       Set the directory where recordings are stored. */}
      {/*     </p> */}
      {/*     <div className='mt-2 flex items-center gap-3'> */}
      {/*       <Input */}
      {/*         ReadOnly */}
      {/*         Value={config.videoDirectory} */}
      {/*         ClassName='w-full max-w-xs' */}
      {/*       /> */}
      {/*       <Button */}
      {/*         OnClick={selectVideoDirectory} */}
      {/*         Aria-label='Select Video Directory' */}
      {/*       > */}
      {/*         Select Directory */}
      {/*       </Button> */}
      {/*     </div> */}
      {/*   </div> */}
      {/*   <div> */}
      {/*     <h3 className='text-2xl font-semibold tracking-tight'>Appearance</h3> */}
      {/*     <div className='mt-4 space-y-6'> */}
      {/*       <div> */}
      {/*         <h4 className='text-lg font-medium'>Theme</h4> */}
      {/*         <p className='text-muted-foreground text-sm'> */}
      {/*           Select the color scheme for the application. */}
      {/*         </p> */}
      {/*         <RadioGroup */}
      {/*           Value={radioSelectedTheme} */}
      {/*           OnValueChange={(value) => { */}
      {/*             Const next = value as Theme; */}
      {/*             SetRadioSelectedTheme(next); */}
      {/*             SetThemeWithAnimation(next); */}
      {/*           }} */}
      {/*           ClassName='mt-2 space-y-1' */}
      {/*         > */}
      {/*           <div className='flex items-center gap-3'> */}
      {/*             <RadioGroupItem value='light' id='theme-light' /> */}
      {/*             <Label htmlFor='theme-light'>Light</Label> */}
      {/*           </div> */}
      {/*           <div className='flex items-center gap-3'> */}
      {/*             <RadioGroupItem value='dark' id='theme-dark' /> */}
      {/*             <Label htmlFor='theme-dark'>Dark</Label> */}
      {/*           </div> */}
      {/*           <div className='flex items-center gap-3'> */}
      {/*             <RadioGroupItem value='system' id='theme-system' /> */}
      {/*             <Label htmlFor='theme-system'>System</Label> */}
      {/*           </div> */}
      {/*         </RadioGroup> */}
      {/*       </div> */}
      {/*       <div> */}
      {/*         <h4 className='text-lg font-medium'>Attitude Indicator</h4> */}
      {/*         <p className='text-muted-foreground text-sm'> */}
      {/*           Select the style of the attitude indicator. */}
      {/*         </p> */}
      {/*         <RadioGroup */}
      {/*           Value={config.attitudeIndicator} */}
      {/*           OnValueChange={(value) => */}
      {/*             SetConfig({ */}
      {/*               AttitudeIndicator: value as AttitudeIndicator, */}
      {/*             }) */}
      {/*           } */}
      {/*           ClassName='mt-2 space-y-1' */}
      {/*         > */}
      {/*           <div className='flex items-center gap-3'> */}
      {/*             <RadioGroupItem value='scientific' id='ai-scientific' /> */}
      {/*             <Label htmlFor='ai-scientific'>Scientific</Label> */}
      {/*           </div> */}
      {/*           <div className='flex items-center gap-3'> */}
      {/*             <RadioGroupItem value='dimensional3D' id='ai-3d' /> */}
      {/*             <Label htmlFor='ai-3d'>3D</Label> */}
      {/*           </div> */}
      {/*           <div className='flex items-center gap-3'> */}
      {/*             <RadioGroupItem value='disabled' id='ai-disabled' /> */}
      {/*             <Label htmlFor='ai-disabled'>Disabled</Label> */}
      {/*           </div> */}
      {/*         </RadioGroup> */}
      {/*         <div className='mt-6 flex items-center gap-2'> */}
      {/*           <Switch */}
      {/*             Id='work-indicator' */}
      {/*             Checked={config.workIndicator ?? false} */}
      {/*             OnCheckedChange={() => */}
      {/*               SetConfig({ */}
      {/*                 WorkIndicator: !config.workIndicator, */}
      {/*               }) */}
      {/*             } */}
      {/*           /> */}
      {/*           <Label htmlFor='work-indicator'>Enable work indicator</Label> */}
      {/*         </div> */}
      {/*       </div> */}
      {/*       <div> */}
      {/*         <h4 className='text-lg font-medium'>Thruster RPM Overlay</h4> */}
      {/*         <div className='mt-2 flex items-center gap-2'> */}
      {/*           <Switch */}
      {/*             Id='thruster-rpm-overlay' */}
      {/*             Checked={config.thrusterRpmOverlay ?? false} */}
      {/*             OnCheckedChange={() => */}
      {/*               SetConfig({ */}
      {/*                 ThrusterRpmOverlay: !config.thrusterRpmOverlay, */}
      {/*               }) */}
      {/*             } */}
      {/*           /> */}
      {/*           <Label htmlFor='thruster-rpm-overlay'>Enable overlay</Label> */}
      {/*         </div> */}
      {/*       </div> */}
      {/*     </div> */}
      {/*   </div> */}
      {/* </div> */}
    </>
  );
}

export const Route = createFileRoute('/settings/')({
  component: General,
  // Loader: fetchVersion,
});
