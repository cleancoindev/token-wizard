import React from 'react'
import '../assets/stylesheets/application.css';
import { deployContract, getWeb3, getNetworkVersion, addWhiteList, setFinalizeAgent, approve, setTransferAgent } from '../utils/web3'
import { noMetaMaskAlert } from '../utils/alerts'
import { defaultState } from '../utils/constants'
import { getOldState } from '../utils/utils'
import { getEncodedABI } from '../utils/microservices'
import { stepTwo } from './stepTwo'
import { StepNavigation } from './Common/StepNavigation'
import { DisplayField } from './Common/DisplayField'
import { Loader } from './Common/Loader'
import { NAVIGATION_STEPS } from '../utils/constants'
const { PUBLISH } = NAVIGATION_STEPS

export class stepFour extends stepTwo {
  constructor(props) {
    super(props);
    let oldState = getOldState(props, defaultState)
    this.state = Object.assign({}, oldState)
    console.log('oldState oldState oldState', oldState)
  }

  componentDidMount() {
    switch (this.state.contractType) {
      case this.state.contractTypes.standard: {
        let $this = this;
        let abiCrowdsale = this.state.contracts && this.state.contracts.crowdsale && this.state.contracts.crowdsale.abi || []
        getEncodedABI(abiCrowdsale, this.state, [], (ABIencoded) => {
          let cntrct = "crowdsale";
          let state = { ...$this.state }
          state.contracts[cntrct].abiConstructor = ABIencoded;
          console.log(cntrct + " ABI encoded params constructor:");
          console.log(ABIencoded);
          $this.setState(state);
        });
      } break;
      case this.state.contractTypes.whitelistwithcap: {
        let state = { ...this.state }
        state.loading = true;
        this.setState(state);
        let abiToken = this.state.contracts && this.state.contracts.token && this.state.contracts.token.abi || []
        let abiPricingStrategy = this.state.contracts && this.state.contracts.pricingStrategy && this.state.contracts.pricingStrategy.abi || []
        
        let $this = this;
        setTimeout(function() {
           getWeb3((web3) => {
            state.web3 = web3;
            $this.setState(state);
            getEncodedABI(abiToken, state, [], (ABIencoded) => {
              let cntrct = "token";
              let state = { ...$this.state }
              state.contracts[cntrct].abiConstructor = ABIencoded;
              console.log(cntrct + " ABI encoded params constructor:");
              console.log(ABIencoded);
              $this.setState(state);
            });
            getEncodedABI(abiPricingStrategy, state, [], (ABIencoded) => {
              let cntrct = "pricingStrategy";
              let state = { ...$this.state }
              state.contracts[cntrct].abiConstructor = ABIencoded;
              console.log(cntrct + " ABI encoded params constructor:");
              console.log(ABIencoded);
              $this.setState(state);
            });

            $this.deployTokenTransferProxy();
          });
        });
      } break;
      default:
        break;
    }
  }

  handleDeployedTokenTransferProxy = (err, tokenTransferProxyAddr) => {
    let newState = { ...this.state }
    if (err) {
      newState.loading = false;
      this.setState(newState);
      return console.log(err);
    }
    newState.contracts.tokenTransferProxy.addr = tokenTransferProxyAddr;
    this.deployMultisig();
  }

  handleDeployedMultisig = (err, multisigAddr) => {
    let newState = { ...this.state }
    if (err) {
      newState.loading = false;
      this.setState(newState);
      return console.log(err);
    }
    newState.contracts.multisig.addr = multisigAddr;
    this.deployToken();
  }

  handleDeployedToken = (err, tokenAddr) => {
    let newState = { ...this.state }
    if (err) {
      newState.loading = false;
      this.setState(newState);
      return console.log(err);
    }
    newState.contracts.token.addr = tokenAddr;
    this.deployPricingStrategy();
  }

  handleDeployedPricingStrategy = (err, pricingStrategyAddr) => {
    let newState = { ...this.state }
    if (err) {
      newState.loading = false;
      this.setState(newState);
      return console.log(err);
    }
    newState.contracts.pricingStrategy.addr = pricingStrategyAddr;
    newState.loading = false;
    this.setState(newState);
    let $this = this;
    let abiCrowdsale = this.state.contracts && this.state.contracts.crowdsale && this.state.contracts.crowdsale.abi || []
    getEncodedABI(abiCrowdsale, newState, [], (ABIencoded) => {
      let cntrct = "crowdsale";
      let state = { ...$this.state }
      state.contracts[cntrct].abiConstructor = ABIencoded;
      console.log(cntrct + " ABI encoded params constructor:");
      console.log(ABIencoded);
      $this.setState(state);
    });
  }

