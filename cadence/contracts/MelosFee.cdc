// Simple fee manager
//
pub contract MelosFee {

    pub let MelosFeeManagerStoragePath: StoragePath

    pub event SellerFeeChanged(value: UFix64)
    pub event BuyerFeeChanged(value: UFix64)
    pub event FeeAddressUpdated(label: String, address: Address)

    access(self) var feeAddresses: {String:Address}

    // Seller fee [0..1)
    pub var sellerFee: UFix64

    // BuyerFee fee [0..1)
    pub var buyerFee: UFix64

    pub resource Manager {
        pub fun setSellerFee(_ fee: UFix64) {
            MelosFee.sellerFee = fee
            emit SellerFeeChanged(value: MelosFee.sellerFee)
        }

        pub fun setBuyerFee(_ fee: UFix64) {
            MelosFee.buyerFee = fee
            emit BuyerFeeChanged(value: MelosFee.buyerFee)
        }

        pub fun setFeeAddress(_ label: String, address: Address) {
            MelosFee.feeAddresses[label] = address
            emit FeeAddressUpdated(label: label, address: address)
        }
    }

    init() {
        self.sellerFee = 0.025
        emit SellerFeeChanged(value: MelosFee.sellerFee)
        self.buyerFee = 0.025
        emit BuyerFeeChanged(value: MelosFee.buyerFee)

        self.feeAddresses = {}

        self.MelosFeeManagerStoragePath = /storage/commonFeeManager
        self.account.save(<- create Manager(), to: self.MelosFeeManagerStoragePath)
    }

    pub fun feeAddress(): Address {
        return self.feeAddresses["melos"] ?? self.account.address
    }

    pub fun feeAddressByName(_ label: String): Address {
        return self.feeAddresses[label] ?? self.account.address
    }

    pub fun addressMap(): {String:Address} {
        return MelosFee.feeAddresses
    }
}
