import React, { Component } from 'react';
import Coordinates from '../containers/Coordinates';

export default class App extends Component {
  state = {
    showCoords: false,
  };

  getCoords = e => {
    e.preventDefault();
    this.setState(state => ({ showCoords: true }));
  };

  render() {
    const { showCoords } = this.state;

    return (
      <div>
        <h1>Where am I currently located?</h1>
        {!showCoords && <button onClick={this.getCoords}>Find out!</button>}
        {showCoords && <Coordinates showCoords={showCoords} timeout={15000} />}
      </div>
    );
  }
}
