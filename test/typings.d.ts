declare module "@onflow/fcl"
declare module "@onflow/config"
declare module "flow-js-testing" {
  function init(basePath: string): Promise<void>

  function mintFlow(recipient: string, amount: string): Promise<any>

  function executeScript(props: Record<string, unknown>): Promise<any>

  function getContractAddress(name: string, useDefaults: boolean): Promise<string>

  function deployContractByName(props: { name: string, to: string, addressMap?: Record<string, unknown> }): Promise<any>

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
    log(message: any, type: "log" | "error" = "log");

    extractKeyValue(str): { key: string, value: string };

    fixJSON(msg): string;

    parseDataBuffer(data): { msg: string, level: string };

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
    removeFilter(type: (debug | info | warning));
    /**
     * Add log filter.
     * @param {(debug|info|warning)} type type - type of message
     * @returns void
     **/
    addFilter(type: (debug | info | warning));

    /**
     * Stop emulator.
     * @returns Promise<*>
     */
    async stop(): Promise<unknown>;
  }

  const emulator = new Emulator()

  function getAccountAddress(accountName: string): Promise<string>

  function getServiceAddress()
}
