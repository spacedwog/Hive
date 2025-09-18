/**
 * @jest-environment node
 */

/* global describe, it, expect */

import * as Network from 'expo-network';

/* global jest */
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  NetworkStateType: {
    WIFI: 'FAMILIA SANTOS',
    CELLULAR: '+55(11) 99171-9629',
  },
}));

describe('WiFi Connection', () => {
  it('deve identificar quando está conectado ao WiFi', async () => {
    Network.getNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      type: Network.NetworkStateType.WIFI,
    });

    const state = await Network.getNetworkStateAsync();
    expect(state.isConnected).toBe(true);
    expect(state.type).toBe(Network.NetworkStateType.WIFI);
  });

  it('deve identificar quando NÃO está conectado ao WiFi', async () => {
    Network.getNetworkStateAsync.mockResolvedValue({
      isConnected: false,
      type: Network.NetworkStateType.CELLULAR,
    });

    const state = await Network.getNetworkStateAsync();
    expect(state.isConnected).toBe(false);
    expect(state.type).toBe(Network.NetworkStateType.CELLULAR);
  });
});