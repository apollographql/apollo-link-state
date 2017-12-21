import React from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

const ADD_TODO = gql`
  mutation addTodo($text: String!) {
    addTodo(text: $text) @client {
      id
    }
  }
`;

const AddTodo = ({ mutate }) => {
  let input;

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!input.value.trim()) {
            return;
          }
          mutate({ variables: { text: input.value } });
          input.value = '';
        }}
      >
        <input
          ref={node => {
            input = node;
          }}
        />
        <button type="submit">Add Todo</button>
      </form>
    </div>
  );
};

export default graphql(ADD_TODO)(AddTodo);
