// importing print is a reasonable thing to do, since Apollo Link Http requires
// it to be present
import { DocumentNode, DirectiveNode, print } from 'graphql';

import { checkDocument, removeDirectivesFromDocument } from 'apollo-utilities';

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

export function normalizeTypeDefs(
  typeDefs: string | string[] | DocumentNode | DocumentNode[],
) {
  const defs = Array.isArray(typeDefs) ? typeDefs : [typeDefs];

  return defs
    .map(typeDef => (typeof typeDef === 'string' ? typeDef : print(typeDef)))
    .map(str => str.trim())
    .join('\n');
}
