transaction() {
    prepare(signer: AuthAccount) {
      signer.unlink(%CAPABILITY_PATH%)
    }
}
