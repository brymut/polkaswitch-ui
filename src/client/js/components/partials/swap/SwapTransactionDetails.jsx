import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';
import Wallet from '../../../utils/wallet';
import numeral from 'numeral';
import * as ethers from 'ethers';
import EventManager from '../../../utils/events';

const Utils = ethers.utils;

export default class SwapTransactionDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      minReturn: "--",
      priceImpact: "--",
      transactionEstimate: "--"
    };

    this.handleSettingsChange = this.handleSettingsChange.bind(this);
  }

  componentDidMount() {
    this.subNetworkChange = EventManager.listenFor(
      'swapSettingsUpdated', this.handleSettingsChange
    );
    this.updateValues();
  }

  componentDidUnmount() {
    this.subNetworkChange.unsubscribe();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.fromAmount != this.props.fromAmount) {
      this.updateValues();
    }
  }

  handleSettingsChange() {
    this.updateValues();
  }

  updateValues() {
    SwapFn.calculateMinReturn(
      this.props.from,
      this.props.to,
      Utils.parseUnits(this.props.fromAmount, this.props.from.decimals)
    ).then(function(r) {
      _.defer(function(){
        this.setState({ minReturn: r });
      }.bind(this));
    }.bind(this)).catch(function(r) {
      _.defer(function(){
        this.setState({ minReturn: "--" });
      }.bind(this));
    }.bind(this));

    SwapFn.calculatePriceImpact(
      this.props.from,
      this.props.to,
      Utils.parseUnits(this.props.fromAmount, this.props.from.decimals)
    ).then(function(priceImpact) {
      _.defer(function(){
        this.setState({ priceImpact: (priceImpact * 100.0).toFixed(5) });
      }.bind(this));
    }.bind(this)).catch(function(r) {
      _.defer(function(){
        this.setState({ priceImpact: "--" });
      }.bind(this));
    }.bind(this));

    var distBN = _.map(this.props.swapDistribution, function(e) {
      return window.ethers.utils.parseUnits("" + e, "wei");
    });

    SwapFn.calculateEstimatedTransactionCost(
      this.props.from,
      this.props.to,
      Utils.parseUnits(this.props.fromAmount, this.props.from.decimals),
      distBN,
    ).then(function(v) {
      _.defer(function(){
        this.setState({ transactionEstimate: v });
      }.bind(this));
    }.bind(this)).catch(function(r) {
      _.defer(function(){
        this.setState({ transactionEstimate: "--" });
      }.bind(this));
    }.bind(this));
  }

  render() {
    return (
      <div className="swap-trans-details">
        <div
          className="level is-mobile is-narrow detail hint--bottom hint--medium"
          aria-label="The calculated exchange rate for this transaction"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Rate</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">
                1 {this.props.from.symbol} ~= {numeral(this.props.toAmount / this.props.fromAmount).format("0.0[0000000000000]")} {this.props.to.symbol}
              </div>
            </div>
          </div>
        </div>
        <div
          className="level is-mobile is-narrow detail hint--bottom hint--medium"
          aria-label="Calculated based on the Slippage Tolerance. If the return amount below below this minimum threshold, the transaction is reverted"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Minimum Return</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">
                {this.state.minReturn} {this.props.to.symbol}
              </div>
            </div>
          </div>
        </div>
        <div
          className="level is-mobile is-narrow detail hint--bottom hint--medium"
          aria-label="Expected slippage in price on swap. The difference between the current market price and the price you will actually pay when performing this swap"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Price Impact</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">
                + {this.state.priceImpact}%
              </div>
            </div>
          </div>
        </div>
        <div
          className="level is-mobile is-narrow detail hint--bottom hint--medium"
          aria-label="Total transaction cost for this swap which includes Gas fees and Liquidity Provider Fees"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Transaction Cost</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">
                {this.state.transactionEstimate} {window.NATIVE_TOKEN.symbol}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

