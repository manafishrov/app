const createPiUndervoltageWarningGate = (): ((
  connected: boolean,
  undervoltage: boolean,
) => boolean) => {
  let warningShown = false;

  return (connected, undervoltage) => {
    if (!connected || !undervoltage) {
      warningShown = false;
      return false;
    }
    if (warningShown) {
      return false;
    }

    warningShown = true;
    return true;
  };
};

export { createPiUndervoltageWarningGate };
