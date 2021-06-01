
import _ from "underscore";
import EventManager from './events';
import * as ethers from 'ethers';
import TokenListManager from './tokenList';

const BigNumber = ethers.BigNumber;
const Utils = ethers.utils;
const Contract = ethers.Contract;

window.WalletJS = {
  currentNetworkId: -1,

  initialize: async function() {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', function (accounts) {
        // Time to reload your interface with accounts[0]!
        console.log(accounts);
        EventManager.emitEvent('walletUpdated', 1);
      });

      window.ethereum.on('disconnect', function(providerRpcError) {
        console.log(providerRpcError);
        EventManager.emitEvent('walletUpdated', 1);
      });

      window.ethereum.on('chainChanged', function(chainId) {
        console.log(chainId);
        if (this.isConnectedToAnyNetwork()) {

          this._currentConnectedNetworkId().then(function(chainId) {
            this.currentNetworkId = chainId;
            EventManager.emitEvent('walletUpdated', 1);
          }.bind(this));
        }
      }.bind(this));

      if (window.ethereum.selectedAddress) {
        // cache value
        this._currentConnectedNetworkId().then(function(chainId) {
          this.currentNetworkId = chainId;
        }.bind(this));
      }
    }

    window.erc20Abi = await (await fetch('/abi/erc20_standard.json')).json();
    window.oneSplitAbi = await (await fetch('/abi/test/OneSplit.json')).json();

    EventManager.listenFor('initiateWalletConnect', this.connectWallet.bind(this));
  },

  getProvider: function() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return provider;
  },

  getERC20Balance: async function(tokenContractAddress) {
    const contract = new Contract(
      tokenContractAddress,
      window.erc20Abi,
      this.getProvider()
    );
    return await contract.balanceOf(this.currentAddress());
  },

  _mint: async function(symbol, value) {
    var abi = await fetch(`/abi/test/${symbol.toUpperCase()}.json`);
    window.abiMeth = await abi.json();
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const token = TokenListManager.findTokenById(symbol);

    const incrementer = new Contract(token.address, abiMeth, signer);
    const contractFn = async () => {
      console.log(
        `Calling the mint function for: ${token.symbol} ${token.address}`
      );

      // Sign-Send Tx and Wait for Receipt
      const createReceipt = await incrementer.mint(window.ethereum.selectedAddress, value);
      await createReceipt.wait();

      console.log(`Tx successful with hash: ${createReceipt.hash}`);
      EventManager.emitEvent('walletUpdated', 1);
    };

    await contractFn();
  },

  performSwap: function(fromToken, toToken, amountBN, minReturnBN, distribution) {
    return this._getAllowance(fromToken.address).then(function(allowanceBN) {
      console.log(`Got Allowance of ${allowanceBN.toString()}`);
      if (allowanceBN.gte(amountBN)) {
        return this._swap(fromToken, toToken, amountBN, minReturnBN, distribution);
      } else {
        return this._approve(
          fromToken.address,
          // approve arbitrarily large number
          amountBN.add(BigNumber.from(Utils.parseUnits("100000000")))
        ).then(function(confirmedTransaction) {
          return this._swap(fromToken, toToken, amountBN, minReturnBN, distribution);
        }.bind(this));
      }
    }.bind(this));
  },

  _approve: function(tokenContractAddress, amountBN) {
    console.log(`Calling APPROVE() with ${tokenContractAddress} ${amountBN.toString()}`);
    const signer = this.getProvider().getSigner();
    const contract = new Contract(
      tokenContractAddress,
      window.erc20Abi,
      signer
    );
    return contract.approve(
      TokenListManager.getCurrentNetworkConfig().aggregatorAddress,
      amountBN,
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice
      }
    ).then(function(transaction) {
      console.log(`Waiting on APPROVE() with ${tokenContractAddress} ${amountBN.toString()}`);
      return transaction.wait();
    });
  },

  _getAllowance: function(tokenContractAddress) {
    console.log(`Calling ALLOWANCE() with ${tokenContractAddress}`);
    const contract = new Contract(
      tokenContractAddress,
      window.erc20Abi,
      this.getProvider()
    );
    return contract.allowance(
      this.currentAddress(),
      TokenListManager.getCurrentNetworkConfig().aggregatorAddress
    );
  },

  /*
    function getExpectedReturn(
      IERC20 fromToken,
      IERC20 destToken,
      uint256 amount,
      uint256 parts,
      uint256 flags
    )
    public view returns (
      uint256 returnAmount,
      uint256[] memory distribution
    )
  */

  getExpectedReturn: function(fromToken, toToken, amount) {
    if (!this.isConnected()) {
      return new Promise(function(resolve) {
        var _U = Utils;
        var _p0 = _U.parseUnits("0", "wei");
        var _p1 = _U.parseUnits("1", "wei");
        resolve({
          returnAmount: amount.mul(_U.parseUnits("99", "wei")),
          distribution: [_p0, _p1, _p0, _p1, _p0, _p0, _p1]
        })
      });
    }

    const contract = new Contract(
      TokenListManager.getCurrentNetworkConfig().aggregatorAddress,
      window.oneSplitAbi,
      this.getProvider()
    );
    return contract.getExpectedReturn(
      fromToken.address,
      toToken.address,
      amount, // uint256 in wei
      3, // desired parts of splits accross pools(3 is recommended)
      0  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
    );
  },

  /*
    function swap(
      IERC20 fromToken,
      IERC20 destToken,
      uint256 amount,
      uint256 minReturn,
      uint256[] memory distribution,
      uint256 flags
    ) public payable returns(uint256 returnAmount)
  */

  _swap: function(fromToken, toToken, amountBN, minReturnBN, distribution) {
    console.log(`Calling SWAP() with ${fromToken.symbol} to ${toToken.symbol} of ${amountBN.toString()}`);
    const signer = this.getProvider().getSigner();
    const contract = new Contract(
      TokenListManager.getCurrentNetworkConfig().aggregatorAddress,
      window.oneSplitAbi,
      signer
    );
    return contract.swap(
      fromToken.address,
      toToken.address,
      amountBN, // uint256 in wei
      minReturnBN,
      distribution,
      0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice
      }
    ).then(function(transaction) {
      console.log(`Waiting SWAP() with ${fromToken.symbol} to ${toToken.symbol} of ${amountBN.toString()}`);
      return transaction.wait();
    });

    /*
    returns(
      uint256 returnAmount
    )
    */
  },

  isSupported: function() {
    return (typeof window.ethereum !== 'undefined');
  },

  _currentConnectedNetworkId: async function() {
    if (!(window.ethereum && window.ethereum.selectedAddress)) {
      return -1;
    }

    else {
      let connectedNetwork = await this.getProvider().getNetwork();
      return connectedNetwork.chainId;
    }
  },

  isConnected: function() {
    return window.ethereum &&
      window.ethereum.selectedAddress &&
      this.isMatchingConnectedNetwork();
  },

  isConnectedToAnyNetwork: function() {
    return window.ethereum &&
      window.ethereum.selectedAddress;
  },

  isMatchingConnectedNetwork: function() {
    var network = TokenListManager.getCurrentNetworkConfig();
    return +network.chainId === +this.currentNetworkId;
  },

  currentAddress: function() {
    return this.isConnectedToAnyNetwork() ? window.ethereum.selectedAddress : undefined;
  },

  changeNetwork: function(network) {
    return window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [network.chain]
    });
  },

  connectWallet: function() {
    return new Promise(function (resolve, reject) {
      this.changeNetwork(TokenListManager.getCurrentNetworkConfig()).then(function() {
        _.delay(function() {
          window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(function(accounts) {
              // Metamask currently only ever provide a single account
              const account = accounts[0];
              EventManager.emitEvent('walletUpdated', 1);

              return this._currentConnectedNetworkId().then(function(chainId) {
                this.currentNetworkId = chainId;
                EventManager.emitEvent('walletUpdated', 1);
                resolve(account);
              }.bind(this));
            }.bind(this))
            .catch(function(e) {
              console.error(e);
              reject(e);
            });
        }.bind(this), 1000)
      }.bind(this));
    }.bind(this));
  }
};

export default window.WalletJS;

