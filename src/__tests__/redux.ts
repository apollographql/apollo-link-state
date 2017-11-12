import gql from 'graphql-tag';
import { ApolloLink, execute, Observable } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { createStore } from 'redux';

import { withClientState } from '../';

function createReduxAdapter(store) {
  // need to subscribe to changes, somehow. maybe a new link?
  const queryAdapter = Object.keys(store.getState()).reduce(
    (memo, key) => ({
      ...memo,
      [key]: () => store.getState()[key],
    }),
    {},
  );

  //
  // const mutationAdapter
  // Mutations are a little more complex because we don't have a central registration of all possible actions.
  // Ideally you can register your actions and call them as `mutation`.
  // If the adapter is simple, it could be pretty trivial to have import their action files so we can read the keys
  // Optionally, we could have a wildcard mutation that dispatches against the store with the provided arguments.

  return {
    Query: queryAdapter,
    // Mutation: () => {},
    // store.dispatch
  };
}

describe('redux', () => {
  const reduxData = {
    result: {
      __typename: 'fooTypename',
      title: 'Some Title',
      author: {
        __typename: 'fooAuthorName',
        name: 'Jon Wong',
      },
    },
  };

  it('reads from the redux store', () => {
    const query = gql`
      {
        result @client {
          title
          author {
            name
          }
        }
      }
    `;
    const store = createStore((state = {}, action) => reduxData);
    const local = withClientState(createReduxAdapter(store));

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local,
    });

    return client.query({ query }).then(({ data }) => {
      expect(data).toMatchSnapshot();
    });
  });
  it('dispatches to the redux store');
  it('subscribes to changes from actions');
});
