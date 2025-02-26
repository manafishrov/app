import { useEffect, useState } from 'react';
import 'tauri-plugin-gamepad-api';

function InputController() {
  useEffect(() => {
    const handleGamepadConnected = (event: GamepadEvent) => {
      console.log('Gamepad connected:', event.gamepad);
    };

    const handleGamepadDisconnected = (event: GamepadEvent) => {
      console.log('Gamepad disconnected:', event.gamepad);
    };

    const handleKeyPress = (event: KeyboardEvent) => {
      console.log('Key pressed:', event.key);
    };

    // Add gamepad polling
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (gamepad) {
          // Log buttons that are pressed (value > 0)
          gamepad.buttons.forEach((button, index) => {
            if (button.pressed) {
              console.log(`Button ${index} pressed with value ${button.value}`);
            }
          });

          // Log axes that have significant movement (threshold of 0.1)
          gamepad.axes.forEach((axis, index) => {
            if (Math.abs(axis) > 0.1) {
              console.log(`Axis ${index} value: ${axis}`);
            }
          });
        }
      }
    };

    // Set up polling interval
    const pollInterval = setInterval(pollGamepad, 100); // Poll every 100ms

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener(
        'gamepaddisconnected',
        handleGamepadDisconnected,
      );
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(pollInterval); // Clean up the polling interval
    };
  }, []);

  return null;
}

export { InputController };
