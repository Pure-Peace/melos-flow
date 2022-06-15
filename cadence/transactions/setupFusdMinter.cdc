import FUSD from "../contracts/core/FUSD.cdc"

transaction {
    prepare(minter: AuthAccount) {
        let minterProxy <- FUSD.createMinterProxy()

        minter.save(<- minterProxy,to: FUSD.MinterProxyStoragePath,)
        minter.link<&FUSD.MinterProxy{FUSD.MinterProxyPublic}>(
            FUSD.MinterProxyPublicPath,
            target: FUSD.MinterProxyStoragePath
        )
    }
}