import { DocumentNode, DirectiveNode } from 'graphql';

import { checkDocument, removeDirectivesFromDocument } from 'apollo-utilities';

import { getDirectivesFromDocument } from './transform';

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

const clientQuery = new Map();
export function getClientSetsFromDocument(query: DocumentNode): DocumentNode {
  // caching
  const cached = clientQuery.get(query);
  if (cached) return cached;

  const docClone = getDirectivesFromDocument([{ name: 'client' }], query);

  // caching
  clientQuery.set(query, docClone);
  return docClone;
}
