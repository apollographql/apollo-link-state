import gql from 'graphql-tag';

export const defaults = {
  todos: [],
  visibilityFilter: 'SHOW_ALL',
};

let nextTodoId = 0;

export const resolvers = {
  Mutation: {
    addTodo: (_, { text }, { cache }) => {
      const query = gql`
        query Todos {
          todos @client {
            id
            text
            completed
          }
        }
      `;
      const previous = cache.readQuery({ query });
      const newTodo = {
        id: nextTodoId++,
        text,
        completed: false,
        __typename: 'Todo',
      };
      const data = {
        todos: previous.todos.concat([newTodo]),
      };
      cache.writeData({ data });
      return newTodo;
    },
    toggleTodo: (_, variables, { cache }) => {
      const id = `Todo:${variables.id}`;
      const fragment = gql`
        fragment completeTodo on Todo {
          completed
        }
      `;
      const todo = cache.readFragment({ fragment, id });
      const data = { ...todo, completed: !todo.completed };
      cache.writeData({ id, data });
      return true;
    },
  },
};
