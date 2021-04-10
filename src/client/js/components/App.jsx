import React, { Component } from 'react';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

import Home from './pages/Home';
import Footer from './partials/Footer';
import classnames from 'classnames';

require('../../css/index.scss');

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = { fullscreen: false };
  }

  componentDidMount() {
    this.handleFullScreenOn = this.handleFullScreenOn.bind(this);
    this.handleFullScreenOff = this.handleFullScreenOff.bind(this);
    window.document.addEventListener('fullScreenOn', this.handleFullScreenOn);
    window.document.addEventListener('fullScreenOff', this.handleFullScreenOff);
  }

  componentDidUnmount() {
    window.document.removeEventListener('fullScreenOn', this.handleFullScreenOn);
    window.document.removeEventListener('fullScreenOff', this.handleFullScreenOff);
  }

  handleFullScreenOn() {
    this.setState({
      fullscreen: true
    });
  }

  handleFullScreenOff() {
    this.setState({
      fullscreen: false
    });
  }

  render() {
    return (
      <Router>
        <div className={classnames({ fullscreen: this.state.fullscreen })}>
          <div className="alpha-banner notification is-warning is-light">
            <div className="container">
              <b>Welcome to the Polkaswitch Alpha launch!</b><br/>
              As we work closely with our technology partners for the Mainnet launch, you will experience intermittent issues until then.
            </div>
          </div>

          <Switch>
            <Route path="/">
              <Home />
            </Route>
          </Switch>
          <Footer />
        </div>
      </Router>
    );
  }
}

