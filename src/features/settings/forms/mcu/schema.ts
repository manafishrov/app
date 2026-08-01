import zod from 'zod';

import { CurrentSensingMode, DshotSpeed, McuBoard, ThrusterProtocol } from '@/stores/rovConfig';

export const formSchema = zod
  .object({
    mcuBoard: zod.array(zod.enum([McuBoard.pico, McuBoard.pico2])).length(1),
    thrusterProtocol: zod.array(zod.enum([ThrusterProtocol.pwm, ThrusterProtocol.dshot])).length(1),
    dshotSpeed: zod.array(zod.enum(['150', '300', '600', '1200'])).length(1),
    currentSensingMode: zod
      .array(zod.enum([CurrentSensingMode.perMotor, CurrentSensingMode.sharedBus]))
      .length(1),
  })
  .superRefine((value, context): void => {
    if (value.mcuBoard[0] === McuBoard.pico && value.dshotSpeed[0] === '1200') {
      context.addIssue({
        code: 'custom',
        path: ['dshotSpeed'],
        message: 'DShot1200 requires Pico 2',
      });
    }
  });

export type McuFormValues = zod.infer<typeof formSchema>;

export const getCompatibleDshotSpeed = (
  board: McuFormValues['mcuBoard'][number],
  speed: McuFormValues['dshotSpeed'][number],
): McuFormValues['dshotSpeed'][number] =>
  board === McuBoard.pico && speed === '1200' ? '600' : speed;

export const parseDshotSpeed = (
  value: string | undefined,
  fallback: (typeof DshotSpeed)[keyof typeof DshotSpeed],
): (typeof DshotSpeed)[keyof typeof DshotSpeed] => {
  switch (value ?? '') {
    case '150': {
      return DshotSpeed.dshot150;
    }
    case '300': {
      return DshotSpeed.dshot300;
    }
    case '600': {
      return DshotSpeed.dshot600;
    }
    case '1200': {
      return DshotSpeed.dshot1200;
    }
    default: {
      return fallback;
    }
  }
};

export const getDshotSpeedFormValue = (
  value: (typeof DshotSpeed)[keyof typeof DshotSpeed],
): McuFormValues['dshotSpeed'][number] => {
  switch (value) {
    case DshotSpeed.dshot150: {
      return '150';
    }
    case DshotSpeed.dshot300: {
      return '300';
    }
    case DshotSpeed.dshot600: {
      return '600';
    }
    case DshotSpeed.dshot1200: {
      return '1200';
    }
    default: {
      return '300';
    }
  }
};
