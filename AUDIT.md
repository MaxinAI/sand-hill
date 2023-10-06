слушай, всякие мелочи нейминг и прочее если убрать, то вполне нормально получилось
по разделению доступа к средствам и операций тоже нормально (пытался покрутить разные сценарии)

> помимо fee фонда 20% из них 20% идут "разработчику"? нормально так;

Fixed fee distribution logic

> если большие суммы в usdc то админ может чуть пофронтраннить, но тут от этого наверное не уйти полностью; 

No action made for this point, I do not know if we cn prevent this

>т.к. большая часть вещей захардкожена, то, если что-то начинает происходить с 1. USDC 2. Uni router; 3. ликвидностью пулов с Fee 0.5% — то надо будет делать анлок и вытаскивать всё

No action made for this point, if I enable address change then admin can withdraw funds that way

> я бы дал возможность менять адрес реципиентам или beneficiary (свой) — мало ли что за годы может произойти

Implemented

так что в основном мелочи, мысли отдельно в текстовом файлике — мб какую строчку и поменяют


-------------------------------------------------------------------------------------

> IWETH is not used, as non-wrapped Eth is not used in operations
```interface IWETH is IERC20 {
function deposit() external payable;
}```

Removed

-------------------------------------------------------------------------------------

> uint public constant EXPIRY = 3 * 365 days;
-- probably move to constuctor variable so factory contract can create vaults more flexibly,
let it remain constant in created Vault contract

Done

-------------------------------------------------------------------------------------
> constants all caps with underscores
feeTier -> FEE_TIER

Done

-------------------------------------------------------------------------------------
> revert messages short (but this contract is not hitting bytecode size limit, so doens't matter that much)

Done, added more detailed messages

-------------------------------------------------------------------------------------
> uint _crypto
naming is not very clear, probably rename to _expectedMin or something or mb _amount, _crypto to _stable, _crypto

Changed accordingly

-------------------------------------------------------------------------------------
> sellCrypto() is not actual sell operation, mb sellMode() name or something similar

Changed

-------------------------------------------------------------------------------------

> Expected flow is
1. transfer USDC to Vault
2. buy() buy crypto
3. wait
4. sellCrypto()
5. sell() sell crypto
6. unlock() or expiration time passes
7. withdraw() - funds go to beneficiary
-- if unlock is called, then fees are distributed (once).
if situation arises a partial sell/position exit is expected (e.g. sell 50% of crypto)
then fees can only be distributed only once and on partial sell
profit criteria if(stableBought > stableSold) may match or not match
-- no partial withdraws possible

Right

-------------------------------------------------------------------------------------
> mb this would be more concise:
```if (!unlocked) {
unlock()
}```


Unlock is only for admin, left as is

-------------------------------------------------------------------------------------

> require(tokenContract.transfer(beneficiary, tokenBalance))
not all tokens return bool on transfer, this is usually fixed by using OpenZeppelin safeTransfer(),
but for used WETH, WBTC would do ok

Checked all 3 contracts (WETH, WBTC, USDC) and all return bool value, I do not think we should add extra dependency for this

-------------------------------------------------------------------------------------

> swapRouter = 0xE592427A0AEce92De3Edee1F18E0157C05861564
can be moved to vault (if it's hardcoded) or be a parameter of createVault

Done

------------------------------------------------------------------------------------
> if USDC amount deposited is large enough, admin can try to make profit by front-running
buy (or sell) operations, or make non-optimal execution (e.g. buy or sell with single
large order)

I do not think we can de-risk this

------------------------------------------------------------------------------------
some other thoughts (just thoughts):

3 years is a long timespan by crypto standards. thus:

> fee tier is hardcoded
we don't know how liquidity/pools would change over time (esp 3 years);

If I put ability to fave fee tire as param admin can use shallow LPs and manipulate prices
0,5% LPs are deep enough to prevent this for now, but there is some risk that's not a fact in future
I see more risk in flexible fee tire than in hardcoded one

> what could happen to uni and it's liquidity
(probably ok for WETH/WBTC again though)

If that happens we need to unlock and give funds back to investors and then ask them to invest in new contracts
I do not see more sustainable solution for this

> swap router is hardcoded -- probably for preventing Admin to access funds directly
by deploying 'fake' swap router

I see risks for investors in not doing so

> static addresses for admin/beneficiary/developer
shit does happen, seed phrases/keys lost/stolen etc.
providing means e.g. to change own's address could be at least some recovery point
(like admin can change its address, beneficiary can change its address, etc.)
   
I enabled changing beneficiary address by beneficiary itself 
We (developer) will use Gnosis + cold wallets to secure ourselves
Let me know if I need to enable address change for admin

------------------------------------------------------------------------------------

Overall, as far as the idea of contract was told,
phase separation (buying/selling) and fund access/operation separation looks good.

