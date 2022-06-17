declare module '@onflow/fcl';
declare module '@onflow/config';

declare module 'flow-js-testing' {
  /**
   * Inits framework variables, storing private key of service account and base path
   * where Cadence files are stored.
   * @param {string} basePath - path to the folder with Cadence files to be tested.
   * @param {number} [props.port] - port to use for accessAPI
   * @param {number} [props.pkey] - private key to use for service account in case of collisions
   */
  async function init(basePath: string, props = {}): Promise<void>;

  /**
   * Set globally available config value.
   * @param {string} key - key to be used to access stored value.
   * @param {string} env - value key in the environment (for example .env file).
   * @param {string} conf - value path in config (flow.json) file.
   * @param fallback - fallback value to be used if env and conf are absent.
   */
  function set(key: string, env: string, conf: string, fallback): void;

  /**
   * Returns config value at specified key.
   * @param key - key to the value.
   * @returns {Promise<*>} - value at specified key.
   */
  async function getConfigValue(key): Promise<any>;

  /**
   * Returns Cadence template for specified file. Replaces imports using provided address map
   * @param file - name of the file to look for.
   * @param {{string:string}} [addressMap={}] - name/address map to use as lookup table for addresses in import statements.
   * @param {boolean} [byAddress=false] - flag to indicate if address map is address to address type.
   * @returns {string}
   */
  async function getTemplate(file, addressMap: {string: string} = {}, byAddress: boolean = false): string;

  /**
   * Returns contract template using name of the file in "contracts" folder containing the code.
   * @param name - name of the contract template in "contract" folder.
   * @param {{string:string}} [addressMap={}] - name/address map to use as lookup table for addresses in import statements.
   * @returns {Promise<string>}
   */
  async function getContractCode({name, addressMap}): Promise<string>;

  /**
   * Returns transaction template using name of the file in "transactions" folder containing the code.
   * @param name - name of the transaction template in "transactions" folder.
   * @param {{string:string}} [addressMap={}] - name/address map to use as lookup table for addresses in import statements.
   * @returns {Promise<string>}
   */
  async function getTransactionCode({name, addressMap}): Promise<string>;

  /**
   * Returns script template using name of the file in "scripts" folder containing the code.
   * @param name - name of the script template in "scripts" folder.
   * @param {{string:string}} [addressMap={}] - name/address map to use as lookup table for addresses in import statements.
   * @returns {Promise<string>}
   */
  async function getScriptCode({name, addressMap}): Promise<string>;

  /**
   * Submits transaction to emulator network and waits before it will be sealed.
   * Returns transaction result.
   * @param {string} [props.name] - Name of Cadence template file
   * @param {{string:string}} [props.addressMap={}] - name/address map to use as lookup table for addresses in import statements.
   * @param {string} [props.code] - Cadence code of the transaction.
   * @param {[any]} props.args - array of arguments specified as tupple, where last value is the type of preceding values.
   * @param {[string]} [props.signers] - list of signers, who will authorize transaction, specified as array of addresses.
   * @returns {Promise<any>}
   */
  async function sendTransaction(props: Record<string, unknown>): Promise<any>;

  /**
   * Sends script code for execution. Returns decoded value
   * @param {string} props.code - Cadence code of the script to be submitted.
   * @param {string} props.name - name of the file to source code from.
   * @param {[any]} props.args - array of arguments specified as tupple, where last value is the type of preceding values.
   * @returns {Promise<*>}
   */
  async function executeScript(props: Record<string, unknown>): Promise<any>;

  /**
   * Returns current FlowToken balance of account specified by address
   * @param {string} address - address of account to check
   * @returns {Promise<*>}
   */
  async function getFlowBalance(address: string): Promise<any>;

  /**
   * Sends transaction to mint specified amount of FlowToken and send it to recipient.
   * Returns result of the transaction.
   * @param {string} recipient - address of recipient account
   * @param {string} amount - amount to mint and send
   * @returns {Promise<*>}
   */
  async function mintFlow(recipient: string, amount: string): Promise<any>;

  /**
   * Deploys a contract by name to specified account
   * Returns transaction result.
   * @param {string} props.to - If no address is supplied, the contract will be deployed to the emulator service account.
   * @param {string} props.name  - The name of the contract to look for. This should match a .cdc file located at the specified `basePath`.
   * @param {{string:string}} [props.addressMap={}] - name/address map to use as lookup table for addresses in import statements.
   * @param {boolean} [props.update=false] - flag to indicate whether the contract shall be replaced.
   * @returns {Promise<any>}
   */
  async function deployContractByName(props: Record<string, unknown>): Promise<any>;
  /**
   * Deploys contract as Cadence code to specified account
   * Returns transaction result.
   * @param {string} props.code - Cadence code for contract to be deployed
   * @param {string} props.to - If no address is supplied, the contract
   * will be deployed to the emulator service account
   * @param {string} props.name  - The name of the contract to look for. This should match
   * a .cdc file located at the specified `basePath`
   * @param {{string:string}} [props.addressMap={}] - name/address map to use as lookup table for addresses in import statements.
   * @param {boolean} [props.update=false] - flag to indicate whether the contract shall be replaced
   */
  async function deployContract(props: Record<string, unknown>);

