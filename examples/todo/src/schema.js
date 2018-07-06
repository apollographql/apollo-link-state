import gql from 'graphql-tag';

const typeDefs = gql`
  type Todo {
    id: Int!
    text: String!
    completed: Boolean!
  }

  type Mutation {
    addTodo(text: String!): Todo
    toggleTodo(id: Int!): Boolean
  }

  type Query {
    visibilityFilter: String
    todos: [Todo]
  }
`;

export default typeDefs;
