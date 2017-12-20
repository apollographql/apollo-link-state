import React from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

const GET_CURRENT_POSITION = gql`
  query getCurrentPosition($timeout: Int) {
    currentPosition(timeout: $timeout) @client {
      coords {
        latitude
        longitude
      }
    }
  }
`;

const Coordinates = ({ showCoords, loading, refetch, currentPosition }) => (
  <div>
    {!currentPosition ? (
      loading ? (
        <h2>Loading...</h2>
      ) : (
        <h2>
          Error: Unable to fetch your current position. Are you using a browser
          that supports the Geolocation API?
        </h2>
      )
    ) : (
      <div style={{ opacity: loading ? 0.5 : 1 }}>
        <h2>{`Latitude: ${currentPosition.coords.latitude}`}</h2>
        <h2>{`Longitude: ${currentPosition.coords.longitude}`}</h2>
        <button onClick={() => refetch()}>Refresh!</button>
      </div>
    )}
  </div>
);

export default graphql(GET_CURRENT_POSITION, {
  options: { notifyOnNetworkStatusChange: true },
  props: ({ ownProps, data: { loading, refetch, currentPosition } }) => ({
    ...ownProps,
    loading,
    refetch,
    currentPosition,
  }),
})(Coordinates);
