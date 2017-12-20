import gql from 'graphql-tag';

let nextTodoId = 0;
export default {
  Query: {
    todos: () => [],
  },
  Mutation: {
    addTodo: (_, { text }, { cache }) => {
      const query = gql`
        query GetTodos {
          todos @client {
            id
            text
            completed
          }
        }
      `;
      const previous = cache.readQuery({ query });
      const data = {
        todos: previous.todos.concat([
          { id: nextTodoId++, text, completed: false, __typename: 'TodoItem' },
        ]),
      };
      cache.writeData({ data });
      return data;
    },
    toggleTodo: (_, variables, { cache }) => {
      const id = `TodoItem:${variables.id}`;
      const fragment = gql`
        fragment completeTodo on TodoItem {
          completed
        }
      `;
      const todo = cache.readFragment({ fragment, id });
      const data = { ...todo, completed: !todo.completed };
      cache.writeData({ id, data });
      return data;
    },
  },
};
