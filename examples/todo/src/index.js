import React from 'react';
import { render } from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { withClientState } from 'apollo-link-state';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from 'react-apollo';
import merge from 'lodash.merge';

import App from './components/App';
import todos from './resolvers/todos';
import visibilityFilter from './resolvers/visibilityFilter';

const cache = new InMemoryCache();

const typeDefs = `
  type Todo {
    id: Int!
    text: String!
    completed: Boolean!
  }

  type Mutation {
    addTodo(text: String!): Todo
    toggleTodo(id: Int!): Todo
    visibilityFilter(filter: String!): String
  }

  type Query {
    visibilityFilter: String
    todos: [Todo]
  }
`;

const client = new ApolloClient({
  cache,
  link: withClientState({ ...merge(todos, visibilityFilter), cache, typeDefs }),
});

render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root'),
);
