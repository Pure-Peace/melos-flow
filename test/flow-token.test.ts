import {getAccountAddress, sendTransaction, shallPass, getFlowBalance} from 'flow-js-testing';
import {createFlowEmulator} from './utils/helpers';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(10000);

describe('FlowToken', () => {
  createFlowEmulator({logs: false});

  it('FlowTokenTransfer', async () => {
    const to = await getAccountAddress('recipient');
    const before = await getFlowBalance(to);
    const amount = 100;
    await shallPass(
      await sendTransaction({
        name: 'flow_token_transfer',
        args: [to, amount],
      })
    );
    const after = await getFlowBalance(to);
    expect(after[0] - before[0]).toBe(amount);
  });
});
