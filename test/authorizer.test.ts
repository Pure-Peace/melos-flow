import {sendTransaction} from 'flow-cadut';
import {createFlowEmulator, getAuthAccount} from './utils/helpers';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(10000);

describe('Test auth', () => {
  createFlowEmulator({logs: false});

  test('Should send a transaction with handle auth', async () => {
    const {auth} = await getAuthAccount('TestAccount');

    const [res, err] = await sendTransaction({code: CODE, payer: auth});
    expect(res?.status).toEqual(4);
  });
});

const CODE = `
import FungibleToken from 0xee82856bf20e2aa6

transaction {
  prepare(account: AuthAccount) {
    log(account)
  }
}`;
