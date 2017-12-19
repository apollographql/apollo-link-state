import gql from 'graphql-tag';
import { graphql } from 'react-apollo';
import TodoList from '../components/TodoList';

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

const TODOS_QUERY = gql`
  query GetTodosForApp {
    todos @client {
      id
      completed
      text
    }
    visibilityFilter @client
  }
`;

const withTodos = graphql(TODOS_QUERY, {
  props: ({ data }) => {
    if (data.loading || data.error) return { todos: [] };
    return {
      todos: getVisibleTodos(data.todos, data.visibilityFilter),
    };
  },
});

const TODO_MUTATON = gql`
  mutation ToggleTodo($id: Int!) {
    toggleTodo(id: $id) @client
  }
`;

const toggleTodo = graphql(TODO_MUTATON, {
  props: ({ mutate }) => ({
    onTodoClick: id => mutate({ variables: { id } }),
  }),
});

const VisibleTodoList = toggleTodo(withTodos(TodoList));

export default VisibleTodoList;
