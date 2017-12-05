import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import Picker from '../components/Picker';
import Posts from '../components/Posts';

class App extends Component {
  static propTypes = {
    selectedSubreddit: PropTypes.string.isRequired,
    posts: PropTypes.array.isRequired,
    isFetching: PropTypes.bool.isRequired,
    lastUpdated: PropTypes.number,
    change: PropTypes.func.isRequired,
  };

  handleRefreshClick = e => {
    e.preventDefault();

    const { selectedSubreddit } = this.props;
    this.props.refetch({ subreddit: selectedSubreddit });
  };

  render() {
    const {
      selectedSubreddit,
      posts,
      isFetching,
      lastUpdated,
      change,
    } = this.props;
    const isEmpty = posts.length === 0;
    return (
      <div>
        <Picker
          value={selectedSubreddit}
          onChange={change}
          options={['reactjs', 'frontend']}
        />
        <p>
          {lastUpdated && (
            <span>
              Last updated at {new Date(lastUpdated).toLocaleTimeString()}.{' '}
            </span>
          )}
          {!isFetching && (
            <button onClick={this.handleRefreshClick}>Refresh</button>
          )}
        </p>
        {isEmpty ? (
          isFetching ? (
            <h2>Loading...</h2>
          ) : (
            <h2>Empty.</h2>
          )
        ) : (
          <div style={{ opacity: isFetching ? 0.5 : 1 }}>
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
  options: ({ subreddit }) => ({
    variables: { subreddit },
    notifyOnNetworkStatusChange: true,
  }),
  props: ({ data, ownProps }) => ({
    refetch: data.refetch,
    change: ownProps.change,
    selectedSubreddit: ownProps.subreddit,
    posts: data.postsBySubreddit ? data.postsBySubreddit.items : [],
    isFetching: data.loading,
    lastUpdated: data.postsBySubreddit
      ? data.postsBySubreddit.lastUpdated
      : null,
  }),
});

const AppWithData = withSubreddits(App);

// this will be much easier with react-apollo 2.0
export default class VariableChange extends Component {
  state = {
    subreddit: 'reactjs',
  };

  render() {
    return (
      <AppWithData
        subreddit={this.state.subreddit}
        change={subreddit => this.setState({ subreddit })}
      />
    );
  }
}
