import { DocumentNode, DirectiveNode } from 'graphql';
import { Operation } from 'apollo-link';

// XXX move to apollo-utilities and document
import {
  // getDirectives,
  checkDocument,
  removeDirectivesFromDocument,
} from 'apollo-utilities';

const connectionRemoveConfig = {
  test: (directive: DirectiveNode) => directive.name.value === 'client',
  remove: true,
};

const removed = new Map();
export function removeDirectivesFromDocument(
  query: DocumentNode
): DocumentNode {
  // caching
  const cached = removed.get(query);
  if (cached) return cached;

  checkDocument(query);

  const docClone = removeDirectivesFromDocument(
    [connectionRemoveConfig],
    query
  );

  // caching
  removed.set(query, docClone);
  return docClone;
}
