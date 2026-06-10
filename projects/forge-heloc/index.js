const { queryContract } = require('../helper/chain/cosmos.js');
const { sumTokens2 } = require('../helper/unwrapLPs.js');

const poolSmartContract = "pb1lgdznp6dyljdq40xvcknkzcgelh2es0udwnx9rzn7c5q55435l3sx6v5a6"
const poolPOA = "pb10mwflnqhtleqhka4n8kzm0rwknjcsew63fge4h579avm369tgq6sy2t9v2"

const tvl = async (api, isBorrowed) => {
    const stateData = await queryContract({
        chain: 'provenance',
        contract: poolSmartContract,
        data: { get_state: {} }
    })
    const totalCollateralHeld = stateData.total_collateral_held?.[0].amount
    const totalBorrowedAmount = stateData.reserve?.total_borrow
    const borrowedAmountInYLDS = totalBorrowedAmount / 1e6
    const assetId = stateData.total_collateral_held?.[0].asset_id
    const haircut = stateData.contract.sca?.[0].h
    const pricing = await queryContract({
         chain: 'provenance',
        contract: poolPOA,
        data: { get_prices_by_asset: { assets: [assetId] } }
    })
    const price = pricing?.[assetId]?.price_usd
    const collateral = ((!haircut || haircut === null ? 1 : haircut) * price * totalCollateralHeld) - borrowedAmountInYLDS
    api.add(isBorrowed ? 'uylds.fcc' : assetId, isBorrowed ? Math.floor(totalBorrowedAmount) : collateral)
    return sumTokens2({ api })
}

module.exports = {
    timetravel: false,
    doublecounted: true,
    misrepresentedTokens: true,
    methodology: 'TVL represents excess lending supply that is not yet matched with borrowers',
    provenance: {
        tvl: (api) => tvl(api, false),
        borrowed: (api) => tvl(api, true),
    }
}