  handleDeployedContract = (err, crowdsaleAddr) => {
    let newState = { ...this.state }
    if (err) {
      newState.loading = false;
      this.setState(newState);
      return console.log(err);
    }
    newState.contracts.crowdsale.addr = crowdsaleAddr;

    if (this.state.contractType == this.state.contractTypes.whitelistwithcap) {
      this.deployFinalizeAgent();
    } else {
      newState.loading = false;
      this.setState(newState);
      this.goToCrowdsalePage();
    }
  }

  handleDeployedFinalizeAgent = (err, finalizeAgentAddr) => {
    let newState = { ...this.state }
    if (err) {
      newState.loading = false;
      this.setState(newState);
      return console.log(err);
    }
    newState.contracts.finalizeAgent.addr = finalizeAgentAddr;

    if (this.state.contractType == this.state.contractTypes.whitelistwithcap) {
      let initialSupplyInWei = this.state.web3.toWei(this.state.token.supply/this.state.pricingStrategy.rate, "ether")
      console.log("initialSupplyInWei: " + initialSupplyInWei)
      approve(this.state.web3, this.state.contracts.token.abi, this.state.contracts.token.addr, this.state.contracts.crowdsale.addr, initialSupplyInWei, () => {
        setTransferAgent(this.state.web3, this.state.contracts.token.abi, this.state.contracts.token.addr, this.state.contracts.multisig.addr, () => {
          setTransferAgent(this.state.web3, this.state.contracts.token.abi, this.state.contracts.token.addr, this.state.contracts.crowdsale.addr, () => {
            setTransferAgent(this.state.web3, this.state.contracts.token.abi, this.state.contracts.token.addr, finalizeAgentAddr, () => {
              setTransferAgent(this.state.web3, this.state.contracts.token.abi, this.state.contracts.token.addr, this.state.crowdsale.walletAddress, () => {
                addWhiteList(this.state.web3, this.state.crowdsale.whitelist, this.state.contracts.crowdsale.abi, this.state.contracts.crowdsale.addr, () => {
                  setFinalizeAgent(this.state.web3, this.state.contracts.crowdsale.abi, this.state.contracts.crowdsale.addr, finalizeAgentAddr, () => {
                    newState.contracts.finalizeAgent.addr = finalizeAgentAddr;
                    newState.loading = false;
                    this.setState(newState);
                    this.goToCrowdsalePage();
                  });
                });
              });
            });
          });
        });
      });
    } else {
      this.goToCrowdsalePage();
    }
  }

  goToCrowdsalePage = () => {
    let crowdsalePage = "/crowdsale";
    const {contracts} = this.state
    const isValidContract = contracts && contracts.crowdsale && contracts.crowdsale.addr
    let newHistory = isValidContract ? crowdsalePage + `?addr=` + contracts.crowdsale.addr + `&networkID=` + contracts.crowdsale.networkID + `&contractType=` + this.state.contractType : crowdsalePage
    this.props.history.push(newHistory);
  }

  getStandardCrowdSaleParams = (web3) => {
    return [
      parseInt(this.state.crowdsale.startBlock, 10), 
      parseInt(this.state.crowdsale.endBlock, 10), 
      web3.toWei(this.state.pricingStrategy.rate, "ether"), 
      this.state.crowdsale.walletAddress,
      parseInt(this.state.crowdsale.supply, 10),
      this.state.token.name,
      this.state.token.ticker,
      parseInt(this.state.token.decimals, 10),
      parseInt(this.state.token.supply, 10)
    ]
  }

  getMultisigParams = (web3) => {
    return [
      [web3.eth.defaultAccount],
      1,
      60,
      this.state.contracts.tokenTransferProxy.addr  //0xFFCd39B8a61a47997594D1ce2CA6dF3A0b2957dE
    ]
  }

  getTokenParams = (web3, token) => {
    console.log(token);
    return [
      token.name,
      token.ticker,
      parseInt(token.supply, 10),
      parseInt(token.decimals, 10),
      false
    ]
  }

  getPricingStrategyParams = (web3, pricingStrategy) => {
    console.log(pricingStrategy);
    return [
      web3.toWei(1/pricingStrategy.rate, "ether")
    ]
  }

  //EthTranchePricing
  /*getPricingStrategyParams = (web3, pricingStrategy) => {
    console.log(pricingStrategy);
    return [
      pricingStrategy.tranches
    ]
  }*/

