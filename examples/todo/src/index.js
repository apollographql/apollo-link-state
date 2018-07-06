import React from 'react';
import { render } from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { withClientState } from 'apollo-link-state';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from 'react-apollo';

import App from './components/App';
import { resolvers, defaults } from './resolvers';
import typeDefs from './schema';

const cache = new InMemoryCache();

const client = new ApolloClient({
  cache,
  link: withClientState({ resolvers, defaults, cache, typeDefs }),
});

render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root'),
);
