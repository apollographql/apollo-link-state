import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import Picker from '../components/Picker';
import Posts from '../components/Posts';

class App extends Component {
  static propTypes = {
    subreddit: PropTypes.string.isRequired,
    posts: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    lastUpdated: PropTypes.number,
    onChange: PropTypes.func.isRequired,
  };

  handleRefreshClick = e => {
    e.preventDefault();
    this.props.refetch({ subreddit: this.props.subreddit });
  };

  render() {
    const { subreddit, posts, loading, lastUpdated, onChange } = this.props;
    const isEmpty = posts.length === 0;
    return (
      <div>
        <Picker
          value={subreddit}
          onChange={onChange}
          options={['reactjs', 'frontend']}
        />
        <p>
          {lastUpdated && (
            <span>
              Last updated at {new Date(lastUpdated).toLocaleTimeString()}.{' '}
            </span>
          )}
          {!loading && (
            <button onClick={this.handleRefreshClick}>Refresh</button>
          )}
        </p>
        {isEmpty ? (
          loading ? (
            <h2>Loading...</h2>
          ) : (
            <h2>Empty.</h2>
          )
        ) : (
          <div style={{ opacity: loading ? 0.5 : 1 }}>
            <Posts posts={posts} />
          </div>
        )}
      </div>
    );
  }
}

const SELECT_SUBREDDIT = gql`
  query RequestPosts($subreddit: String) {
    postsBySubreddit(subreddit: $subreddit) @client {
      id
      lastUpdated
      items {
        title
      }
    }
  }
`;

const withSubreddits = graphql(SELECT_SUBREDDIT, {
  options: { notifyOnNetworkStatusChange: true },
  props: ({ data, ownProps }) => ({
    ...ownProps,
    ...data,
    posts: data.postsBySubreddit ? data.postsBySubreddit.items : [],
    lastUpdated: data.postsBySubreddit
      ? data.postsBySubreddit.lastUpdated
      : null,
  }),
});

const AppWithData = withSubreddits(App);

// this will be much easier with react-apollo 2.0
export default class VariableChange extends Component {
  state = { subreddit: 'reactjs' };

  render() {
    return (
      <AppWithData
        subreddit={this.state.subreddit}
        onChange={subreddit => this.setState({ subreddit })}
      />
    );
  }
}