  getCrowdSaleParams = (web3) => {
    return [
      this.state.contracts.token.addr,
      this.state.contracts.pricingStrategy.addr,
      this.state.contracts.multisig.addr,
      parseInt(Date.parse(this.state.crowdsale.startTime)/1000, 10), 
      parseInt(Date.parse(this.state.crowdsale.endTime)/1000, 10), 
      parseInt(this.state.token.supply, 10),
      this.state.crowdsale.walletAddress
    ]
  }

  getFinalizeAgentParams = (web3) => {
    return [
      this.state.contracts.crowdsale.addr
    ]
  }

  deployTokenTransferProxy = () => {
    console.log("***Deploy tokenTransferProxy contract***");
    getNetworkVersion(this.state.web3, (_networkID) => {
      if (this.state.web3.eth.accounts.length === 0) {
        return noMetaMaskAlert();
      }
      var contracts = this.state.contracts;
      var binTokenTransferProxy = contracts && contracts.tokenTransferProxy && contracts.tokenTransferProxy.bin || ''
      var abiTokenTransferProxy = contracts && contracts.tokenTransferProxy && contracts.tokenTransferProxy.abi || []
      var tokenTransferProxy = this.state.tokenTransferProxy;
      deployContract(this.state.web3, abiTokenTransferProxy, binTokenTransferProxy, [], this.state, this.handleDeployedTokenTransferProxy)
     });
  }

  deployMultisig = () => {
    console.log("***Deploy multisig contract***");
    getNetworkVersion(this.state.web3, (_networkID) => {
      if (this.state.web3.eth.accounts.length === 0) {
        return noMetaMaskAlert();
      }
      var contracts = this.state.contracts;
      var binMultisig = contracts && contracts.multisig && contracts.multisig.bin || ''
      var abiMultisig = contracts && contracts.multisig && contracts.multisig.abi || []
      var multisig = this.state.multisig;
      var paramsMultisig = this.getMultisigParams(this.state.web3)
      console.log(paramsMultisig);
      deployContract(this.state.web3, abiMultisig, binMultisig, paramsMultisig, this.state, this.handleDeployedMultisig)
     });
  }

  deployToken = () => {
    console.log("***Deploy token contract***");
    getNetworkVersion(this.state.web3, (_networkID) => {
      if (this.state.web3.eth.accounts.length === 0) {
        return noMetaMaskAlert();
      }
      var contracts = this.state.contracts;
      var binToken = contracts && contracts.token && contracts.token.bin || ''
      var abiToken = contracts && contracts.token && contracts.token.abi || []
      var token = this.state.token;
      var paramsToken = this.getTokenParams(this.state.web3, token)
      console.log(paramsToken);
      deployContract(this.state.web3, abiToken, binToken, paramsToken, this.state, this.handleDeployedToken)
     });
  }

  deployPricingStrategy = () => {
    console.log("***Deploy pricing strategy contract***");
    getNetworkVersion(this.state.web3, (_networkID) => {
      if (this.state.web3.eth.accounts.length === 0) {
        return noMetaMaskAlert();
      }
      var contracts = this.state.contracts;
      var binPricingStrategy = contracts && contracts.pricingStrategy && contracts.pricingStrategy.bin || ''
      var abiPricingStrategy = contracts && contracts.pricingStrategy && contracts.pricingStrategy.abi || []
      var pricingStrategy = this.state.pricingStrategy;
      var paramsPricingStrategy = this.getPricingStrategyParams(this.state.web3, pricingStrategy)
      console.log(paramsPricingStrategy);
      deployContract(this.state.web3, abiPricingStrategy, binPricingStrategy, paramsPricingStrategy, this.state, this.handleDeployedPricingStrategy)
     });
  }

  deployCrowdsale = () => {
    console.log("***Deploy crowdsale contract***");
    getWeb3((web3) => {
      getNetworkVersion(web3, (_networkID) => {
        if (web3.eth.accounts.length === 0) {
          return noMetaMaskAlert();
        }
        let newState = { ...this.state }
        newState.contracts.crowdsale.networkID = _networkID;
        newState.loading = true;
        this.setState(newState);
        let contracts = this.state.contracts;
        let binCrowdsale = contracts && contracts.crowdsale && contracts.crowdsale.bin || ''
        let abiCrowdsale = contracts && contracts.crowdsale && contracts.crowdsale.abi || []
        let paramsCrowdsale;
        switch (this.state.contractType) {
          case this.state.contractTypes.standard: {
            paramsCrowdsale = this.getStandardCrowdSaleParams(web3)
          } break;
          case this.state.contractTypes.whitelistwithcap: {
            paramsCrowdsale = this.getCrowdSaleParams(web3)
          } break;
          default:
            break;
        }
        console.log(paramsCrowdsale);
        deployContract(web3, abiCrowdsale, binCrowdsale, paramsCrowdsale, this.state, this.handleDeployedContract)
       });
    });
  }

