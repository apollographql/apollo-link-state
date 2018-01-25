import React from 'react';
import { render } from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { withClientState } from 'apollo-link-state';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from 'react-apollo';
import { HttpLink } from 'apollo-link-http';
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

<<<<<<< HEAD
  type Query {
    visibilityFilter: String
    todos: [Todo]
  }
  
=======
  schema {
    mutation: Mutation
  }
>>>>>>> Add mutation
`;

const client = new ApolloClient({
  cache,
  link: withClientState({
    ...merge(todos, visibilityFilter),
    cache,
    typeDefs,
  }).concat(
    new HttpLink({
      uri: `https://v7mnw3m03.lp.gql.zone/graphql`,
    }),
  ),
});

render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root'),
);
