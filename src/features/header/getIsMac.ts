export const getIsMac = (): boolean => {
  try {
    const uadDesc = Object.getOwnPropertyDescriptor(navigator, 'userAgentData');
    if (uadDesc && typeof uadDesc.value === 'object') {
      const platformDesc = Object.getOwnPropertyDescriptor(uadDesc.value, 'platform');
      if (platformDesc && typeof platformDesc.value === 'string') {
        return platformDesc.value.toLowerCase().includes('mac');
      }
    }
  } catch {
    // Ignore
  }
  return /mac/i.test(navigator.userAgent);
};