  deployFinalizeAgent = () => {
    console.log("***Deploy finalize agent contract***");
    getNetworkVersion(this.state.web3, (_networkID) => {
      if (this.state.web3.eth.accounts.length === 0) {
        return noMetaMaskAlert();
      }
      var contracts = this.state.contracts;
      var binFinalizeAgent = contracts && contracts.finalizeAgent && contracts.finalizeAgent.bin || ''
      var abiFinalizeAgent = contracts && contracts.finalizeAgent && contracts.finalizeAgent.abi || []
      var finalizeAgent = this.state.finalizeAgent;
      var paramsFinalizeAgent = this.getFinalizeAgentParams(this.state.web3)
      console.log(paramsFinalizeAgent);
      deployContract(this.state.web3, abiFinalizeAgent, binFinalizeAgent, paramsFinalizeAgent, this.state, this.handleDeployedFinalizeAgent)
     });
  }

  render() {
    return (
      <section className="steps steps_publish">
        <StepNavigation activeStep={PUBLISH} />
        <div className="steps-content container">
          <div className="about-step">
            <div className="step-icons step-icons_publish"></div>
            <p className="title">Publish</p>
            <p className="description">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
              in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>
          <div className="hidden">
            <div className="item">
              <div className="publish-title-container">
                <p className="publish-title" data-step="1">Crowdsale Contract</p>
              </div>
              <p className="label">Standard</p>
              <p className="description">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
                nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
            <div className="publish-title-container">
              <p className="publish-title" data-step="2">Token Setup</p>
            </div>
            <div className="hidden">
              <DisplayField side='left' title={'Name'} value={this.state.token.name?this.state.token.name:"Token Name"}/>
              <DisplayField side='right' title={'Ticker'} value={this.state.token.ticker?this.state.token.ticker:"Ticker"}/>
              <DisplayField side='left' title={'SUPPLY'} value={this.state.token.supply?this.state.token.supply:100}/>
              <DisplayField side='right' title={'DECIMALS'} value={this.state.token.decimals?this.state.token.decimals:485}/>
            </div>
            <div className="publish-title-container">
              <p className="publish-title" data-step="3">Crowdsale Setup</p>
            </div>
            <div className="hidden">
              <DisplayField side='left' title={'Start time'} value={this.state.crowdsale.startTime?this.state.crowdsale.startTime.split("T").join(" "):""}/>
              <DisplayField side='right' title={'End time'} value={this.state.crowdsale.endTime?this.state.crowdsale.endTime.split("T").join(" "):""}/>
              <DisplayField side='left' title={'Wallet address'} value={this.state.crowdsale.walletAddress?this.state.crowdsale.walletAddress:"0xc1253365dADE090649147Db89EE781d10f2b972f"}/>
              <DisplayField side='right' title={'RATE'} value={this.state.pricingStrategy.rate?this.state.pricingStrategy.rate:1 + " ETH"}/>
            </div>
            <div className="publish-title-container">
              <p className="publish-title" data-step="4">Crowdsale Setup</p>
            </div>
            <div className="item">
              <p className="label">Compiler Version</p>
              <p className="value">0.4.11</p>
              <p className="description">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            <div className="item">
              <p className="label">Contract Source Code</p>
              <pre>
                {this.state.contracts?this.state.contracts.crowdsale?this.state.contracts.crowdsale.src:"":""}
              </pre>
              <p className="description">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            <div className="item">
              <p className="label">Contract ABI</p>
              <pre>
                {this.state.contracts?this.state.contracts.crowdsale?JSON.stringify(this.state.contracts.crowdsale.abi):"":""}
              </pre>
              <p className="description">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            <div className="item">
              <p className="label">Constructor Arguments (ABI-encoded and appended to the ByteCode above)</p>
              <pre>
                {this.state.contracts?this.state.contracts.crowdsale?this.state.contracts.crowdsale.abiConstructor:"":""}
              </pre>
              <p className="description">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          </div>
        </div>
        <div className="button-container">
          {/*<Link to='/5' onClick={this.deployCrowdsale}><a href="#" className="button button_fill">Continue</a></Link>*/}
          <a onClick={this.deployCrowdsale} className="button button_fill">Continue</a>
        </div>
        <Loader show={this.state.loading}></Loader>
      </section>
    )}
}