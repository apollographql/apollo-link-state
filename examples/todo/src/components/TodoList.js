import React from 'react';
import { Query } from 'react-apollo';
import gql from 'graphql-tag';

import Todo from './Todo';

const GET_TODOS = gql`
  {
    todos @client {
      id
      completed
      text
    }
    visibilityFilter @client
  }
`;

const getVisibleTodos = (todos, filter) => {
  switch (filter) {
    case 'SHOW_ALL':
      return todos;
    case 'SHOW_COMPLETED':
      return todos.filter(t => t.completed);
    case 'SHOW_ACTIVE':
      return todos.filter(t => !t.completed);
    default:
      throw new Error('Unknown filter: ' + filter);
  }
};

const TodoList = () => (
  <Query query={GET_TODOS}>
    {({ data: { todos, visibilityFilter } }) => (
      <ul>
        {getVisibleTodos(todos, visibilityFilter).map(todo => (
          <Todo key={todo.id} {...todo} />
        ))}
      </ul>
    )}
  </Query>
);

export default TodoList;
