import { checkDocument, cloneDeep } from 'apollo-utilities';

function hasDirectivesInSelectionSet(directives, selectionSet) {
  if (!selectionSet.selections) {
    return false;
  }
  const matchedSelections = selectionSet.selections.filter(selection => {
    return hasDirectivesInAnyNestedSelection(directives, selection);
  });
  return matchedSelections.length > 0;
}

function hasDirectivesInSelection(directives, selection) {
  if (!selection.directives) {
    return false;
  }
  const matchedDirectives = directives.filter(directive => {
    return selection.directives.some(d => d.name.value === directive.name);
  });
  return matchedDirectives.length > 0;
}

function hasDirectivesInAnyNestedSelection(directives, selection) {
  return (
    hasDirectivesInSelection(directives, selection) ||
    (selection.selectionSet &&
      hasDirectivesInSelectionSet(directives, selection.selectionSet))
  );
}

function getDirectivesFromSelectionSet(directives, selectionSet) {
  selectionSet.selections = selectionSet.selections
    .filter(selection => {
      return hasDirectivesInAnyNestedSelection(directives, selection);
    })
    .map(selection => {
      if (hasDirectivesInSelection(directives, selection)) {
        return selection;
      }
      if (selection.selectionSet) {
        selection.selectionSet = getDirectivesFromSelectionSet(
          directives,
          selection.selectionSet,
        );
      }
      return selection;
    });
  return selectionSet;
}

export function getDirectivesFromDocument(directives, doc) {
  checkDocument(doc);
  const docClone = cloneDeep(doc);
  docClone.definitions = docClone.definitions.map(definition => {
    if (definition.selectionSet) {
      definition.selectionSet = getDirectivesFromSelectionSet(
        directives,
        definition.selectionSet,
      );
    }
    return definition;
  });
  return docClone;
}
