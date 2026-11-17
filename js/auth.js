/**
 * Auth plug. LINE Login is not implemented yet.
 * When it is, getUser() should resolve { id, provider: 'line', displayName }
 * and storageKey() should include that id so progress leaves this device.
 * Nothing in the UI calls sign-in today.
 */
export const auth = {
  provider: 'none',

  async getUser() {
    return null;
  },

  storageKey() {
    return 'piyapanya.progress.v1.device';
  },
};
