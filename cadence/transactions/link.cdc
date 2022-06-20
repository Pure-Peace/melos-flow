%IMPORTS%

transaction() {
    prepare(signer: AuthAccount) {
      signer.link<%LINK_TARGET%>(
        %CAPABILITY_PATH%,
        target: %TARGET_PATH%
      )
    }
}
