import {config} from '@onflow/config';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

import {ec as EC} from 'elliptic';
import {SHA3} from 'sha3';

import {DEPLOYED_CONTRACTS, EXT_ENVIRONMENT, TRANSACTION, SCRIPT, CONTRACT, UNKNOWN, TxResult} from './common';

const ec = new EC('p256');

export const getEnvironmentName = async () => {
  return (await config().get('ix.env')) || 'emulator';
};

export const raw = (type) => type.slice(0, -1);

export const getEnvironment = async () => {
  const env = await getEnvironmentName();
  const core = DEPLOYED_CONTRACTS[env] || DEPLOYED_CONTRACTS.emulator;
  const extended = EXT_ENVIRONMENT[env] || EXT_ENVIRONMENT.emulator;

  return {
    ...core,
    ...extended,
  };
};

const REGEXP_IMPORT = /(\s*import\s*)([\w\d]+)(\s+from\s*)([\w\d".\\/]+)/g;

export const stripComments = (code) => {
  const commentsRegExp = /(\/\*[\s\S]*?\*\/)|(\/\/.*)/g;
  return code.replace(commentsRegExp, '');
};

export const collapseSpaces = (input) => input.replace(/\s+/g, ' ');
export const removeSpaces = (input) => input.replace(/\s+/g, '');
export const stripNewLines = (input) => input.replace(/\r\n|\n|\r/g, ' ');

export const splitArgs = (pair) => {
  return pair
    .split(/(\w+)\s*:\s*([\w{}[\]:\s?]*)/)
    .filter((item) => item !== '')
    .map((item) => item.replace(/\s*/g, ''));
};
export const argType = (pair) => splitArgs(pair)[1];

export const generateSchema = (argsDefinition) =>
  argsDefinition
    .split(',')
    .map((item) => item.replace(/\s*/g, ''))
    .filter((item) => item !== '');

export const extract = (code, keyWord) => {
  const noComments = stripComments(code);
  const target = collapseSpaces(noComments.replace(/[\n\r]/g, ''));

  if (target) {
    const regexp = new RegExp(keyWord, 'g');
    const match = regexp.exec(target);

    if (match) {
      if (match[1] === '') {
        return [];
      }
      return generateSchema(match[1]);
    }
  }
  return [];
};

export const extractSigners = (code) => {
  return extract(code, `(?:prepare\\s*\\(\\s*)([^\\)]*)(?:\\))`);
};

export const extractScriptArguments = (code) => {
  return extract(code, `(?:fun\\s+main\\s*\\(\\s*)([^\\)]*)(?:\\))`);
};

export const extractTransactionArguments = (code) => {
  return extract(code, `(?:transaction\\s*\\(\\s*)([^\\)]*)(?:\\))`);
};

export const extractContractParameters = (code) => {
  const complexMatcher = /(resource|struct)\s+\w+\s*{[\s\S]+?}/g;
  const contractNameMatcher =
    /(?:access\(\w+\)|pub)\s+contract\s+(?:interface)*\s*(\w*)(\s*{[.\s\S]*init\s*\((.*?)\)[.\s\S]*})?/g;

  const noComments = stripComments(code);
  const noComplex = noComments.replace(complexMatcher, '');
  const matches = contractNameMatcher.exec(noComplex);

  if (!matches || matches.length < 2) {
    throw new Error("Contract Error: can't find name of the contract");
  }

  return {
    contractName: matches[1],
    args: matches[3] || '',
  };
};

export const getTemplateInfo = (template) => {
  const contractMatcher = /\w+\s+contract\s+(\w*\s*)\w*/g;
  const transactionMatcher = /transaction\s*(\(\s*\))*\s*/g;
  const scriptMatcher = /pub\s+fun\s+main\s*/g;

  const code = stripComments(template);

  if (transactionMatcher.test(code)) {
    const signers = extractSigners(code);
    const args = extractTransactionArguments(code);
    return {
      type: TRANSACTION,
      signers: signers.length,
      args: args,
    };
  }

  if (scriptMatcher.test(code)) {
    const args = extractScriptArguments(code);
    return {
      type: SCRIPT,
      args: args,
    };
  }

  if (contractMatcher.test(code)) {
    const {contractName, args} = extractContractParameters(code);
    return {
      type: CONTRACT,
      signers: 1,
      args,
      contractName,
    };
  }

  return {
    type: UNKNOWN,
  };
};

export const wrongType = (type) => !type || typeof type != 'string';

export const isBasicNumType = (type) => {
  if (wrongType(type)) return false;
  return type.startsWith('Int') || type.startsWith('UInt') || type.startsWith('Word');
};

export const isFixedNumType = (type) => {
  if (wrongType(type)) return false;
  return type.startsWith('Fix64') || type.startsWith('UFix64');
};

export const isString = (type) => type === 'String';
export const isCharacter = (type) => type === 'Character';
export const isBoolean = (type) => type === 'Bool';
export const isAddress = (type) => type === 'Address' || type === 'Address?';
export const isPath = (type) => type === 'Path' || type === 'Path?';

export const isBasicType = (type) => {
  if (wrongType(type)) return false;

  const fixedType = type.endsWith('?') ? type.slice(0, -1) : type;
  return isBasicNumType(fixedType) || isString(fixedType) || isCharacter(fixedType) || isBoolean(fixedType);
};

export const isArray = (type) => {
  if (wrongType(type)) return false;

  const clearType = type.replace(/\s/g, '');
  return clearType.startsWith('[') && clearType.endsWith(']');
};

export const isDictionary = (type) => {
  if (wrongType(type)) return false;

  const clearType = type.replace(/\s/g, '');
  return clearType.startsWith('{') && clearType.endsWith('}');
};

export const isComplexType = (type) => isArray(type) || isDictionary(type);

export const PLUGIN_TYPES = {
  ARGUMENT: 'argument',
};

export const getPlugins = async (type) => {
  const registeredPlugins = await config().get('ix.plugins');
  const plugins = registeredPlugins || {};
  const byType = plugins[type];

  if (byType && byType.length > 0) {
    return byType;
  }
  return false;
};

export const applyPlugins = async (props, plugins) => {
  let type = props.type;
  let value = props.value;

  for (let i = 0; i < plugins.length; i++) {
    const {resolver} = plugins[i];
    const result = await resolver(type, value);
    type = result.type;
    value = result.value;
  }

  return {type, value};
};

export const resolveBasicType = (type) => {
  if (wrongType(type)) return false;

  if (type.includes('?')) {
    return t.Optional(t[raw(type)]);
  }
  return t[type];
};

export const resolveType = (type) => {
  if (isComplexType(type)) {
    switch (true) {
      case isArray(type): {
        const arrayType = getArrayType(type);
        return t.Array(resolveType(arrayType));
      }

      case isDictionary(type): {
        const [key, value] = getDictionaryTypes(type);
        const dictionaryType = {key: resolveType(key), value: resolveType(value)};
        return t.Dictionary(dictionaryType);
      }

      default: {
        return resolveBasicType(type);
      }
    }
  }
  return resolveBasicType(type);
};

export const getDictionaryTypes = (type) => {
  const match = /{(.*)}/.exec(type);
  return match![1]
    .split(/([^:]*):(.*)/)
    .map((item) => item.replace(/\s/g, ''))
    .filter((item) => item);
};

export const toFixedValue = (val: string) => parseFloat(val).toFixed(8);

export const getArrayType = (type: string) => {
  const match = /\[(.*)\]/.exec(type);
  return removeSpaces(match![1]);
};

const throwTypeError = (msg) => {
  throw new Error('Type Error: ' + msg);
};

export const sansPrefix = (address) => {
  if (address == null) return null;
  return address.replace(/^0x/, '');
};

export const withPrefix = (address: null) => {
  if (address == null) return null;
  return '0x' + sansPrefix(address);
};

export const domains = ['public', 'private', 'storage'];

export const parsePath = (path) => {
  if (path.startsWith('/')) {
    const parts = path.slice(1).split('/');
    if (parts.length !== 2) {
      throw Error('Incorrect Path - identifier missing');
    }
    if (!domains.includes(parts[0])) {
      throw Error('Incorrect Path - wrong domain');
    }
    const [domain, identifier] = parts;
    return {domain, identifier};
  }
  throw Error('Incorrect Path - shall start with `/`');
};

export const mapArgument = async (rawType, rawValue) => {
  const plugins = await getPlugins(PLUGIN_TYPES.ARGUMENT);

  let value = rawValue;
  let type = rawType;

  if (plugins) {
    const applied = await applyPlugins({type: rawType, value: rawValue}, plugins);
    value = applied.value;
    type = applied.type;
  }

  const resolvedType = resolveType(type);

  switch (true) {
    case isBasicType(type): {
      return fcl.arg(value, resolvedType);
    }

    case isFixedNumType(type): {
      // Try to parse value and throw if it fails
      if (value === null) {
        return fcl.arg(null, resolvedType);
      }
      if (isNaN(parseFloat(value))) {
        throwTypeError('Expected proper value for fixed type');
      }
      return fcl.arg(toFixedValue(value), resolvedType);
    }

    case isAddress(type): {
      const prefixedAddress = withPrefix(value);
      return fcl.arg(prefixedAddress, resolvedType);
    }

    case isPath(type): {
      return fcl.arg(parsePath(value), resolvedType);
    }

    case isArray(type): {
      const arrayType = getArrayType(type);

      if (isComplexType(arrayType)) {
        const mappedValue = await Promise.all(
          value.map(async (v) => {
            const {value} = await mapArgument(arrayType, v);
            return value;
          })
        );
        return fcl.arg(mappedValue, resolvedType);
      }

      const result = fcl.arg(value, resolvedType);
      return result;
    }

    case isDictionary(type): {
      const [keyType, valueType] = getDictionaryTypes(type);
      const finalValue: any[] = [];
      const keys = Object.keys(value);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let resolvedValue;
        if (isComplexType(valueType)) {
          resolvedValue = (await mapArgument(valueType, value[key])).value;
        } else {
          resolvedValue = value[key];
        }

        const fixedKey = isBasicNumType(keyType) ? parseInt(key) : key;

        finalValue.push({
          key: fixedKey,
          value: resolvedValue,
        });
      }

      const result = fcl.arg(finalValue, resolvedType);
      return result;
    }

    default: {
      throw `${type} is not supported`;
    }
  }
};

export const assertType = (arg) => {
  return arg.xform.asArgument(arg.value);
};

export const mapArguments = async (schema = [], values) => {
  if (schema.length > values.length) {
    throw new Error('Not enough arguments');
  }
  return Promise.all(
    values.map(async (value, i) => {
      const mapped = await mapArgument(schema[i], value);
      assertType(mapped);
      return mapped;
    })
  );
};

export const mapValuesToCode = async (code, values = []) => {
  const schema = getTemplateInfo(code).args.map(argType);
  return mapArguments(schema, values);
};

export const unwrap = (arr, convert) => {
  const type = arr[arr.length - 1];
  return arr.slice(0, -1).map((value) => convert(value, type));
};

const rawArgs = (args) => {
  return args.reduce((acc, arg) => {
    const unwrapped = unwrap(arg, (value, type) => {
      return fcl.arg(value, type);
    });
    acc = [...acc, ...unwrapped];
    return acc;
  }, []);
};

export const resolveArguments = async (args, code) => {
  if (args.length === 0) {
    return [];
  }

  // We can check first element in array. If it's last value is instance
  // of @onflow/types then we assume that the rest of them are also unprocessed
  const first = args[0];
  if (Array.isArray(first) && first.length > 0) {
    const last = first[first.length - 1];
    if (last.asArgument) {
      return rawArgs(args);
    }
  }
  // Otherwise we process them and try to match them against the code
  return mapValuesToCode(code, args);
};

export const replaceImportAddresses = (code, addressMap, byName = true) => {
  return code.replace(REGEXP_IMPORT, (match: any, imp: any, contract: any, _: any, address: any) => {
    const key = byName ? contract : address;
    const newAddress = addressMap instanceof Function ? addressMap(key) : addressMap[key];

    // If the address is not inside addressMap we shall not alter import statement
    const validAddress = newAddress || address;
    return `${imp}${contract} from ${validAddress}`;
  });
};

export const REQUIRE_PRIVATE_KEY = 'privateKey is required';
export const REQUIRE_ADDRESS = 'address is required';
export const WARNING_KEY_INDEX = (index: any) =>
  `key index have incorrect format. found '${typeof index}', required 'num'`;

const hashMsgHex = (msgHex: WithImplicitCoercion<string> | {[Symbol.toPrimitive](hint: 'string'): string}) => {
  const sha = new SHA3(256);
  sha.update(Buffer.from(msgHex, 'hex'));
  return sha.digest();
};

export const signWithKey = (
  privateKey: WithImplicitCoercion<string> | {[Symbol.toPrimitive](hint: 'string'): string},
  msgHex: any
) => {
  const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'));
  const sig = key.sign(hashMsgHex(msgHex));
  const n = 32; // half of signature length?
  const r = sig.r.toArrayLike(Buffer, 'be', n);
  const s = sig.s.toArrayLike(Buffer, 'be', n);
  return Buffer.concat([r, s]).toString('hex');
};

export const authorization =
  (addr, pkey, keyId = 0) =>
  async (account = {}) => {
    addr = sansPrefix(addr);

    const signingFunction = async (data: {message: any}) => ({
      keyId,
      addr: withPrefix(addr),
      signature: signWithKey(pkey, data.message),
    });

    return {
      ...account,
      tempId: `${addr}-${keyId}`,
      addr: fcl.sansPrefix(addr),
      keyId,
      signingFunction,
    };
  };

export const processSigner = (signer: {privateKey: any; address: any; keyId: any}) => {
  if (typeof signer === 'object') {
    if (signer.privateKey === undefined) {
      throw Error(REQUIRE_PRIVATE_KEY);
    }
    if (signer.address === undefined) {
      throw Error(REQUIRE_ADDRESS);
    }
    if (signer.keyId === undefined) {
      console.warn(WARNING_KEY_INDEX(signer.keyId));
    }

    const {address, privateKey, keyId = 0} = signer;
    return authorization(address, privateKey, keyId);
  }

  return signer;
};

export const prepareInteraction = async (
  props: {
    code?: any;
    args?: any;
    addressMap?: any;
    limit?: any;
    raw?: any;
    cadence?: any;
    processed?: any;
    proposer?: any;
    payer?: any;
    signers?: any;
  },
  type: string
) => {
  const {code, cadence, args, addressMap, limit, processed} = props;

  // allow to pass code via "cadence" field similar to fcl.query/mutate
  const codeTemplate = code || cadence;

  const env = await getEnvironment();
  const ixAddressMap = {
    ...env,
    ...addressMap,
  };
  const ixCode = processed ? codeTemplate : replaceImportAddresses(codeTemplate, ixAddressMap);

  const ix = type === 'script' ? [fcl.script(ixCode)] : [fcl.transaction(ixCode)];

  if (args) {
    const resolvedArgs = await resolveArguments(args, codeTemplate);
    ix.push(fcl.args(resolvedArgs));
  }

  // Handle execution limit
  const defaultLimit = await config().get('ix.executionLimit');
  const fallBackLimit = defaultLimit || 100;

  const ixLimit = limit || fallBackLimit;
  ix.push(fcl.limit(ixLimit));

  if (type === 'transaction') {
    const {proposer, payer, signers = []} = props;
    const ixSigners = signers.length === 0 ? [payer] : signers;
    const ixProposer = proposer || payer;

    ix.push(fcl.payer(processSigner(payer)));
    ix.push(fcl.proposer(processSigner(ixProposer)));
    ix.push(fcl.authorizations(ixSigners.map(processSigner)));
  }

  return fcl.send(ix);
};

export const executeScript = async <T>(props: {
  code?: string;
  args?: any[];
  addressMap?: Record<string, string>;
  limit?: number;
  raw?: any;
}): Promise<[T | null, any]> => {
  const {raw = false} = props;
  try {
    const response = await prepareInteraction(props, 'script');

    // In some cases one might want to have raw output without decoding the response
    if (raw) {
      return [response.encodedData, null];
    }

    const decoded = await fcl.decode(response);
    return [decoded, null];
  } catch (e) {
    return [null, e];
  }
};

export const waitForStatus = (statusValue) => {
  if (typeof statusValue === 'string') {
    const status = statusValue.toLowerCase();
    if (status.includes('final')) {
      return 'onceFinalized';
    }

    if (status.includes('exec')) {
      return 'onceExecuted';
    }

    if (status.includes('seal')) {
      return 'onceSealed';
    }
  }

  // wait for transaction to be sealed by default
  console.log(
    `⚠️ \x1b[33mStatus value \x1b[1m\x1b[35m"${statusValue}"\x1b[33m\x1b[2m is not supported. Reverting to \x1b[32m"onceSealed"\x1b[0m`
  );
  return 'onceSealed';
};

export const sendTransaction = async (props: {
  code?: any;
  args?: any;
  payer?: any;
  addressMap?: any;
  limit?: any;
  wait?: any;
  raw?: any;
  cadence?: any;
  processed?: any;
  proposer?: any;
  signers?: any;
}): Promise<[TxResult | null, any]> => {
  const {wait = 'seal'} = props;
  try {
    const response = await prepareInteraction(props, 'transaction');
    if (wait) {
      const waitMethod = waitForStatus(wait);
      const rawResult = await fcl.tx(response)[waitMethod]();
      const txResult = {
        txId: response,
        ...rawResult,
      };
      return [txResult, null];
    }
    return [response.transactionId, null];
  } catch (e) {
    return [null, e];
  }
};
