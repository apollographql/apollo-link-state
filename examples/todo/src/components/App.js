import React from 'react';
import Footer from './Footer';
import TodoForm from './TodoForm';
import TodoList from './TodoList';

const App = () => (
  <div>
    <TodoForm />
    <TodoList />
    <Footer />
  </div>
);
export default App;
