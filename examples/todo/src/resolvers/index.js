import merge from 'lodash.merge';
import todos from './todos';
import visibilityFilter from './visbilityFilter';

export default merge(todos, visibilityFilter);