  /**
   * Returns address of account specified by name. If account with that name doesn't exist it will be created
   * and assigned provided name as alias
   * @param {string} accountName - name of the account
   * @returns {Promise<string|*>}
   */
  async function getAccountAddress(accountName: string): Promise<string | any>;

  async function getServiceAddress(): string;

  async function getBlockOffset(): Promise<any>;

  async function setBlockOffset(offset): Promise<any>;

  /**
   * Returns address of the account where contract specified by name is currently deployed
   * @param {string} name - name of the account to look for
   * @param {boolean} [useDefaults=false] - whether we shall look into default addressed first
   * @returns {Promise<string>}
   */
  async function getContractAddress(name: string, useDefaults: boolean = false): Promise<string>;

  /**
   * Returns address map for contracts defined in template code.
   * @param {string} code - Cadence code to parse.
   * @returns {*}
   */
  function extractImports(code: string): any;

  /**
   * Returns Cadence template code with replaced import addresses
   * @param {string} code - Cadence template code.
   * @param {{string:string}} [addressMap={}] - name/address map or function to use as lookup table
   * for addresses in import statements.
   * @param byName - lag to indicate whether we shall use names of the contracts.
   * @returns {*}
   */
  function replaceImportAddresses(code: string, addressMap: {string: string}, byName = true): any;

  /**
   * Resolves import addresses defined in code template
   * @param {string} code - Cadence template code.
   * @returns {{string:string}} - name/address map
   */
  function resolveImports(code: string): {string: string};

  /**
   * Return Promise from passed interaction
   * @param {function | Promise} ix - Promise or function to wrap
   * @returns Promise<*>
   * */
  async function promise(ix: function | Promise<any>);

  /**
   * Ensure transaction did not throw and sealed.
   * @param {function | Promise} ix - Promise or function to wrap
   * @returns Promise<*> - transaction result
   * */
  async function shallPass(ix: function | Promise<any>);

  /**
   * Ensure interaction did not throw and return result of it
   * @param {function | Promise} ix - Promise or function to wrap
   * @returns Promise<*> - result of interaction
   * */
  async function shallResolve(ix: function | Promise<any>);

  /**
   * Ensure interaction throws an error.
   * @param {function | Promise} ix - Promise or function to wrap
   * @returns Promise<*> -  result of interaction
   * */
  async function shallRevert(ix: function | Promise<any>);
  /**
   * Ensure interaction throws an error.
   * @param {function | Promise} ix - Promise or function to wrap
   * @returns Promise<*> -  result of interaction
   * */
  async function shallThrow(ix: function | Promise<any>);

  async function builtInMethods(code): Promise<string>;

  declare class Emulator {
    initialized: boolean;
    logging: boolean;
    filters: ('debug' | 'info' | 'warning')[];
    logProcessor: (item) => any;

    /**
     * Set logging flag.
     * @param {boolean} logging - whether logs shall be printed
     */
    setLogging(logging: boolean);

    /**
     * Log message with a specific type.
     * @param {*} message - message to put into log output
     * @param {"log"|"error"} type - type of the message to output
     */
    log(message: any, type: 'log' | 'error' = 'log');

    extractKeyValue(str): {key: string; value: string};

    fixJSON(msg): string;

    parseDataBuffer(data): {msg: string; level: string};

    /**
     * Start emulator.
     * @param {number} port - port to use for accessApi
     * @param {boolean} logging - whether logs shall be printed
     * @returns Promise<*>
     */
    async start(port: number = DEFAULT_HTTP_PORT, logging: boolean = false, options = {}): Promise<boolean | undefined>;

    /**
     * Clear all log filters.
     * @returns void
     **/
    clearFilters();

    /**
     * Remove specific type of log filter.
     * @param {(debug|info|warning)} type - type of message
     * @returns void
     **/
    removeFilter(type: debug | info | warning);
    /**
     * Add log filter.
     * @param {(debug|info|warning)} type type - type of message
     * @returns void
     **/
    addFilter(type: debug | info | warning);

    /**
     * Stop emulator.
     * @returns Promise<*>
     */
    async stop(): Promise<unknown>;
  }

  const emulator = new Emulator();
}
