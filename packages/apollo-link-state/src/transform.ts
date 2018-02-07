import {
  checkDocument,
  cloneDeep,
  getOperationDefinitionOrDie,
  getFragmentDefinitions,
  createFragmentMap,
} from 'apollo-utilities';
import {
  FieldNode,
  OperationDefinitionNode,
  FragmentDefinitionNode,
} from 'graphql';

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
  if (selection.kind !== 'Field' || !(selection as FieldNode)) {
    return true;
  }

  if (!selection.directives) {
    return false;
  }
  const matchedDirectives = selection.directives.filter(directive => {
    return directives.some(dir => {
      if (dir.name && dir.name === directive.name.value) return true;
      if (dir.test && dir.test(directive)) return true;
      return false;
    });
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

  const operation = getOperationDefinitionOrDie(docClone);
  const fragments = createFragmentMap(getFragmentDefinitions(docClone));

  const isNotEmpty = (
    op: OperationDefinitionNode | FragmentDefinitionNode,
  ): Boolean =>
    // keep selections that are still valid
    op.selectionSet.selections.filter(
      selectionSet =>
        // anything that doesn't match the compound filter is okay
        !// not an empty array
        (
          selectionSet &&
          // look into fragments to verify they should stay
          selectionSet.kind === 'FragmentSpread' &&
          // see if the fragment in the map is valid (recursively)
          !isNotEmpty(fragments[selectionSet.name.value])
        ),
    ).length > 0;

  return isNotEmpty(operation) ? docClone : null;
}
