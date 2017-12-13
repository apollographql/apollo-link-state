import {
  DocumentNode,
  DirectiveNode,
  OperationDefinitionNode,
  SelectionSetNode,
  FieldNode,
  FragmentDefinitionNode,
} from 'graphql';

import {
  // getDirectives,
  checkDocument,
  removeDirectivesFromDocument,
} from 'apollo-utilities';

import { ApolloCacheClient, WriteDataArgs } from './';

const connectionRemoveConfig = {
  test: (directive: DirectiveNode) => directive.name.value === 'client',
  remove: true,
};

const removed = new Map();
export function removeClientSetsFromDocument(
  query: DocumentNode,
): DocumentNode {
  // caching
  const cached = removed.get(query);
  if (cached) return cached;

  checkDocument(query);

  const docClone = removeDirectivesFromDocument(
    [connectionRemoveConfig],
    query,
  );

  // caching
  removed.set(query, docClone);
  return docClone;
}

export function queryFromPojo(obj: any): DocumentNode {
  const op: OperationDefinitionNode = {
    kind: 'OperationDefinition',
    operation: 'query',
    name: {
      kind: 'Name',
      value: 'GeneratedClientQuery',
    },
    selectionSet: selectionSetFromObj(obj),
  };

  const out: DocumentNode = {
    kind: 'Document',
    definitions: [op],
  };

  return out;
}

export function fragmentFromPojo(obj: any): DocumentNode {
  const frag: FragmentDefinitionNode = {
    kind: 'FragmentDefinition',
    typeCondition: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: '__FakeType',
      },
    },
    name: {
      kind: 'Name',
      value: 'GeneratedClientQuery',
    },
    selectionSet: selectionSetFromObj(obj),
  };

  const out: DocumentNode = {
    kind: 'Document',
    definitions: [frag],
  };

  return out;
}

function selectionSetFromObj(obj) {
  if (
    typeof obj === 'number' ||
    typeof obj === 'boolean' ||
    typeof obj === 'string' ||
    typeof obj === 'undefined' ||
    obj === null
  ) {
    // No selection set here
    return null;
  }

  if (Array.isArray(obj)) {
    // GraphQL queries don't include arrays
    return selectionSetFromObj(obj[0]);
  }

  // Now we know it's an object
  const selections: FieldNode[] = [];

  Object.keys(obj).forEach(key => {
    const field: FieldNode = {
      kind: 'Field',
      name: {
        kind: 'Name',
        value: key,
      },
    };

    // Recurse
    const nestedSelSet: SelectionSetNode = selectionSetFromObj(obj[key]);

    if (nestedSelSet) {
      field.selectionSet = nestedSelSet;
    }

    selections.push(field);
  });

  const selectionSet: SelectionSetNode = {
    kind: 'SelectionSet',
    selections,
  };

  return selectionSet;
}

export function addWriteDataToCache(cache: ApolloCacheClient) {
  cache.writeData = ({ id, data }: WriteDataArgs) => {
    if (id) {
      cache.writeFragment({
        fragment: fragmentFromPojo(data),

        // Add a type here to satisfy the inmemory cache
        data: { ...data, __typename: '__FakeType' },
        id,
      });
    } else {
      cache.writeQuery({
        query: queryFromPojo(data),
        data,
      });
    }
  };
}
