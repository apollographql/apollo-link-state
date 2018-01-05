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

import {
  ApolloCacheClient,
  ApolloCacheClient_Writeable,
  WriteDataArgs,
} from './';

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

export function fragmentFromPojo(obj: any, typename?: string): DocumentNode {
  const frag: FragmentDefinitionNode = {
    kind: 'FragmentDefinition',
    typeCondition: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: typename || '__FakeType',
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
  (cache as ApolloCacheClient_Writeable).writeData = ({
    id,
    data,
  }: WriteDataArgs) => {
    if (id) {
      let typenameResult = null;
      // Since we can't use fragments without having a typename in the store,
      // we need to make sure we have one.
      // To avoid overwriting an existing typename, we need to read it out first
      // and generate a fake one if none exists.
      try {
        typenameResult = cache.read({
          rootId: id,
          optimistic: false,
          query: justTypenameQuery,
        });
      } catch (e) {
        // Do nothing, since an error just means no typename exists
      }

      // tslint:disable-next-line
      const __typename =
        (typenameResult && typenameResult.__typename) || '__ClientData';

      // Add a type here to satisfy the inmemory cache
      const dataToWrite = { __typename, ...data };

      cache.writeFragment({
        id,
        fragment: fragmentFromPojo(dataToWrite, __typename),
        data: dataToWrite,
      });
    } else {
      cache.writeQuery({
        query: queryFromPojo(data),
        data,
      });
    }
  };
}

const justTypenameQuery: DocumentNode = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: null,
      variableDefinitions: null,
      directives: [],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            alias: null,
            name: {
              kind: 'Name',
              value: '__typename',
            },
            arguments: [],
            directives: [],
            selectionSet: null,
          },
        ],
      },
    },
  ],
};
